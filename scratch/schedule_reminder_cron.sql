-- Schedule send-reminder-notifications every 15 minutes
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'send-reminder-notifications-15m';

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

SELECT jobname, schedule FROM cron.job WHERE jobname = 'send-reminder-notifications-15m';
