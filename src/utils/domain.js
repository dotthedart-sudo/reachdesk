export const APP_DOMAIN = 'https://reachdeskcrm.com';
export const MARKETING_DOMAIN = 'https://reachdeskcrm.com';

/**
 * Checks if the current environment is running on local development.
 */
export function isLocalDev() {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  return (
    Boolean(import.meta.env.DEV) ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.')
  );
}

/**
 * Returns the URL for an app page route.
 * In local dev, returns relative path (e.g. '/signup').
 * In production, returns full app domain URL (e.g. 'https://reachdeskcrm.com/signup').
 */
export function getAppUrl(path = '') {
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  if (isLocalDev()) {
    return cleanPath || '/';
  }
  return `${APP_DOMAIN}${cleanPath}`;
}

/**
 * Returns the URL for a marketing page route.
 * In local dev, returns relative path (e.g. '/terms').
 * In production, returns full marketing domain URL (e.g. 'https://reachdeskcrm.com/terms').
 */
export function getMarketingUrl(path = '') {
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  if (isLocalDev()) {
    return cleanPath || '/';
  }
  return `${MARKETING_DOMAIN}${cleanPath}`;
}
