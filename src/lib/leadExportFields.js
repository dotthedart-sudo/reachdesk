import { getLeadLocalTime, getLeadTimezone } from './leadTimezone';

const BASE_EXPORT_FIELDS = [
  { key: 'name', label: 'Name', getValue: (l) => l.full_name || [l.first_name, l.last_name].filter(Boolean).join(' ') },
  { key: 'email', label: 'Email', getValue: (l) => l.email || '' },
  { key: 'phone', label: 'Phone', getValue: (l) => l.phone || '' },
  { key: 'company', label: 'Company', getValue: (l) => l.company || '' },
  { key: 'niche', label: 'Niche', getValue: (l) => l.niche || '' },
  { key: 'status', label: 'Status', getValue: (l) => l.status || '' },
  { key: 'priority', label: 'Priority', getValue: (l) => l.priority || '' },
  { key: 'project', label: 'Project', getValue: (l) => l.project || '' },
  { key: 'notes', label: 'Notes', getValue: (l) => l.notes || '' },
  { key: 'linkedin_url', label: 'LinkedIn', getValue: (l) => l.linkedin_url || '' },
  { key: 'instagram_url', label: 'Instagram', getValue: (l) => l.instagram_url || '' },
  { key: 'twitter_url', label: 'Twitter', getValue: (l) => l.twitter_url || '' },
  { key: 'website', label: 'Website', getValue: (l) => l.website || '' },
];

export function buildLeadExportFields({ includeLocalTime = false, defaultCountryCode = '+92' } = {}) {
  const fields = [...BASE_EXPORT_FIELDS];
  if (includeLocalTime) {
    fields.push(
      {
        key: 'timezone',
        label: 'Timezone',
        getValue: (l) => getLeadTimezone(l, defaultCountryCode) || l.timezone || '',
      },
      {
        key: 'lead_local_time',
        label: 'Lead local time',
        getValue: (l) => getLeadLocalTime(l, new Date(), defaultCountryCode) || '',
      },
    );
  }
  return fields;
}

export function prepareLeadExportRows(leads, options = {}) {
  const fields = buildLeadExportFields(options);
  const validLeads = (leads || []).filter((l) =>
    fields.some((field) => {
      const val = field.getValue(l);
      return val !== null && val !== undefined && String(val).trim() !== '';
    }),
  );

  if (validLeads.length === 0) {
    throw new Error('No leads found with exportable data.');
  }

  const headers = fields.map((f) => f.label);
  const rows = validLeads.map((l) => fields.map((field) => field.getValue(l)));
  return { headers, rows, validLeads };
}
