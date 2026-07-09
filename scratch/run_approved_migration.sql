-- Approved Status Migration

-- 1. Waiting -> Followed up
UPDATE leads
SET status = 'Followed up'
WHERE status = 'Waiting';

-- 2. Follow Up -> Followed up
UPDATE leads
SET status = 'Followed up'
WHERE status = 'Follow Up';

-- 3. Call Booked -> Booked
UPDATE leads
SET status = 'Booked'
WHERE status = 'Call Booked';

-- 4. No Show -> Followed up (for esemdot)
UPDATE leads
SET status = 'Followed up'
WHERE status = 'No Show' AND user_id = 'f647945e-f1d3-42fd-b85b-2b2a92134fba';
