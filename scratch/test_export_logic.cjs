const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://efxgwqfdstrhrnnvtynl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGd3cWZkc3RyaHJubnZ0eW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzIzMzUsImV4cCI6MjA5NzAwODMzNX0.SIx6dg2axCiitN0NtUkh4Ho7ryreKWskVOQzFEY8-yc'
);

async function run() {
  const userId = 'f647945e-f1d3-42fd-b85b-2b2a92134fba'; // esemdot
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  console.log('Leads fetched:', leads.length);
  
  const EXPORT_FIELDS = [
    { key: 'name', label: 'Name', getValue: l => l.full_name || [l.first_name, l.last_name].filter(Boolean).join(' ') },
    { key: 'email', label: 'Email', getValue: l => l.email },
    { key: 'phone', label: 'Phone', getValue: l => l.phone },
    { key: 'company', label: 'Company', getValue: l => l.company },
    { key: 'niche', label: 'Niche', getValue: l => l.niche },
    { key: 'status', label: 'Status', getValue: l => l.status },
    { key: 'priority', label: 'Priority', getValue: l => l.priority },
    { key: 'project', label: 'Project', getValue: l => l.project },
    { key: 'notes', label: 'Notes', getValue: l => l.notes },
    { key: 'links', label: 'Links', getValue: l => {
        const parts = [];
        if (l.linkedin_url) parts.push(`LinkedIn: ${l.linkedin_url}`);
        if (l.instagram_url) parts.push(`Instagram: ${l.instagram_url}`);
        if (l.twitter_url) parts.push(`Twitter: ${l.twitter_url}`);
        if (l.website) parts.push(`Website: ${l.website}`);
        if (Array.isArray(l.custom_fields?.links)) {
          l.custom_fields.links.forEach(lk => {
            if (typeof lk === 'string') parts.push(lk);
            else if (lk && lk.url) parts.push(`${lk.label || 'Link'}: ${lk.url}`);
          });
        }
        return parts.join('; ');
      }
    }
  ];

  const validLeads = leads.filter(l => {
    return EXPORT_FIELDS.some(field => {
      const val = field.getValue(l);
      return val !== null && val !== undefined && String(val).trim() !== '';
    });
  });

  const activeFields = EXPORT_FIELDS.filter(field => {
    return validLeads.some(l => {
      const val = field.getValue(l);
      return val !== null && val !== undefined && String(val).trim() !== '';
    });
  });

  const headers = activeFields.map(f => f.label);
  console.log('Headers:', headers);
  
  // Show first 5 rows
  const rows = validLeads.slice(0, 5).map(l => {
    return activeFields.map(field => `${field.label}: ${field.getValue(l)}`);
  });
  console.log('Sample Data Rows:', rows);
}

run();
