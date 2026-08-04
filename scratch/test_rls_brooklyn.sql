BEGIN;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f7c74743-0273-447c-a238-626e0b1fd0a0","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT 'folders' AS tbl, count(*)::int AS n FROM folders
UNION ALL
SELECT 'folder_shares', count(*)::int FROM folder_shares
UNION ALL
SELECT 'leads', count(*)::int FROM leads;

ROLLBACK;
