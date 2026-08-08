/** Google Sheets OAuth — drive.file (non-sensitive) for Picker-selected files. */
export const GOOGLE_SHEETS_OAUTH_SCOPE_LIST = [
  'https://www.googleapis.com/auth/drive.file',
];

/** Space-delimited scope string for Google OAuth authorize URL. */
export const GOOGLE_SHEETS_OAUTH_SCOPES = GOOGLE_SHEETS_OAUTH_SCOPE_LIST.join(' ');

const FORBIDDEN_SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function assertSheetsOAuthScopes() {
  for (const forbidden of FORBIDDEN_SHEETS_SCOPES) {
    if (GOOGLE_SHEETS_OAUTH_SCOPE_LIST.includes(forbidden)) {
      throw new Error(`Forbidden Google Sheets OAuth scope: ${forbidden}`);
    }
  }
}

assertSheetsOAuthScopes();

/** localStorage key: user completed OAuth after the drive.file scope switch. */
export const SHEETS_SCOPE_ACK_KEY = 'reachdesk_sheets_scope_drive_file_v1';

export function hasSheetsScopeAck() {
  try {
    return localStorage.getItem(SHEETS_SCOPE_ACK_KEY) === '1';
  } catch {
    return false;
  }
}

export function markSheetsScopeAck() {
  try {
    localStorage.setItem(SHEETS_SCOPE_ACK_KEY, '1');
  } catch {
    /* private mode / blocked storage */
  }
}

export function clearSheetsScopeAck() {
  try {
    localStorage.removeItem(SHEETS_SCOPE_ACK_KEY);
  } catch {
    /* ignore */
  }
}

/** True when Sheets is connected but user hasn't re-authorized with drive.file. */
export function needsSheetsReconnect(isConnected) {
  return !!isConnected && !hasSheetsScopeAck();
}

/**
 * Start Google Sheets OAuth (CSRF state + consent).
 * @param {string} [originPath] Where to return after connect (used by callback).
 */
export function startGoogleSheetsOAuth(originPath) {
  const state = crypto.randomUUID();
  sessionStorage.setItem('google_sheets_oauth_state', state);
  sessionStorage.setItem(
    'google_sheets_oauth_origin',
    originPath || `${window.location.pathname}${window.location.search}`,
  );
  const clientId = import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID;
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth/google-sheets/callback`);
  const scope = encodeURIComponent(GOOGLE_SHEETS_OAUTH_SCOPES);
  window.location.href = [
    'https://accounts.google.com/o/oauth2/v2/auth',
    `?client_id=${clientId}`,
    `&redirect_uri=${redirectUri}`,
    '&response_type=code',
    `&scope=${scope}`,
    '&access_type=offline',
    '&prompt=consent',
    `&state=${state}`,
  ].join('');
}
