-- Prevent non-admin users from self-promoting plan/role or bypassing billing locks.

CREATE OR REPLACE FUNCTION public.guard_user_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Service role / postgres (no JWT subject) — allow
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_caller_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF v_caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND auth.uid() <> OLD.id THEN
    RAISE EXCEPTION 'Cannot update another user''s profile';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.id <> auth.uid() THEN
      RAISE EXCEPTION 'Cannot create a profile for another user';
    END IF;
    NEW.role := 'user';
    IF NEW.plan IS NULL OR NEW.plan <> 'trial' THEN
      NEW.plan := 'trial';
    END IF;
    IF NEW.status IS NULL THEN
      NEW.status := 'approved';
    ELSIF NEW.status NOT IN ('approved', 'pending') THEN
      NEW.status := 'approved';
    END IF;
    NEW.account_locked := COALESCE(NEW.account_locked, false);
    NEW.payment_pending := COALESCE(NEW.payment_pending, false);
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot change role';
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Cannot change plan';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot change account status';
  END IF;
  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Cannot change trial end date';
  END IF;
  IF NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
    RAISE EXCEPTION 'Cannot change plan expiry';
  END IF;
  IF NEW.account_locked IS DISTINCT FROM OLD.account_locked THEN
    IF NOT (NEW.account_locked = true AND OLD.account_locked = false) THEN
      RAISE EXCEPTION 'Cannot change account lock';
    END IF;
  END IF;
  IF NEW.locked_at IS DISTINCT FROM OLD.locked_at THEN
    IF NOT (NEW.account_locked = true AND OLD.account_locked = false) THEN
      RAISE EXCEPTION 'Cannot change lock timestamp';
    END IF;
  END IF;
  IF NEW.paddle_subscription_id IS DISTINCT FROM OLD.paddle_subscription_id THEN
    RAISE EXCEPTION 'Cannot change subscription';
  END IF;
  IF NEW.paddle_customer_id IS DISTINCT FROM OLD.paddle_customer_id THEN
    RAISE EXCEPTION 'Cannot change billing customer';
  END IF;
  IF NEW.billing_cycle IS DISTINCT FROM OLD.billing_cycle THEN
    RAISE EXCEPTION 'Cannot change billing cycle';
  END IF;
  IF NEW.payment_pending IS DISTINCT FROM OLD.payment_pending THEN
    RAISE EXCEPTION 'Cannot change payment status';
  END IF;
  IF NEW.requested_plan IS DISTINCT FROM OLD.requested_plan THEN
    RAISE EXCEPTION 'Cannot change requested plan';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_profile_sensitive ON public.user_profiles;
CREATE TRIGGER trg_guard_user_profile_sensitive
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_user_profile_sensitive_columns();
