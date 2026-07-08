-- leads: new checkpoint columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_checkpoint_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_reminder_hours numeric;

-- user_profiles: 3 new per-user settings
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS reminders_enabled boolean DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS suggestions_enabled boolean DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS suggestions_auto_apply boolean DEFAULT false;

-- action suggestion rules table
CREATE TABLE IF NOT EXISTS action_suggestion_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL UNIQUE,
  suggested_action text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO action_suggestion_rules (status, suggested_action) VALUES
  ('Lead', 'Send first pitch'),
  ('Contacted', 'Wait for reply'),
  ('Waiting', 'Wait for reply'),
  ('No Show / Rescheduled', 'Send a follow up'),
  ('Not Interested', 'Send a different pitch'),
  ('Positive Reply', 'Send proposal'),
  ('Proposal Sent', 'Wait for reply'),
  ('Booked', 'Send invoice'),
  ('Client', 'No action needed')
ON CONFLICT (status) DO NOTHING;

ALTER TABLE action_suggestion_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated users can read suggestion rules" ON action_suggestion_rules;
CREATE POLICY "authenticated users can read suggestion rules"
  ON action_suggestion_rules FOR SELECT TO authenticated USING (true);
