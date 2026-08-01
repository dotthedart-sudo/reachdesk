-- Team owner CRM visibility + hybrid member lead isolation (RLS)

CREATE OR REPLACE FUNCTION public.is_team_owner_of(target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles viewer
    JOIN user_profiles target ON target.id = target_user
    WHERE viewer.id = auth.uid()
      AND lower(COALESCE(viewer.team_role, 'owner')) = 'owner'
      AND viewer.team_id IS NOT NULL
      AND viewer.team_id = target.team_id
  );
$$;

CREATE OR REPLACE FUNCTION public.viewer_team_sees_own_leads_only()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT t.members_see_own_leads_only
      FROM user_profiles up
      JOIN teams t ON t.id = up.team_id
      WHERE up.id = auth.uid()
        AND lower(COALESCE(up.team_role, 'owner')) = 'member'
    ),
    false
  );
$$;

-- ── folders ──
DROP POLICY IF EXISTS folders_select_team ON folders;
CREATE POLICY folders_select_team ON folders FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_team_owner_of(user_id)
  OR id IN (
    SELECT folder_id FROM folder_shares WHERE shared_with_user_id = auth.uid()
  )
);

-- ── user_folders (auto lists) ──
DROP POLICY IF EXISTS user_folders_select_team ON user_folders;
CREATE POLICY user_folders_select_team ON user_folders FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_team_owner_of(user_id)
);

-- ── leads ──
DROP POLICY IF EXISTS leads_select_team ON leads;
CREATE POLICY leads_select_team ON leads FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_team_owner_of(user_id)
  OR (
    NOT public.viewer_team_sees_own_leads_only()
    AND user_id IN (
      SELECT m.id FROM user_profiles m
      JOIN user_profiles v ON v.id = auth.uid()
      WHERE m.team_id = v.team_id AND m.team_id IS NOT NULL
    )
  )
  OR folder_id IN (
    SELECT folder_id FROM folder_shares WHERE shared_with_user_id = auth.uid()
  )
);

-- ── folder_shares: owners can read shares on team member folders ──
DROP POLICY IF EXISTS folder_shares_select ON folder_shares;
CREATE POLICY folder_shares_select ON folder_shares FOR SELECT TO authenticated
  USING (
    shared_with_user_id = auth.uid()
    OR shared_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM folders f
      WHERE f.id = folder_shares.folder_id AND f.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM folders f
      WHERE f.id = folder_shares.folder_id
        AND public.is_team_owner_of(f.user_id)
    )
  );
