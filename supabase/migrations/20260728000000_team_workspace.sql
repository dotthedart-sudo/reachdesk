-- Pro team workspace: team_id on profiles, invitations, RLS, helper RPCs

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS team_id uuid,
  ADD COLUMN IF NOT EXISTS team_role text DEFAULT 'owner';

CREATE INDEX IF NOT EXISTS idx_user_profiles_team_id ON public.user_profiles(team_id);

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  invited_email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CONSTRAINT team_invitations_invite_token_key UNIQUE (invite_token)
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_pending_email
  ON public.team_invitations(lower(invited_email))
  WHERE status = 'pending';

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_invites_select_member ON public.team_invitations;
CREATE POLICY team_invites_select_member
  ON public.team_invitations FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT up.team_id FROM public.user_profiles up WHERE up.id = auth.uid() AND up.team_id IS NOT NULL)
    OR lower(invited_email) = lower(COALESCE((SELECT email FROM public.user_profiles WHERE id = auth.uid()), ''))
  );

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
        AND lower(up.plan) IN ('pro', 'teams')
    )
  );

DROP POLICY IF EXISTS team_invites_update_owner_or_invitee ON public.team_invitations;
CREATE POLICY team_invites_update_owner_or_invitee
  ON public.team_invitations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.team_role = 'owner' AND up.team_id = team_invitations.team_id
    )
    OR (
      status = 'pending'
      AND lower(invited_email) = lower(COALESCE((SELECT email FROM public.user_profiles WHERE id = auth.uid()), ''))
    )
  );

DROP POLICY IF EXISTS team_invites_delete_owner ON public.team_invitations;
CREATE POLICY team_invites_delete_owner
  ON public.team_invitations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.team_role = 'owner' AND up.team_id = team_invitations.team_id
    )
  );

-- Ensure Pro owner has a workspace team_id (lazy init from client)
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

  IF lower(v_plan) NOT IN ('pro', 'teams') OR lower(COALESCE(v_role, '')) = 'member' THEN
    RETURN v_team_id;
  END IF;

  IF v_team_id IS NOT NULL THEN
    IF v_role IS NULL OR lower(v_role) <> 'owner' THEN
      UPDATE user_profiles SET team_role = 'owner' WHERE id = v_uid;
    END IF;
    RETURN v_team_id;
  END IF;

  v_team_id := gen_random_uuid();
  UPDATE user_profiles
  SET team_id = v_team_id, team_role = 'owner'
  WHERE id = v_uid;

  RETURN v_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_pro_team_workspace() TO authenticated;

-- Accept invite by token; invitee keeps their own plan (seat model)
CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_invite_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_email_confirmed timestamptz;
  v_invite record;
BEGIN
  IF v_uid IS NULL OR p_invite_token IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  SELECT email, email_confirmed_at INTO v_email, v_email_confirmed
  FROM auth.users WHERE id = v_uid;

  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM user_profiles WHERE id = v_uid;
  END IF;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Profile email not found');
  END IF;

  IF v_email_confirmed IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Verify your email before accepting this workspace invite'
    );
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
  SET team_id = v_invite.team_id, team_role = 'member'
  WHERE id = v_uid;

  UPDATE team_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('ok', true, 'team_id', v_invite.team_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_team_invitation(uuid) TO authenticated;

-- Accept pending invite matched by email (signup without token in URL)
CREATE OR REPLACE FUNCTION public.accept_pending_team_invite_by_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_email_confirmed timestamptz;
  v_invite record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  SELECT email, email_confirmed_at INTO v_email, v_email_confirmed
  FROM auth.users WHERE id = v_uid;

  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM user_profiles WHERE id = v_uid;
  END IF;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  IF v_email_confirmed IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Verify your email before joining the workspace');
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
  SET team_id = v_invite.team_id, team_role = 'member'
  WHERE id = v_uid;

  UPDATE team_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('ok', true, 'team_id', v_invite.team_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_pending_team_invite_by_email() TO authenticated;
