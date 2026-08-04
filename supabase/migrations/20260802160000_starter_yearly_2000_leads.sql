-- Starter yearly lead cap = 2000 (not flat 2× of 750). Pro yearly stays 2×.

CREATE OR REPLACE FUNCTION public.effective_plan_lead_limit(p_plan text, p_billing_cycle text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_plan text := LOWER(COALESCE(p_plan, ''));
  v_cycle text := LOWER(COALESCE(p_billing_cycle, ''));
  v_max integer;
BEGIN
  SELECT max_leads INTO v_max
  FROM public.plan_limits
  WHERE plan = v_plan;

  IF v_max IS NULL THEN
    RETURN NULL; -- unlimited or unknown
  END IF;

  IF v_cycle = 'yearly' THEN
    IF v_plan = 'starter' THEN
      RETURN 2000;
    END IF;
    IF v_plan = 'pro' THEN
      RETURN v_max * 2;
    END IF;
  END IF;

  RETURN v_max;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_lead_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_billing_cycle text;
  v_effective_max integer;
  v_current_count integer;
BEGIN
  v_plan := public.get_effective_plan_for_user(NEW.user_id);
  v_billing_cycle := public.get_effective_billing_cycle_for_user(NEW.user_id);

  IF v_plan IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.plan_limits WHERE plan = LOWER(v_plan)) THEN
    RETURN NEW;
  END IF;

  v_effective_max := public.effective_plan_lead_limit(v_plan, v_billing_cycle);

  IF v_effective_max IS NULL THEN
    RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.get_remaining_lead_quota(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_billing_cycle text;
  v_effective_max integer;
  v_current_count integer;
BEGIN
  v_plan := public.get_effective_plan_for_user(p_user_id);
  v_billing_cycle := public.get_effective_billing_cycle_for_user(p_user_id);

  IF v_plan IS NULL THEN
    RETURN NULL;
  END IF;

  v_effective_max := public.effective_plan_lead_limit(v_plan, v_billing_cycle);

  IF v_effective_max IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.leads
  WHERE user_id = p_user_id;

  RETURN GREATEST(0, v_effective_max - v_current_count);
END;
$$;
