-- SQL migration for corrupted leads
-- 1. Direct matches
UPDATE leads SET status = 'Lead' WHERE status = 'lead';
UPDATE leads SET status = 'Contacted' WHERE status = 'contacted';
UPDATE leads SET status = 'Booked' WHERE status = 'booked';
UPDATE leads SET status = 'Positive Reply' WHERE status = 'positive_reply';

-- 2. follow_up leads migration: status, action_to_take, and recompute next_checkpoint_at
UPDATE leads
SET
  status = 'No Show / Rescheduled',
  action_to_take = 'Send a follow up',
  next_checkpoint_at = CASE
    WHEN last_contacted_at IS NULL THEN NULL
    WHEN last_contacted_at + INTERVAL '12 hours' > now() THEN last_contacted_at + INTERVAL '12 hours'
    WHEN last_contacted_at + INTERVAL '24 hours' > now() THEN last_contacted_at + INTERVAL '24 hours'
    WHEN last_contacted_at + INTERVAL '72 hours' > now() THEN last_contacted_at + INTERVAL '72 hours'
    WHEN last_contacted_at + INTERVAL '120 hours' > now() THEN last_contacted_at + INTERVAL '120 hours'
    WHEN last_contacted_at + INTERVAL '168 hours' > now() THEN last_contacted_at + INTERVAL '168 hours'
    WHEN last_contacted_at + INTERVAL '336 hours' > now() THEN last_contacted_at + INTERVAL '336 hours'
    WHEN last_contacted_at + INTERVAL '504 hours' > now() THEN last_contacted_at + INTERVAL '504 hours'
    ELSE NULL
  END
WHERE status = 'follow_up';
