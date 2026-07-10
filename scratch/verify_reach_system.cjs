const { normalizePhoneNumber, generatePrefilledUrl } = require('../src/utils/templateMerge.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- STARTING PHONE NORMALIZATION & PREFILL TESTS ---');

// Test 1: Normalizing local Pakistan number (starts with 0)
const n1 = normalizePhoneNumber('03453232523', '+92');
assert(n1.normalized === '+923453232523', `Expected +923453232523, got: ${n1.normalized}`);
assert(n1.isValid === true, 'Expected valid number status');
assert(n1.error === null, 'Expected no error message');

// Test 2: Normalizing number with parentheses, spaces, dashes
const n2 = normalizePhoneNumber(' (0345) 323-2523 ', '+92');
assert(n2.normalized === '+923453232523', `Expected +923453232523, got: ${n2.normalized}`);
assert(n2.isValid === true, 'Expected valid status');

// Test 3: Already starting with '+' and has spaces
const n3 = normalizePhoneNumber(' +92 345 3232523 ', '+92');
assert(n3.normalized === '+923453232523', `Expected +923453232523, got: ${n3.normalized}`);
assert(n3.isValid === true, 'Expected valid status');

// Test 4: Too short number (invalid length warning)
const n4 = normalizePhoneNumber('12345', '+92');
assert(n4.isValid === false, 'Expected invalid status for 12345');
assert(n4.error && n4.error.includes('length is invalid'), `Expected invalid length error message, got: ${n4.error}`);

// Test 5: US number normalization with US default country code
const n5 = normalizePhoneNumber('555 123 4567', '+1');
assert(n5.normalized === '+15551234567', `Expected +15551234567, got: ${n5.normalized}`);
assert(n5.isValid === true, 'Expected valid status');

// Test 6: WhatsApp prefilled URL generation (no leading + inside wa.me path)
const w1 = generatePrefilledUrl('whatsapp', 'whatsapp', { phone: '03453232523' }, '', 'Hello John', '+92');
assert(w1.url === 'https://wa.me/923453232523?text=Hello%20John', `Expected wa.me url format, got: ${w1.url}`);
assert(w1.warning === null, 'Expected no warning');

// Test 7: WhatsApp invalid number warning propagation
const w2 = generatePrefilledUrl('whatsapp', 'whatsapp', { phone: '123' }, '', 'Hello', '+92');
assert(w2.warning && w2.warning.includes('length is invalid'), `Expected warning in return value, got: ${w2.warning}`);

// Test 8: SMS prefilled URL generation (universal format)
const s1 = generatePrefilledUrl('sms', 'sms', { phone: '03453232523' }, '', 'Hello John', '+92');
assert(s1.url.startsWith('sms:+923453232523'), `Expected sms protocol prefix, got: ${s1.url}`);
assert(s1.url.includes('body=Hello%20John'), `Expected URL encoded body, got: ${s1.url}`);

// Test 9: Email Gmail web destination
const e1 = generatePrefilledUrl('email', 'gmail', { email: 'test@example.com' }, 'Inquiry', 'Hello message');
assert(e1.url.includes('mail.google.com/mail/?view=cm&fs=1'), `Expected Gmail compose url with fs=1, got: ${e1.url}`);
assert(e1.url.includes('to=test%40example.com'), `Expected encoded email in Gmail URL, got: ${e1.url}`);

console.log('--- ALL PHONE & PREFILL VERIFICATION TESTS COMPLETED SUCCESSFULLY ---');
