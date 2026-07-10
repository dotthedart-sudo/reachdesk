const { mergeTemplateFields } = require('../src/utils/templateMerge.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

const mockLead = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  company: 'Doe Enterprises',
  niche: 'Web Development',
  phone: '+123456789',
  status: 'Lead',
  priority: 'high',
  custom_fields: {
    linkedin_url: 'https://linkedin.com/in/johndoe',
    years_in_business: '5'
  }
};

const mockSnippets = [
  { snippet_key: 'my_calendly', snippet_value: 'https://calendly.com/johndoe' },
  { snippet_key: 'sign_off', snippet_value: 'Kind regards, John Doe' }
];

const mockColumnDefs = [
  { column_key: 'linkedin_url', is_default: false, column_label: 'LinkedIn' },
  { column_key: 'years_in_business', is_default: false, column_label: 'Years' }
];

console.log('--- STARTING VERIFICATION TESTS ---');

// Test 1: Naming combination [Name] or [name]
const t1_out1 = mergeTemplateFields('Hi [Name],', mockLead, mockSnippets, mockColumnDefs);
assert(t1_out1 === 'Hi John Doe,', `Expected 'Hi John Doe,', got: '${t1_out1}'`);

const t1_out2 = mergeTemplateFields('Hi [name],', mockLead, mockSnippets, mockColumnDefs);
assert(t1_out2 === 'Hi John Doe,', `Expected 'Hi John Doe,', got: '${t1_out2}'`);

// Test 2: Standard field replacements
const t2_out = mergeTemplateFields('Reach out to [company] regarding [niche] or call [phone].', mockLead, mockSnippets, mockColumnDefs);
assert(t2_out === 'Reach out to Doe Enterprises regarding Web Development or call +123456789.', `Expected correct standard replacement, got: '${t2_out}'`);

// Test 3: Custom columns replacement
const t3_out = mergeTemplateFields('Check out [linkedin_url], in business for [years_in_business] years.', mockLead, mockSnippets, mockColumnDefs);
assert(t3_out === 'Check out https://linkedin.com/in/johndoe, in business for 5 years.', `Expected correct custom columns replacement, got: '${t3_out}'`);

// Test 4: User static snippets replacement
const t4_out = mergeTemplateFields('Schedule a call: [my_calendly]\n[sign_off]', mockLead, mockSnippets, mockColumnDefs);
assert(t4_out === 'Schedule a call: https://calendly.com/johndoe\nKind regards, John Doe', `Expected static snippets replacement, got: '${t4_out}'`);

// Test 5: Case-insensitivity check
const t5_out = mergeTemplateFields('Hi [NAME], niche is [NICHE], calendly [My_CaLeNdLy]', mockLead, mockSnippets, mockColumnDefs);
assert(t5_out === 'Hi John Doe, niche is Web Development, calendly https://calendly.com/johndoe', `Expected case-insensitive replacement, got: '${t5_out}'`);

// Test 6: Undefined placeholder fallback
const t6_out = mergeTemplateFields('Hi [Name], [Typo] placeholder stays literal.', mockLead, mockSnippets, mockColumnDefs);
assert(t6_out === 'Hi John Doe, [Typo] placeholder stays literal.', `Expected undefined placeholders to stay literal, got: '${t6_out}'`);

// Test 7: Double braces {{key}} format support (for starter templates compatibility)
const t7_out = mergeTemplateFields('Hi {{name}}, welcome to {{company}}.', mockLead, mockSnippets, mockColumnDefs);
assert(t7_out === 'Hi John Doe, welcome to Doe Enterprises.', `Expected double braces formatting support, got: '${t7_out}'`);

console.log('--- ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY ---');
