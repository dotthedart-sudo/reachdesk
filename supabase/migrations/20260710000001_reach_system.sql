CREATE TABLE IF NOT EXISTS channel_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  channel_type text NOT NULL CHECK (channel_type IN ('messaging', 'profile_only')),
  supports_prefill boolean NOT NULL DEFAULT false
);

INSERT INTO channel_config (channel_key, display_name, channel_type, supports_prefill) VALUES
  ('email', 'Email', 'messaging', true),
  ('whatsapp', 'WhatsApp', 'messaging', true),
  ('sms', 'SMS', 'messaging', true),
  ('linkedin_url', 'LinkedIn', 'messaging', false),
  ('instagram_url', 'Instagram', 'messaging', false),
  ('twitter_url', 'Twitter/X', 'messaging', false),
  ('website', 'Website', 'profile_only', false)
ON CONFLICT (channel_key) DO NOTHING;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS always_draft_before_sending boolean DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS default_country_code text DEFAULT '+92';
