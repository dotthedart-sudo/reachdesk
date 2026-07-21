-- SQL script to create and execute a test function verifying DB triggers

CREATE OR REPLACE FUNCTION public.test_enforcement_suite()
RETURNS TABLE (
  test_case text,
  passed boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_lead_msg text := 'FAILED';
  v_tmpl_msg text := 'FAILED';
  v_lead_passed boolean := false;
  v_tmpl_passed boolean := false;
  v_starter_passed boolean := false;
  v_starter_msg text := 'FAILED';
BEGIN
  -- Get an existing auth user
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user in auth.users';
  END IF;

  -- Setup profile with trial plan (65 leads, 3 templates)
  INSERT INTO public.user_profiles (id, email, plan, billing_cycle)
  VALUES (v_user_id, 'test@example.com', 'trial', 'monthly')
  ON CONFLICT (id) DO UPDATE SET plan = 'trial', billing_cycle = 'monthly';

  -- Clean existing leads & custom templates for this user
  DELETE FROM public.leads WHERE user_id = v_user_id;
  DELETE FROM public.templates WHERE user_id = v_user_id AND (is_starter IS NOT TRUE);

  -- 1. Insert 65 leads
  INSERT INTO public.leads (user_id, first_name, email, status, priority)
  SELECT
    v_user_id,
    'Lead_' || i,
    'lead_' || i || '@test.com',
    'Lead',
    'Warm'
  FROM generate_series(1, 65) AS i;

  -- 2. Test 66th lead insert (MUST fail with trigger error)
  BEGIN
    INSERT INTO public.leads (user_id, first_name, email, status, priority)
    VALUES (v_user_id, 'OverLimitLead', 'overlimit@test.com', 'Lead', 'Warm');
    v_lead_msg := 'Insert succeeded past limit (FAIL)';
    v_lead_passed := false;
  EXCEPTION WHEN OTHERS THEN
    v_lead_msg := SQLERRM;
    IF v_lead_msg LIKE '%Lead limit reached%' THEN
      v_lead_passed := true;
    ELSE
      v_lead_passed := false;
    END IF;
  END;

  test_case := 'Direct DB Lead Limit Enforcement (66th lead on Trial plan)';
  passed := v_lead_passed;
  message := v_lead_msg;
  RETURN NEXT;

  -- 3. Insert 3 custom templates
  INSERT INTO public.templates (user_id, title, content, platform, is_starter)
  VALUES
    (v_user_id, 'Test Tmpl 1', '{"subject":"1","body":"1"}', 'Email', false),
    (v_user_id, 'Test Tmpl 2', '{"subject":"2","body":"2"}', 'Email', false),
    (v_user_id, 'Test Tmpl 3', '{"subject":"3","body":"3"}', 'Email', false);

  -- 4. Test 4th template insert (MUST fail with trigger error)
  BEGIN
    INSERT INTO public.templates (user_id, title, content, platform, is_starter)
    VALUES (v_user_id, 'OverLimitTmpl', '{"subject":"4","body":"4"}', 'Email', false);
    v_tmpl_msg := 'Insert succeeded past limit (FAIL)';
    v_tmpl_passed := false;
  EXCEPTION WHEN OTHERS THEN
    v_tmpl_msg := SQLERRM;
    IF v_tmpl_msg LIKE '%Template limit reached%' THEN
      v_tmpl_passed := true;
    ELSE
      v_tmpl_passed := false;
    END IF;
  END;

  test_case := 'Direct DB Template Limit Enforcement (4th template on Trial plan)';
  passed := v_tmpl_passed;
  message := v_tmpl_msg;
  RETURN NEXT;

  -- 5. Test starter template insert (MUST succeed despite limit)
  BEGIN
    INSERT INTO public.templates (user_id, title, content, platform, is_starter)
    VALUES (v_user_id, 'Starter Tmpl Test', '{"subject":"S","body":"S"}', 'Email', true);
    v_starter_passed := true;
    v_starter_msg := 'Starter template inserted successfully (Exempt from limit)';
  EXCEPTION WHEN OTHERS THEN
    v_starter_passed := false;
    v_starter_msg := SQLERRM;
  END;

  test_case := 'Starter Template Exclusion from Limit';
  passed := v_starter_passed;
  message := v_starter_msg;
  RETURN NEXT;

  -- Cleanup
  DELETE FROM public.leads WHERE user_id = v_user_id;
  DELETE FROM public.templates WHERE user_id = v_user_id AND title IN ('Test Tmpl 1', 'Test Tmpl 2', 'Test Tmpl 3', 'Starter Tmpl Test');

END;
$$;

SELECT * FROM public.test_enforcement_suite();
DROP FUNCTION IF EXISTS public.test_enforcement_suite();
