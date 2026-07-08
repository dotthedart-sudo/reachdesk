-- Migration: Follow-up Reminder + Action Suggestion Engine

-- 1. Add columns to leads table (additive only)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_checkpoint_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_reminder_hours numeric;

-- 2. Create action_suggestion_rules table
CREATE TABLE IF NOT EXISTS action_suggestion_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL UNIQUE,
  suggested_action text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Seed default rules
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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE action_suggestion_rules ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS Policies
-- Allow anyone to read the rules
CREATE POLICY "Allow read access to action_suggestion_rules for everyone" 
ON action_suggestion_rules 
FOR SELECT 
USING (true);

-- Allow authenticated users to manage rules (insert, update, delete)
CREATE POLICY "Allow authenticated users to manage action_suggestion_rules" 
ON action_suggestion_rules 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
