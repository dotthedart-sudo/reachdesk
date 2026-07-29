-- Teams table permissions + allow trial owners to create workspaces.

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS members_can_view_revenue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS members_see_own_leads_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teams_select_member ON public.teams;
CREATE POLICY teams_select_member
  ON public.teams FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT up.team_id FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.team_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS teams_update_owner ON public.teams;
CREATE POLICY teams_update_owner
  ON public.teams FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.team_id = teams.id
        AND up.team_role = 'owner'
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.team_id = teams.id
        AND up.team_role = 'owner'
    )
  );

DROP POLICY IF EXISTS teams_insert_owner ON public.teams;
CREATE POLICY teams_insert_owner
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Team workspace: Teams + Trial owners can lazy-init a workspace
CREATE OR REPLACE FUNCTION public.ensure_pro_team_workspace()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan text;
  v_role text;
  v_team_id uuid;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT plan, team_role, team_id, email
  INTO v_plan, v_role, v_team_id, v_email
  FROM user_profiles
  WHERE id = v_uid;

  IF v_plan IS NULL THEN
    RETURN NULL;
  END IF;

  IF lower(COALESCE(v_role, '')) = 'member' THEN
    RETURN v_team_id;
  END IF;

  IF v_team_id IS NOT NULL THEN
    IF v_role IS NULL OR lower(v_role) <> 'owner' THEN
      UPDATE user_profiles SET team_role = 'owner' WHERE id = v_uid;
    END IF;
    RETURN v_team_id;
  END IF;

  IF lower(v_plan) NOT IN ('teams', 'trial') THEN
    RETURN NULL;
  END IF;

  INSERT INTO teams (owner_id, name)
  VALUES (v_uid, COALESCE(v_email, 'user') || '''s Team')
  RETURNING id INTO v_team_id;

  UPDATE user_profiles
  SET team_id = v_team_id, team_role = 'owner'
  WHERE id = v_uid;

  RETURN v_team_id;
END;
$$;

DROP POLICY IF EXISTS team_invites_insert_owner ON public.team_invitations;
CREATE POLICY team_invites_insert_owner
  ON public.team_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND team_id = (SELECT up.team_id FROM public.user_profiles up WHERE up.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.team_role = 'owner'
        AND (
          lower(up.plan) IN ('teams', 'trial')
          OR (lower(up.plan) = 'pro' AND up.team_id IS NOT NULL)
        )
    )
  );
