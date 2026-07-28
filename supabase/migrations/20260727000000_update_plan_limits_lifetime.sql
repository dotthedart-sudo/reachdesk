-- Update plan limits for new tier ladder (Trial → Starter → Pro → Lifetime)
-- Maps legacy teams/enterprise rows for existing subscribers.

INSERT INTO public.plan_limits (plan, max_leads, max_templates) VALUES
  ('trial', 50, 5),
  ('starter', 750, 10),
  ('pro', 5000, NULL),
  ('lifetime', 5000000, NULL),
  ('teams', 5000, NULL),
  ('enterprise', 5000000, NULL)
ON CONFLICT (plan) DO UPDATE SET
  max_leads = EXCLUDED.max_leads,
  max_templates = EXCLUDED.max_templates;

-- Lifetime concurrent session tracking (1 active session per account)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  session_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ip_address text,
  user_agent text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON public.user_sessions(last_seen_at);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own sessions" ON public.user_sessions;
CREATE POLICY "Users manage own sessions"
  ON public.user_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
