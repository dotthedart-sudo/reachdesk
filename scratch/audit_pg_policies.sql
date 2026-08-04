SELECT
  tablename,
  policyname,
  cmd,
  COALESCE(qual, '') AS qual,
  COALESCE(with_check, '') AS with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
