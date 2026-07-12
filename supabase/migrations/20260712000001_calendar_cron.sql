-- pg_cron: Daily renewal of Google Calendar watch channels
-- Run this in Supabase SQL Editor AFTER enabling pg_cron extension:
-- Dashboard → Database → Extensions → enable pg_cron
--
-- If on Supabase Free tier, pg_cron may not be available.
-- Alternative: use a cron service (cron-job.org, Render cron, etc.) to call:
--   POST https://efxgwqfdstrhrnnvtynl.supabase.co/functions/v1/renew-calendar-watches
--   Authorization: Bearer <service_role_key>

-- Uncomment and run if pg_cron is available:
/*
SELECT cron.schedule(
  'renew-google-calendar-watches',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://efxgwqfdstrhrnnvtynl.supabase.co/functions/v1/renew-calendar-watches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

-- Verify cron was scheduled:
-- SELECT * FROM cron.job;

-- To remove the cron job:
-- SELECT cron.unschedule('renew-google-calendar-watches');
