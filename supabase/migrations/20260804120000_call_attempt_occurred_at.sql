-- Per-attempt occurred time for backfilled outreach logs

ALTER TABLE public.lead_call_attempts
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz;

UPDATE public.lead_call_attempts
SET occurred_at = created_at
WHERE occurred_at IS NULL;

ALTER TABLE public.lead_call_attempts
  ALTER COLUMN occurred_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_lead_call_attempts_user_occurred
  ON public.lead_call_attempts(user_id, occurred_at DESC);
