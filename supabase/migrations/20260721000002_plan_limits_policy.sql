-- Update RLS policy for plan_limits to allow SELECT to authenticated and anon
DROP POLICY IF EXISTS "Allow public read access for authenticated users" ON public.plan_limits;
DROP POLICY IF EXISTS "Allow read access" ON public.plan_limits;

CREATE POLICY "Allow read access"
  ON public.plan_limits FOR SELECT
  TO authenticated, anon
  USING (true);
