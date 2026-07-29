-- Per-lead IANA timezone for call-window guidance (optional; infer from phone when null)

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS timezone_source text
    CHECK (timezone_source IS NULL OR timezone_source IN ('manual', 'phone'));

COMMENT ON COLUMN public.leads.timezone IS
  'IANA timezone e.g. America/Chicago for lead local time and call-window badges.';
COMMENT ON COLUMN public.leads.timezone_source IS
  'manual = user set; phone = inferred from phone country code.';

CREATE INDEX IF NOT EXISTS idx_leads_timezone ON public.leads(timezone)
  WHERE timezone IS NOT NULL;
