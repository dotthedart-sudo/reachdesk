-- Clear leftover fake Paddle test subscription IDs so sync/webhook can write real ones.
-- Does NOT force plan=trial (that one-off reset for esemdot in 20260801130000 caused stuck state).

UPDATE user_profiles
SET paddle_subscription_id = NULL
WHERE paddle_subscription_id LIKE 'sub_test%';

-- Normalize bogus epoch / zero trial dates so the UI never shows 12/31/1969
UPDATE user_profiles
SET trial_ends_at = NULL
WHERE trial_ends_at IS NOT NULL
  AND trial_ends_at < TIMESTAMPTZ '2000-01-01 00:00:00+00';
