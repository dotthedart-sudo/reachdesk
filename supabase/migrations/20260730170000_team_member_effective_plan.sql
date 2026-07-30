-- Team members inherit the workspace owner's plan for limits, features, and access checks.

CREATE OR REPLACE FUNCTION public._team_owner_plan_context(p_team_id uuid)
RETURNS TABLE(owner_plan text, owner_billing_cycle text, owner_plan_status text, owner_trial_ends_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT t.owner_id INTO v_owner_id
  FROM public.teams t
  WHERE t.id = p_team_id
  LIMIT 1;

  IF v_owner_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      lower(COALESCE(p.plan, '')),
      p.billing_cycle,
      p.plan_status,
      p.trial_ends_at
    FROM public.user_profiles p
    WHERE p.id = v_owner_id
    LIMIT 1;
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    lower(COALESCE(p.plan, '')),
    p.billing_cycle,
    p.plan_status,
    p.trial_ends_at
  FROM public.user_profiles p
  WHERE p.team_id = p_team_id
    AND lower(COALESCE(p.team_role, '')) = 'owner'
  ORDER BY p.created_at ASC NULLS LAST
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public._owner_workspace_is_active(
  p_owner_plan text,
  p_owner_plan_status text,
  p_owner_trial_ends_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_owner_plan IS NULL OR p_owner_plan = '' THEN
    RETURN false;
  END IF;

  IF p_owner_plan IN ('teams', 'pro') THEN
    IF p_owner_plan_status IS NOT NULL AND p_owner_plan_status <> 'active' THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  IF p_owner_plan = 'trial' THEN
    IF p_owner_trial_ends_at IS NOT NULL AND p_owner_trial_ends_at < now() THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_plan_context(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_role text;
  v_own_plan text;
  v_own_billing text;
  v_owner_plan text;
  v_owner_billing text;
  v_owner_status text;
  v_owner_trial timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('plan', 'trial', 'billing_cycle', null, 'inherits_workspace', false);
  END IF;

  SELECT
    team_id,
    lower(COALESCE(team_role, 'owner')),
    lower(COALESCE(plan, 'trial')),
    billing_cycle
  INTO v_team_id, v_role, v_own_plan, v_own_billing
  FROM public.user_profiles
  WHERE id = p_user_id;

  IF v_team_id IS NOT NULL AND v_role = 'member' THEN
    SELECT owner_plan, owner_billing_cycle, owner_plan_status, owner_trial_ends_at
    INTO v_owner_plan, v_owner_billing, v_owner_status, v_owner_trial
    FROM public._team_owner_plan_context(v_team_id)
    LIMIT 1;

    IF public._owner_workspace_is_active(v_owner_plan, v_owner_status, v_owner_trial) THEN
      RETURN jsonb_build_object(
        'plan', v_owner_plan,
        'billing_cycle', v_owner_billing,
        'inherits_workspace', true
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'plan', COALESCE(v_own_plan, 'trial'),
    'billing_cycle', v_own_billing,
    'inherits_workspace', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_plan_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN public.get_user_plan_context(auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_effective_plan_for_user(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(get_user_plan_context(p_user_id)->>'plan', 'trial');
$$;

CREATE OR REPLACE FUNCTION public.get_effective_billing_cycle_for_user(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT get_user_plan_context(p_user_id)->>'billing_cycle';
$$;

GRANT EXECUTE ON FUNCTION public.get_user_plan_context(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_plan_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_plan_for_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_effective_billing_cycle_for_user(uuid) TO authenticated, service_role;

-- Members on active team workspaces bypass personal subscription/trial expiry locks.
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
  v_owner_trial timestamptz;
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

  SELECT owner_plan, owner_plan_status, owner_trial_ends_at
  INTO v_owner_plan, v_owner_status, v_owner_trial
  FROM public._team_owner_plan_context(v_team_id)
  LIMIT 1;

  RETURN public._owner_workspace_is_active(v_owner_plan, v_owner_status, v_owner_trial);
END;
$$;

-- Lead limit trigger: use effective (workspace) plan for team members.
CREATE OR REPLACE FUNCTION public.check_lead_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_billing_cycle text;
  v_max_leads integer;
  v_current_count integer;
  v_effective_max integer;
  v_plan_exists boolean := false;
BEGIN
  v_plan := public.get_effective_plan_for_user(NEW.user_id);
  v_billing_cycle := public.get_effective_billing_cycle_for_user(NEW.user_id);

  IF v_plan IS NOT NULL THEN
    SELECT max_leads, true INTO v_max_leads, v_plan_exists
    FROM public.plan_limits
    WHERE plan = LOWER(v_plan);
  END IF;

  IF v_plan IS NULL OR v_plan_exists IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF v_max_leads IS NULL THEN
    RETURN NEW;
  END IF;

  IF LOWER(COALESCE(v_billing_cycle, '')) = 'yearly' THEN
    v_effective_max := v_max_leads * 2;
  ELSE
    v_effective_max := v_max_leads;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.leads
  WHERE user_id = NEW.user_id;

  IF v_current_count >= v_effective_max THEN
    RAISE EXCEPTION 'Lead limit reached for your plan (% leads).', v_effective_max;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_template_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_max_templates integer;
  v_current_count integer;
  v_plan_exists boolean := false;
BEGIN
  IF NEW.is_starter IS TRUE THEN
    RETURN NEW;
  END IF;

  v_plan := public.get_effective_plan_for_user(NEW.user_id);

  IF v_plan IS NOT NULL THEN
    SELECT max_templates, true INTO v_max_templates, v_plan_exists
    FROM public.plan_limits
    WHERE plan = LOWER(v_plan);
  END IF;

  IF v_plan IS NULL OR v_plan_exists IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF v_max_templates IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.templates
  WHERE user_id = NEW.user_id AND (is_starter IS NOT TRUE);

  IF v_current_count >= v_max_templates THEN
    RAISE EXCEPTION 'Template limit reached for your plan (% templates).', v_max_templates;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_remaining_lead_quota(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_billing_cycle text;
  v_max_leads integer;
  v_current_count integer;
  v_effective_max integer;
BEGIN
  v_plan := public.get_effective_plan_for_user(p_user_id);
  v_billing_cycle := public.get_effective_billing_cycle_for_user(p_user_id);

  IF v_plan IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT max_leads INTO v_max_leads
  FROM public.plan_limits
  WHERE plan = LOWER(v_plan);

  IF v_max_leads IS NULL THEN
    RETURN NULL;
  END IF;

  IF LOWER(COALESCE(v_billing_cycle, '')) = 'yearly' THEN
    v_effective_max := v_max_leads * 2;
  ELSE
    v_effective_max := v_max_leads;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.leads
  WHERE user_id = p_user_id;

  RETURN GREATEST(0, v_effective_max - v_current_count);
END;
$$;
