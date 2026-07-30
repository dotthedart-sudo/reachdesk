-- Allow user-defined pipeline statuses stored in custom_statuses.
-- The fixed valid_status enum blocked PATCH when selecting custom labels.

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS valid_status;
