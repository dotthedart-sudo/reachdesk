-- Break folders <-> folder_shares RLS infinite recursion (Option A: SECURITY DEFINER helpers).
-- Confirmed via pg_policies on linked project: only mutual cycle is folders <-> folder_shares.
-- leads_select_team also subqueries folder_shares and hits the same cycle on CRM loads.

CREATE OR REPLACE FUNCTION public.folder_is_shared_with_user(p_folder_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.folder_shares
    WHERE folder_id = p_folder_id
      AND shared_with_user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.folder_owned_or_team_owned_by(p_folder_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.folders f
    WHERE f.id = p_folder_id
      AND (
        f.user_id = p_user_id
        OR public.is_team_owner_of(f.user_id)
      )
  );
$$;

-- Used by leads/folders policies: any folder shared with the viewer (avoids scanning folder_shares under RLS).
CREATE OR REPLACE FUNCTION public.folder_ids_shared_with_user(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT folder_id
  FROM public.folder_shares
  WHERE shared_with_user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.folder_is_shared_with_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.folder_owned_or_team_owned_by(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.folder_ids_shared_with_user(uuid) TO authenticated;

-- ── folders SELECT ──
DROP POLICY IF EXISTS folders_select_team ON folders;
CREATE POLICY folders_select_team ON folders FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_team_owner_of(user_id)
  OR public.folder_is_shared_with_user(id, auth.uid())
);

-- ── folder_shares SELECT / INSERT / DELETE ──
DROP POLICY IF EXISTS folder_shares_select ON folder_shares;
CREATE POLICY folder_shares_select ON folder_shares FOR SELECT TO authenticated
USING (
  shared_with_user_id = auth.uid()
  OR shared_by_user_id = auth.uid()
  OR public.folder_owned_or_team_owned_by(folder_id, auth.uid())
);

DROP POLICY IF EXISTS folder_shares_insert ON folder_shares;
CREATE POLICY folder_shares_insert ON folder_shares FOR INSERT TO authenticated
WITH CHECK (
  shared_by_user_id = auth.uid()
  AND public.folder_owned_or_team_owned_by(folder_id, auth.uid())
);

DROP POLICY IF EXISTS folder_shares_delete ON folder_shares;
CREATE POLICY folder_shares_delete ON folder_shares FOR DELETE TO authenticated
USING (
  shared_by_user_id = auth.uid()
  OR public.folder_owned_or_team_owned_by(folder_id, auth.uid())
);

-- ── leads SELECT: stop raw folder_shares subquery (same recursion path) ──
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
  OR (
    folder_id IS NOT NULL
    AND public.folder_is_shared_with_user(folder_id, auth.uid())
  )
);
