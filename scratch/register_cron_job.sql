SELECT cron.schedule(
  'cleanup-draft-invoices-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url:='https://efxgwqfdstrhrnnvtynl.supabase.co/functions/v1/cleanup-draft-invoices',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGd3cWZkc3RyaHJubnZ0eW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzIzMzUsImV4cCI6MjA5NzAwODMzNX0.SIx6dg2axCiitN0NtUkh4Ho7ryreKWskVOQzFEY8-yc"}'::jsonb
  );
  $$
);
