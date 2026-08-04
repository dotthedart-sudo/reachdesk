BEGIN;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f647945e-f1d3-42fd-b85b-2b2a92134fba","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT 'folders' AS tbl, count(*)::int AS n FROM folders
UNION ALL
SELECT 'folder_shares', count(*)::int FROM folder_shares
UNION ALL
SELECT 'leads', count(*)::int FROM leads;

ROLLBACK;
