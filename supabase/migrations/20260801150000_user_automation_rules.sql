-- Per-user status → next step automation rules (messaging + calls)

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS messaging_action_rules jsonb,
  ADD COLUMN IF NOT EXISTS call_status_rules jsonb,
  ADD COLUMN IF NOT EXISTS call_outcome_rules jsonb,
  ADD COLUMN IF NOT EXISTS call_suggestions_auto_apply boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN user_profiles.messaging_action_rules IS
  'User overrides: [{ status, suggested_action }] for messaging pipeline';
COMMENT ON COLUMN user_profiles.call_status_rules IS
  'User overrides: [{ status, suggested_call_action, suggested_priority }]';
COMMENT ON COLUMN user_profiles.call_outcome_rules IS
  'User overrides: [{ outcome, suggested_call_status, suggested_call_action, suggested_priority }]';
COMMENT ON COLUMN user_profiles.call_suggestions_auto_apply IS
  'When true, call_status/outcome changes auto-write call_action from rules';
