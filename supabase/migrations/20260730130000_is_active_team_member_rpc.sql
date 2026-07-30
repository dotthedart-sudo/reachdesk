-- Server-side team member access check (members cannot read owner plan via RLS on user_profiles).

CREATE OR REPLACE FUNCTION public.is_active_team_member()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team_id uuid;
  v_role text;
  v_owner_plan text;
  v_owner_status text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT team_id, lower(COALESCE(team_role, 'owner'))
  INTO v_team_id, v_role
  FROM public.user_profiles
  WHERE id = v_uid;

  IF v_team_id IS NULL OR v_role <> 'member' THEN
    RETURN false;
  END IF;

  SELECT lower(COALESCE(p.plan, '')), p.plan_status
  INTO v_owner_plan, v_owner_status
  FROM public.teams t
  JOIN public.user_profiles p ON p.id = t.owner_id
  WHERE t.id = v_team_id
  LIMIT 1;

  IF v_owner_plan IS NULL THEN
    SELECT lower(COALESCE(p.plan, '')), p.plan_status
    INTO v_owner_plan, v_owner_status
    FROM public.user_profiles p
    WHERE p.team_id = v_team_id
      AND lower(COALESCE(p.team_role, '')) = 'owner'
    ORDER BY p.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_owner_plan <> 'teams' THEN
    RETURN false;
  END IF;

  IF v_owner_status IS NOT NULL AND v_owner_status <> 'active' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_active_team_member() TO authenticated;
