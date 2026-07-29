-- Create team rows in public.teams before assigning user_profiles.team_id.

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

  IF lower(v_plan) <> 'teams' THEN
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
