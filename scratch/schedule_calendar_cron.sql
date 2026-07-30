-- Requires: ALTER DATABASE postgres SET app.settings.cron_secret TO 'same-as-CRON_SECRET';
-- See scratch/setup_cron.sql for full idempotent setup.
SELECT cron.schedule(
  'renew-google-calendar-watches',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://efxgwqfdstrhrnnvtynl.supabase.co/functions/v1/renew-calendar-watches',
    headers := jsonb_build_object(
      'x-cron-secret', current_setting('app.settings.cron_secret', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
