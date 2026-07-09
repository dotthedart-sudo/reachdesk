-- Migration: add sidebar_collapsed preference to user_profiles
-- Pattern matches: reminders_enabled, suggestions_auto_apply, monthly_revenue_target
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sidebar_collapsed boolean DEFAULT false;

-- Verification query
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name = 'sidebar_collapsed';
