-- Per-list sharing + hybrid team default (members see own leads unless shared).

CREATE TABLE IF NOT EXISTS folder_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS folder_shares_shared_with_idx ON folder_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS folder_shares_folder_idx ON folder_shares(folder_id);

ALTER TABLE folder_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS folder_shares_select ON folder_shares;
CREATE POLICY folder_shares_select ON folder_shares FOR SELECT TO authenticated
  USING (
    shared_with_user_id = auth.uid()
    OR shared_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM folders f
      WHERE f.id = folder_shares.folder_id AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS folder_shares_insert ON folder_shares;
CREATE POLICY folder_shares_insert ON folder_shares FOR INSERT TO authenticated
  WITH CHECK (
    shared_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM folders f WHERE f.id = folder_id AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS folder_shares_update ON folder_shares;
CREATE POLICY folder_shares_update ON folder_shares FOR UPDATE TO authenticated
  USING (shared_by_user_id = auth.uid())
  WITH CHECK (shared_by_user_id = auth.uid());

DROP POLICY IF EXISTS folder_shares_delete ON folder_shares;
CREATE POLICY folder_shares_delete ON folder_shares FOR DELETE TO authenticated
  USING (
    shared_by_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM folders f WHERE f.id = folder_id AND f.user_id = auth.uid())
  );

-- New teams default to hybrid visibility (existing rows unchanged).
ALTER TABLE teams
  ALTER COLUMN members_see_own_leads_only SET DEFAULT true;
