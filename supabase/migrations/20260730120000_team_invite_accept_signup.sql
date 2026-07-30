-- Allow invite acceptance during signup before email_confirmed_at propagates.
-- Token-based accept: secret UUID + matching invited email is sufficient.
-- Also clears account_locked when joining as a team member.

CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_invite_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_invite record;
BEGIN
  IF v_uid IS NULL OR p_invite_token IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM user_profiles WHERE id = v_uid;
  END IF;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Profile email not found');
  END IF;

  SELECT * INTO v_invite
  FROM team_invitations
  WHERE invite_token = p_invite_token
    AND status = 'pending'
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invite not found or already used');
  END IF;

  IF lower(v_invite.invited_email) <> lower(v_email) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Sign in with the invited email address to accept this invite'
    );
  END IF;

  UPDATE user_profiles
  SET
    team_id = v_invite.team_id,
    team_role = 'member',
    account_locked = false,
    locked_at = NULL
  WHERE id = v_uid;

  UPDATE team_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('ok', true, 'team_id', v_invite.team_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_pending_team_invite_by_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_invite record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM user_profiles WHERE id = v_uid;
  END IF;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  SELECT * INTO v_invite
  FROM team_invitations
  WHERE lower(invited_email) = lower(v_email)
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  UPDATE user_profiles
  SET
    team_id = v_invite.team_id,
    team_role = 'member',
    account_locked = false,
    locked_at = NULL
  WHERE id = v_uid;

  UPDATE team_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('ok', true, 'team_id', v_invite.team_id);
END;
$$;

-- Allow unlocking when joining a workspace as a team member (invite accept).
CREATE OR REPLACE FUNCTION public.guard_user_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
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
    IF NEW.account_locked = false AND OLD.account_locked = true
       AND NEW.team_id IS NOT NULL
       AND lower(COALESCE(NEW.team_role, '')) = 'member' THEN
      NULL;
    ELSIF NOT (NEW.account_locked = true AND OLD.account_locked = false) THEN
      RAISE EXCEPTION 'Cannot change account lock';
    END IF;
  END IF;
  IF NEW.locked_at IS DISTINCT FROM OLD.locked_at THEN
    IF NEW.account_locked = false AND OLD.account_locked = true
       AND NEW.team_id IS NOT NULL
       AND lower(COALESCE(NEW.team_role, '')) = 'member' THEN
      NULL;
    ELSIF NOT (NEW.account_locked = true AND OLD.account_locked = false) THEN
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
