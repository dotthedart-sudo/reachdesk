-- Sheets Integrations Table
-- Stores OAuth tokens for Google Sheets integration

CREATE TABLE IF NOT EXISTS sheets_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  connected_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE sheets_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own integration row
CREATE POLICY "Users manage own sheets integration"
  ON sheets_integrations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant usage to authenticated and service_role
GRANT ALL ON sheets_integrations TO authenticated;
GRANT ALL ON sheets_integrations TO service_role;
