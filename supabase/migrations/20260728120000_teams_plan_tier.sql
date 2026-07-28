-- Teams plan tier: Pro caps templates; Teams gets unlimited leads/templates and 5 seats.

INSERT INTO public.plan_limits (plan, max_leads, max_templates) VALUES
  ('pro', 5000, 50),
  ('teams', NULL, NULL)
ON CONFLICT (plan) DO UPDATE SET
  max_leads = EXCLUDED.max_leads,
  max_templates = EXCLUDED.max_templates;

-- Team workspace: new workspaces for Teams only; grandfather Pro owners with existing team_id
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
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT plan, team_role, team_id
  INTO v_plan, v_role, v_team_id
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

  IF lower(v_plan) <> 'teams' THEN
    RETURN NULL;
  END IF;

  v_team_id := gen_random_uuid();
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
          lower(up.plan) = 'teams'
          OR (lower(up.plan) = 'pro' AND up.team_id IS NOT NULL)
        )
    )
  );
