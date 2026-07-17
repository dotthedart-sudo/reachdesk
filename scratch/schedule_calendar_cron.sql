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
