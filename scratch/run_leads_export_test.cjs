const { execSync } = require('child_process');

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

function run() {
  const userId = 'f647945e-f1d3-42fd-b85b-2b2a92134fba'; // esemdot@gmail.com
  console.log(`Running supabase db query to fetch leads for ${userId}...`);
  
  const stdout = execSync(
    `npx supabase db query --linked "SELECT json_agg(leads) as leads_list FROM leads WHERE user_id = '${userId}';"`
  ).toString();

  // Find JSON start
  const jsonStartIdx = stdout.indexOf('{');
  if (jsonStartIdx === -1) {
    console.error('Could not find query output JSON block.');
    return;
  }

  const resultObj = JSON.parse(stdout.slice(jsonStartIdx));
  const leads = resultObj.rows[0].leads_list || [];

  console.log(`\nSuccessfully loaded ${leads.length} leads in memory.`);

  // Filter valid leads (at least one field has data)
  const validLeads = leads.filter(l => {
    return EXPORT_FIELDS.some(field => {
      const val = field.getValue(l);
      return val !== null && val !== undefined && String(val).trim() !== '';
    });
  });

  console.log(`Valid leads: ${validLeads.length} / ${leads.length}`);

  // Determine which columns have data across all valid leads
  const activeFields = EXPORT_FIELDS.filter(field => {
    return validLeads.some(l => {
      const val = field.getValue(l);
      return val !== null && val !== undefined && String(val).trim() !== '';
    });
  });

  const headers = activeFields.map(f => f.label);
  console.log('\n--- ACTIVE COLUMNS TO BE EXPORTED ---');
  console.log(headers.join(', '));
  console.log('-------------------------------------');

  console.log('\nField presence counts across leads:');
  EXPORT_FIELDS.forEach(f => {
    const count = validLeads.filter(l => {
      const val = f.getValue(l);
      return val !== null && val !== undefined && String(val).trim() !== '';
    }).length;
    console.log(`- ${f.label}: ${count} leads have this filled (out of ${validLeads.length})`);
  });
}

run();
