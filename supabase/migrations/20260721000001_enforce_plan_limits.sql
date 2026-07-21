-- Migration: Enforce lead and template plan limits at database level

-- 1. Create plan_limits table
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan text PRIMARY KEY,
  max_leads integer,
  max_templates integer
);

-- Mirror exact numbers from src/lib/utils.js PLAN_LIMITS
INSERT INTO public.plan_limits (plan, max_leads, max_templates) VALUES
  ('trial', 65, 3),
  ('starter', 1000, 10),
  ('pro', 5000, NULL),
  ('teams', NULL, NULL),
  ('enterprise', NULL, NULL)
ON CONFLICT (plan) DO UPDATE SET
  max_leads = EXCLUDED.max_leads,
  max_templates = EXCLUDED.max_templates;

-- Enable RLS on plan_limits
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for authenticated users" ON public.plan_limits;
DROP POLICY IF EXISTS "Allow read access" ON public.plan_limits;

CREATE POLICY "Allow read access"
  ON public.plan_limits FOR SELECT
  TO authenticated, anon
  USING (true);


-- 2. Trigger function for leads limit
CREATE OR REPLACE FUNCTION public.check_lead_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan text;
  v_billing_cycle text;
  v_max_leads integer;
  v_current_count integer;
  v_effective_max integer;
  v_plan_exists boolean := false;
BEGIN
  -- Look up inserting user's plan and billing_cycle from user_profiles
  SELECT plan, billing_cycle INTO v_plan, v_billing_cycle
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  -- Look up max_leads from plan_limits
  IF v_plan IS NOT NULL THEN
    SELECT max_leads, true INTO v_max_leads, v_plan_exists
    FROM public.plan_limits
    WHERE plan = LOWER(v_plan);
  END IF;

  -- If plan is not found in plan_limits, allow insert (do not block unknown plans)
  IF v_plan IS NULL OR v_plan_exists IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- If max_leads is NULL, unlimited leads allowed
  IF v_max_leads IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate effective max (yearly billing doubles base lead limit)
  IF LOWER(COALESCE(v_billing_cycle, '')) = 'yearly' THEN
    v_effective_max := v_max_leads * 2;
  ELSE
    v_effective_max := v_max_leads;
  END IF;

  -- Count user's current leads
  SELECT COUNT(*) INTO v_current_count
  FROM public.leads
  WHERE user_id = NEW.user_id;

  -- If count is already at or above max, block insert
  IF v_current_count >= v_effective_max THEN
    RAISE EXCEPTION 'Lead limit reached for your plan (% leads).', v_effective_max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_lead_limit ON public.leads;
CREATE TRIGGER trg_check_lead_limit
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.check_lead_limit();


-- 3. Trigger function for templates limit
CREATE OR REPLACE FUNCTION public.check_template_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan text;
  v_max_templates integer;
  v_current_count integer;
  v_plan_exists boolean := false;
BEGIN
  -- Starter templates (is_starter = true) are not counted against limit
  IF NEW.is_starter IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Look up inserting user's plan from user_profiles
  SELECT plan INTO v_plan
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  -- Look up max_templates from plan_limits
  IF v_plan IS NOT NULL THEN
    SELECT max_templates, true INTO v_max_templates, v_plan_exists
    FROM public.plan_limits
    WHERE plan = LOWER(v_plan);
  END IF;

  -- If plan is not found in plan_limits, allow insert
  IF v_plan IS NULL OR v_plan_exists IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- If max_templates is NULL, unlimited templates allowed
  IF v_max_templates IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count user's current custom templates (excluding starter templates)
  SELECT COUNT(*) INTO v_current_count
  FROM public.templates
  WHERE user_id = NEW.user_id AND (is_starter IS NOT TRUE);

  -- If count is already at or above max, block insert
  IF v_current_count >= v_max_templates THEN
    RAISE EXCEPTION 'Template limit reached for your plan (% templates).', v_max_templates;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_template_limit ON public.templates;
CREATE TRIGGER trg_check_template_limit
BEFORE INSERT ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.check_template_limit();


-- 4. Helper function: get_remaining_lead_quota
CREATE OR REPLACE FUNCTION public.get_remaining_lead_quota(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan text;
  v_billing_cycle text;
  v_max_leads integer;
  v_current_count integer;
  v_effective_max integer;
BEGIN
  SELECT plan, billing_cycle INTO v_plan, v_billing_cycle
  FROM public.user_profiles
  WHERE id = p_user_id;

  IF v_plan IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT max_leads INTO v_max_leads
  FROM public.plan_limits
  WHERE plan = LOWER(v_plan);

  IF v_max_leads IS NULL THEN
    RETURN NULL; -- NULL = unlimited
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
