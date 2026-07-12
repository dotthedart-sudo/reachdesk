-- Calendar Integrations Table
-- Stores OAuth tokens and watch channel info for Google Calendar integration

CREATE TABLE IF NOT EXISTS calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  watch_channel_id text,
  watch_resource_id text,
  watch_expiration timestamptz,
  calendar_id text DEFAULT 'primary',
  connected_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(user_id, provider)
);

-- Enable Row Level Security
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own row
CREATE POLICY "Users manage own calendar integration"
  ON calendar_integrations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant usage to authenticated role
GRANT ALL ON calendar_integrations TO authenticated;
GRANT ALL ON calendar_integrations TO service_role;
