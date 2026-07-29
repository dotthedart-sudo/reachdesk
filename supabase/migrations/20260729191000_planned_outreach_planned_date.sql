-- Stable calendar date for planned outreach (avoids day shift when user travels)

ALTER TABLE public.planned_outreach_tasks
  ADD COLUMN IF NOT EXISTS planned_date date;

-- Backfill using owner profile timezone when set, else UTC
UPDATE public.planned_outreach_tasks t
SET planned_date = (t.planned_at AT TIME ZONE COALESCE(NULLIF(TRIM(p.timezone), ''), 'UTC'))::date
FROM public.user_profiles p
WHERE p.id = t.user_id
  AND t.planned_date IS NULL;

UPDATE public.planned_outreach_tasks
SET planned_date = (planned_at AT TIME ZONE 'UTC')::date
WHERE planned_date IS NULL;

ALTER TABLE public.planned_outreach_tasks
  ALTER COLUMN planned_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_planned_outreach_tasks_user_planned_date
  ON public.planned_outreach_tasks(user_id, planned_date);
