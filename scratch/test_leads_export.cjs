const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

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

async function testExport() {
  const userId = 'f647945e-f1d3-42fd-b85b-2b2a92134fba'; // esemdot@gmail.com
  
  // We use supabase client to select all columns (using '*' to get top level urls like linkedin_url, website etc.)
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching leads:', error.message);
    return;
  }

  console.log(`Fetched ${leads.length} leads for esemdot@gmail.com.`);

  // Filter valid leads (at least one field has data)
  const validLeads = leads.filter(l => {
    return EXPORT_FIELDS.some(field => {
      const val = field.getValue(l);
      return val !== null && val !== undefined && String(val).trim() !== '';
    });
  });

  console.log(`Valid leads to export: ${validLeads.length} / ${leads.length}`);

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

  // Let's print a sample row to see how it maps
  if (validLeads.length > 0) {
    const sample = validLeads[0];
    console.log('\nSample Row Data:');
    activeFields.forEach(f => {
      console.log(`- ${f.label}: ${f.getValue(sample)}`);
    });
  }
}

testExport().catch(console.error);
