-- Unified lead timeline + editable last_called_at on leads

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_called_at timestamptz;

CREATE TABLE IF NOT EXISTS public.lead_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  summary text NOT NULL DEFAULT '',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  local_date date NOT NULL,
  local_time time NOT NULL DEFAULT '00:00:00',
  logged_timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_timeline_lead_occurred
  ON public.lead_timeline_events (lead_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_timeline_user_local_date
  ON public.lead_timeline_events (user_id, local_date DESC);

CREATE INDEX IF NOT EXISTS idx_lead_timeline_team_local_date
  ON public.lead_timeline_events (team_id, local_date DESC)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_timeline_local_date
  ON public.lead_timeline_events (local_date DESC);

ALTER TABLE public.lead_timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_timeline_select ON public.lead_timeline_events;
CREATE POLICY lead_timeline_select
  ON public.lead_timeline_events FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lead_id IN (
      SELECT l.id FROM public.leads l
      WHERE l.user_id = auth.uid()
         OR l.user_id IN (
           SELECT up.id FROM public.user_profiles up
           WHERE up.team_id = (
             SELECT p.team_id FROM public.user_profiles p WHERE p.id = auth.uid()
           )
           AND up.team_id IS NOT NULL
         )
    )
    OR (
      team_id IS NOT NULL
      AND team_id IN (
        SELECT up.team_id FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.team_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS lead_timeline_insert ON public.lead_timeline_events;
CREATE POLICY lead_timeline_insert
  ON public.lead_timeline_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS lead_timeline_update ON public.lead_timeline_events;
CREATE POLICY lead_timeline_update
  ON public.lead_timeline_events FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS lead_timeline_delete ON public.lead_timeline_events;
CREATE POLICY lead_timeline_delete
  ON public.lead_timeline_events FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Auto-set team_id from actor profile
CREATE OR REPLACE FUNCTION public.set_timeline_event_team_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    SELECT team_id INTO NEW.team_id
    FROM public.user_profiles
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_timeline_event_team_id ON public.lead_timeline_events;
CREATE TRIGGER trg_set_timeline_event_team_id
BEFORE INSERT ON public.lead_timeline_events
FOR EACH ROW EXECUTE FUNCTION public.set_timeline_event_team_id();

-- Day-scoped team timeline for Calendar Activity
CREATE OR REPLACE FUNCTION public.get_team_timeline_for_day(
  p_date date,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_limit integer DEFAULT 500
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
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT up.team_id INTO v_team_id
  FROM public.user_profiles up
  WHERE up.id = v_uid;

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
      OR (v_team_id IS NOT NULL AND e.team_id = v_team_id)
      OR e.lead_id IN (
        SELECT ld.id FROM public.leads ld
        WHERE ld.user_id = v_uid
           OR (v_team_id IS NOT NULL AND ld.user_id IN (
             SELECT m.id FROM public.user_profiles m WHERE m.team_id = v_team_id
           ))
      )
    )
  ORDER BY e.occurred_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 500), 2000));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_timeline_for_day(date, date, date, integer) TO authenticated;

-- Per-lead timeline
CREATE OR REPLACE FUNCTION public.get_lead_timeline(p_lead_id uuid, p_limit integer DEFAULT 200)
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
BEGIN
  IF v_uid IS NULL OR p_lead_id IS NULL THEN
    RETURN;
  END IF;

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
    p.email,
    p.full_name
  FROM public.lead_timeline_events e
  LEFT JOIN public.user_profiles p ON p.id = e.user_id
  WHERE e.lead_id = p_lead_id
  ORDER BY e.occurred_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 1000));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_timeline(uuid, integer) TO authenticated;

-- Best-effort backfill from call attempts (local fields from UTC)
INSERT INTO public.lead_timeline_events (
  lead_id, user_id, team_id, event_type, summary, detail,
  occurred_at, local_date, local_time, logged_timezone
)
SELECT
  a.lead_id,
  a.user_id,
  a.team_id,
  'call_logged',
  'Call: ' || COALESCE(a.outcome, 'Logged'),
  jsonb_build_object('outcome', a.outcome, 'note', a.note, 'source', 'backfill'),
  a.created_at,
  (a.created_at AT TIME ZONE 'UTC')::date,
  (a.created_at AT TIME ZONE 'UTC')::time,
  'UTC'
FROM public.lead_call_attempts a
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_timeline_events e
  WHERE e.lead_id = a.lead_id
    AND e.event_type = 'call_logged'
    AND e.occurred_at = a.created_at
    AND e.user_id = a.user_id
);

-- Backfill last_called_at from latest call attempt
UPDATE public.leads l
SET last_called_at = sub.latest
FROM (
  SELECT lead_id, MAX(created_at) AS latest
  FROM public.lead_call_attempts
  GROUP BY lead_id
) sub
WHERE l.id = sub.lead_id
  AND l.last_called_at IS NULL;
