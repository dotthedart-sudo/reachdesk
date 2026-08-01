-- ReachDesk scheduled jobs (run once in Supabase SQL Editor)
-- Prerequisites: enable pg_cron + pg_net in Dashboard → Database → Extensions
--
-- Auth: edge functions accept service-role Bearer OR x-cron-secret header.
-- Set CRON_SECRET via: supabase secrets set CRON_SECRET=your-random-secret
-- Then store the same value for SQL cron (one-time):
--   ALTER DATABASE postgres SET app.settings.cron_secret TO 'your-random-secret';
--
-- Or use service role (Dashboard → Settings → API → service_role key):
--   ALTER DATABASE postgres SET app.settings.service_role_key TO 'eyJ...';

-- Remove existing jobs if re-running (idempotent)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'renew-google-calendar-watches',
  'cleanup-draft-invoices-daily',
  'send-reminder-notifications-15m'
);

-- Daily 3am: renew Google Calendar watch channels
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

-- Daily 3am: delete old draft invoices
SELECT cron.schedule(
  'cleanup-draft-invoices-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://efxgwqfdstrhrnnvtynl.supabase.co/functions/v1/cleanup-draft-invoices',
    headers := jsonb_build_object(
      'x-cron-secret', current_setting('app.settings.cron_secret', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Every 15 minutes: follow-up digest / instant push (reads leads.next_checkpoint_at)
SELECT cron.schedule(
  'send-reminder-notifications-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://efxgwqfdstrhrnnvtynl.supabase.co/functions/v1/send-reminder-notifications',
    headers := jsonb_build_object(
      'x-cron-secret', current_setting('app.settings.cron_secret', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify:
-- SELECT jobname, schedule, command FROM cron.job;
