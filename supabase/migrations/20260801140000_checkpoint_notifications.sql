-- Unify reminder notifications on leads.next_checkpoint_at
-- Digest push settings on user_profiles

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS checkpoint_notified_at timestamptz;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS reminder_notification_mode text NOT NULL DEFAULT 'digest',
  ADD COLUMN IF NOT EXISTS reminder_digest_hour int NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS reminder_digest_sent_date date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_reminder_notification_mode_check'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_reminder_notification_mode_check
      CHECK (reminder_notification_mode IN ('digest', 'instant'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_reminder_digest_hour_check'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_reminder_digest_hour_check
      CHECK (reminder_digest_hour >= 0 AND reminder_digest_hour <= 23);
  END IF;
END $$;

COMMENT ON COLUMN leads.checkpoint_notified_at IS
  'Last time a push was sent for the current next_checkpoint_at; cleared when checkpoint reschedules';
COMMENT ON COLUMN user_profiles.reminder_notification_mode IS
  'digest = one daily push; instant = per-checkpoint push';
COMMENT ON COLUMN user_profiles.reminder_digest_hour IS
  'Local hour (0-23) for daily digest push';
COMMENT ON COLUMN user_profiles.reminder_digest_sent_date IS
  'Local date key (YYYY-MM-DD) when digest was last sent';
