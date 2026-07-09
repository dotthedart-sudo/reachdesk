const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://efxgwqfdstrhrnnvtynl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGd3cWZkc3RyaHJubnZ0eW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzIzMzUsImV4cCI6MjA5NzAwODMzNX0.SIx6dg2axCiitN0NtUkh4Ho7ryreKWskVOQzFEY8-yc'
);

async function run() {
  console.log('Testing Invoices query...');
  const { data: invData, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('lead_id', 'e9ff77c0-49e8-428f-83d8-28f5277605f2')
    .order('created_at', { ascending: false });
  console.log('Invoices Result:', { data: !!invData, error: invErr });

  console.log('\nTesting Lead Activity query...');
  const { data: actData, error: actErr } = await supabase
    .from('lead_activity')
    .select('*')
    .eq('lead_id', 'e9ff77c0-49e8-428f-83d8-28f5277605f2')
    .order('created_at', { ascending: false });
  console.log('Lead Activity Result:', { data: !!actData, error: actErr });
}

run();
