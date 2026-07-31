-- Separate call result status from messaging pipeline status.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS call_status text;

ALTER TABLE public.custom_statuses
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'messaging';

UPDATE public.custom_statuses
SET channel = 'messaging'
WHERE channel IS NULL OR channel = '';

ALTER TABLE public.custom_statuses
  DROP CONSTRAINT IF EXISTS custom_statuses_channel_check;

ALTER TABLE public.custom_statuses
  ADD CONSTRAINT custom_statuses_channel_check
  CHECK (channel IN ('messaging', 'calls'));

-- Replace label-only uniqueness with per-channel uniqueness (case-insensitive).
DROP INDEX IF EXISTS custom_statuses_user_id_label_key;
DROP INDEX IF EXISTS custom_statuses_user_label_unique;
DROP INDEX IF EXISTS custom_statuses_user_channel_label_unique;

CREATE UNIQUE INDEX custom_statuses_user_channel_label_unique
  ON public.custom_statuses (user_id, channel, lower(label));
