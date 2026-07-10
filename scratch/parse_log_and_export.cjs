const fs = require('fs');
const path = require('path');

// Read the log file
const logPath = 'C:\\Users\\T15\\.gemini\\antigravity-ide\\brain\\f19a65ef-23ec-465a-9999-5d0f97911037\\.system_generated\\tasks\\task-2379.log';
const content = fs.readFileSync(logPath, 'utf8');

// Find the JSON part
const boundaryIndex = content.indexOf('"rows": [');
if (boundaryIndex === -1) {
  console.error('Could not find rows array in log');
  process.exit(1);
}

// Extrapolate JSON by parsing the content from the start of rows to the end
const jsonStart = content.substring(content.indexOf('{'));
const parsed = JSON.parse(jsonStart.split('\n\n')[0]);
const leads = parsed.rows;

console.log('Total leads parsed:', leads.length);

function toCSVRow(cells) {
  return cells.map(c => {
    const s = String(c ?? '').replace(/"/g, '""');
    return `"${s}"`;
  }).join(',');
}

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

// Filter valid leads (at least one field has data)
const validLeads = leads.filter(l => {
  return EXPORT_FIELDS.some(field => {
    const val = field.getValue(l);
    return val !== null && val !== undefined && String(val).trim() !== '';
  });
});

console.log('Valid leads:', validLeads.length);

// Determine active columns (at least one lead has non-empty data)
const activeFields = EXPORT_FIELDS.filter(field => {
  return validLeads.some(l => {
    const val = field.getValue(l);
    return val !== null && val !== undefined && String(val).trim() !== '';
  });
});

const headers = activeFields.map(f => f.label);
console.log('Active Headers:', headers);

const rows = validLeads.map(l => {
  const rowValues = activeFields.map(field => field.getValue(l));
  return toCSVRow(rowValues);
});

const csv = [toCSVRow(headers), ...rows].join('\r\n');
fs.writeFileSync('scratch/exported_leads.csv', csv, 'utf8');
console.log('CSV Export saved to scratch/exported_leads.csv');
