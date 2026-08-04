-- Verify policies no longer cross-subquery each other under RLS
SELECT tablename, policyname, cmd, COALESCE(qual, with_check) AS expr
FROM pg_policies
WHERE tablename IN ('folders', 'folder_shares', 'leads')
  AND policyname IN (
    'folders_select_team',
    'folder_shares_select',
    'folder_shares_insert',
    'folder_shares_delete',
    'leads_select_team'
  )
ORDER BY tablename, policyname;

-- Helpers exist
SELECT p.proname, p.prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'folder_is_shared_with_user',
    'folder_owned_or_team_owned_by',
    'folder_ids_shared_with_user'
  );
