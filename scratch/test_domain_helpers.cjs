// Node test to verify domain.js logic simulation
const { APP_DOMAIN, MARKETING_DOMAIN } = require('../src/utils/domain.js');

console.log('APP_DOMAIN:', APP_DOMAIN);
console.log('MARKETING_DOMAIN:', MARKETING_DOMAIN);

function simulateGetAppUrl(hostname, path = '') {
  const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  if (isDev) return cleanPath || '/';
  return `${APP_DOMAIN}${cleanPath}`;
}

function simulateGetMarketingUrl(hostname, path = '') {
  const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  if (isDev) return cleanPath || '/';
  return `${MARKETING_DOMAIN}${cleanPath}`;
}

console.log('\n--- Localhost Testing ---');
console.log('getAppUrl(/signup):', simulateGetAppUrl('localhost', '/signup'));
console.log('getMarketingUrl(/terms):', simulateGetMarketingUrl('localhost', '/terms'));

console.log('\n--- Marketing Domain Production Testing ---');
console.log('getAppUrl(/signup):', simulateGetAppUrl('reachdeskcrm.com', '/signup'));
console.log('getMarketingUrl(/terms):', simulateGetMarketingUrl('reachdeskcrm.com', '/terms'));

console.log('\n--- App Domain Production Testing ---');
console.log('getAppUrl(/dashboard):', simulateGetAppUrl('app.reachdeskcrm.com', '/dashboard'));
console.log('getMarketingUrl(/homepage):', simulateGetMarketingUrl('app.reachdeskcrm.com', '/homepage'));
