-- Calendar activity sharing + gated team timeline + planned task RPC

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS calendar_activity_sharing text NOT NULL DEFAULT 'off'
    CHECK (calendar_activity_sharing IN ('off', 'all_members', 'selected_members'));

ALTER TABLE public.team_member_permissions
  ADD COLUMN IF NOT EXISTS can_view_team_calendar_activity boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_view_team_calendar_activity(p_viewer uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_role text;
  v_sharing text;
BEGIN
  IF p_viewer IS NULL THEN RETURN false; END IF;

  SELECT team_id, lower(COALESCE(team_role, 'owner'))
  INTO v_team_id, v_role
  FROM public.user_profiles WHERE id = p_viewer;

  IF v_team_id IS NULL THEN RETURN false; END IF;
  IF v_role = 'owner' THEN RETURN true; END IF;

  SELECT calendar_activity_sharing INTO v_sharing FROM public.teams WHERE id = v_team_id;
  IF v_sharing IS NULL OR v_sharing = 'off' THEN RETURN false; END IF;
  IF v_sharing = 'all_members' THEN RETURN true; END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.team_member_permissions tmp
    WHERE tmp.team_id = v_team_id
      AND tmp.user_id = p_viewer
      AND tmp.can_view_team_calendar_activity = true
  );
END;
$$;

-- Fix call note override: honor per-member rows only in selected_members mode
CREATE OR REPLACE FUNCTION public.can_view_call_note(
  p_attempt public.lead_call_attempts,
  p_viewer uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_team_id uuid;
  v_sharing text;
  v_global_notes boolean;
  v_member_notes boolean;
BEGIN
  IF p_viewer IS NULL THEN RETURN false; END IF;
  IF p_attempt.user_id = p_viewer THEN RETURN true; END IF;

  SELECT team_id, lower(COALESCE(team_role, 'owner'))
  INTO v_team_id, v_role
  FROM public.user_profiles WHERE id = p_viewer;

  IF v_role = 'owner' AND v_team_id = p_attempt.team_id THEN RETURN true; END IF;
  IF p_attempt.note_visibility = 'private' THEN RETURN false; END IF;

  SELECT call_activity_sharing, call_notes_visible_to_team
  INTO v_sharing, v_global_notes
  FROM public.teams WHERE id = p_attempt.team_id;

  IF v_sharing = 'selected_members' THEN
    SELECT can_view_call_notes INTO v_member_notes
    FROM public.team_member_permissions
    WHERE team_id = p_attempt.team_id AND user_id = p_viewer;
    RETURN COALESCE(v_member_notes, false);
  END IF;

  RETURN COALESCE(v_global_notes, false);
END;
$$;

-- Align existing teams with hybrid default (members see own leads only)
UPDATE public.teams SET members_see_own_leads_only = true WHERE members_see_own_leads_only = false;

DROP FUNCTION IF EXISTS public.get_team_timeline_for_day(date, date, date, integer);

CREATE OR REPLACE FUNCTION public.get_team_timeline_for_day(
  p_date date DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_limit integer DEFAULT 500,
  p_member_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  user_id uuid,
  team_id uuid,
  event_type text,
  summary text,
  detail jsonb,
  occurred_at timestamptz,
  local_date date,
  local_time time,
  logged_timezone text,
  lead_first_name text,
  lead_last_name text,
  lead_company text,
  actor_email text,
  actor_full_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team_id uuid;
  v_role text;
  v_can_team boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT up.team_id, lower(COALESCE(up.team_role, 'owner'))
  INTO v_team_id, v_role
  FROM public.user_profiles up
  WHERE up.id = v_uid;

  v_can_team := public.can_view_team_calendar_activity(v_uid);

  RETURN QUERY
  SELECT
    e.id,
    e.lead_id,
    e.user_id,
    e.team_id,
    e.event_type,
    e.summary,
    e.detail,
    e.occurred_at,
    e.local_date,
    e.local_time,
    e.logged_timezone,
    l.first_name,
    l.last_name,
    l.company,
    p.email,
    p.full_name
  FROM public.lead_timeline_events e
  LEFT JOIN public.leads l ON l.id = e.lead_id
  LEFT JOIN public.user_profiles p ON p.id = e.user_id
  WHERE (
      (p_date IS NOT NULL AND e.local_date = p_date)
      OR (p_date IS NULL AND p_from IS NOT NULL AND p_to IS NOT NULL AND e.local_date BETWEEN p_from AND p_to)
    )
    AND (
      e.user_id = v_uid
      OR (
        v_can_team
        AND v_team_id IS NOT NULL
        AND e.team_id = v_team_id
        AND (p_member_id IS NULL OR e.user_id = p_member_id)
      )
    )
  ORDER BY e.occurred_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 500), 2000));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_timeline_for_day(date, date, date, integer, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_team_planned_outreach(
  p_from date,
  p_to date,
  p_member_id uuid DEFAULT NULL
)
RETURNS SETOF public.planned_outreach_tasks
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team_id uuid;
  v_can_team boolean;
BEGIN
  IF v_uid IS NULL OR p_from IS NULL OR p_to IS NULL THEN
    RETURN;
  END IF;

  SELECT team_id INTO v_team_id FROM public.user_profiles WHERE id = v_uid;
  v_can_team := public.can_view_team_calendar_activity(v_uid);

  RETURN QUERY
  SELECT t.*
  FROM public.planned_outreach_tasks t
  WHERE t.planned_date BETWEEN p_from AND p_to
    AND t.status <> 'cancelled'
    AND (
      t.user_id = v_uid
      OR (
        v_can_team
        AND v_team_id IS NOT NULL
        AND t.user_id IN (SELECT m.id FROM public.user_profiles m WHERE m.team_id = v_team_id)
        AND (p_member_id IS NULL OR t.user_id = p_member_id)
      )
    )
  ORDER BY t.planned_date ASC, t.planned_at ASC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_planned_outreach(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_team_calendar_activity(uuid) TO authenticated;
