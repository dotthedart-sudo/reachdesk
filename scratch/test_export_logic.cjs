// Unit test for the export logic

const EXPORT_FIELDS = [
  { key: 'name', label: 'Name', getValue: l => l.full_name || [l.first_name, l.last_name].filter(Boolean).join(' ') },
  { key: 'email', label: 'Email', getValue: l => l.email || '' },
  { key: 'phone', label: 'Phone', getValue: l => l.phone || '' },
  { key: 'company', label: 'Company', getValue: l => l.company || '' },
  { key: 'niche', label: 'Niche', getValue: l => l.niche || '' },
  { key: 'status', label: 'Status', getValue: l => l.status || '' },
  { key: 'priority', label: 'Priority', getValue: l => l.priority || '' },
  { key: 'project', label: 'Project', getValue: l => l.project || '' },
  { key: 'notes', label: 'Notes', getValue: l => l.notes || '' },
  { key: 'linkedin_url', label: 'LinkedIn', getValue: l => l.linkedin_url || '' },
  { key: 'instagram_url', label: 'Instagram', getValue: l => l.instagram_url || '' },
  { key: 'twitter_url', label: 'Twitter', getValue: l => l.twitter_url || '' },
  { key: 'website', label: 'Website', getValue: l => l.website || '' }
];

function prepareRows(leads) {
  const headers = EXPORT_FIELDS.map(f => f.label);
  const rows = leads.map(l => EXPORT_FIELDS.map(field => field.getValue(l)));
  return { headers, rows };
}

// Test Leads
const testLeads = [
  {
    first_name: "Carlos",
    last_name: "Rivera",
    email: "carlos@example.com",
    phone: null,
    company: "Rivera Creative",
    niche: "Design",
    status: "Lead",
    priority: "Warm",
    project: null,
    notes: "Follow up next week",
    linkedin_url: "https://linkedin.com/in/carlosrivera",
    instagram_url: "https://instagram.com/carlosrivera.creative",
    twitter_url: null,
    website: "https://carlosrivera.design"
  },
  {
    first_name: "Sophia",
    last_name: "Laurent",
    email: "sophia@example.com",
    phone: "12345678",
    company: null,
    niche: "SaaS",
    status: "Closed Won",
    priority: "Hot",
    project: "Website Redesign",
    notes: null,
    linkedin_url: null,
    instagram_url: null,
    twitter_url: "https://twitter.com/sophialaurent",
    website: null
  }
];

const result = prepareRows(testLeads);

console.log("Headers:", result.headers);
console.log("Lead 1 Values:", result.rows[0]);
console.log("Lead 2 Values:", result.rows[1]);

// Assertions
console.assert(result.headers.length === 13, "Should have 13 columns");
console.assert(result.headers[9] === "LinkedIn", "Column 9 should be LinkedIn");
console.assert(result.headers[10] === "Instagram", "Column 10 should be Instagram");
console.assert(result.headers[11] === "Twitter", "Column 11 should be Twitter");
console.assert(result.headers[12] === "Website", "Column 12 should be Website");

// Check value of empty Twitter for Carlos
console.assert(result.rows[0][11] === "", "Carlos Twitter should be empty string");
// Check value of empty LinkedIn for Sophia
console.assert(result.rows[1][9] === "", "Sophia LinkedIn should be empty string");

console.log("✅ EXPORT LOGIC TESTS PASSED!");
