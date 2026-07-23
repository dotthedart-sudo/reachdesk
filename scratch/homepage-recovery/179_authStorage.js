/**
 * Cross-subdomain Supabase auth storage for reachdeskcrm.com + app.reachdeskcrm.com.
 * Uses shared cookies in production; localStorage in local dev.
 */

const COOKIE_DOMAIN = '.reachdeskcrm.com';
const MAX_CHUNK_LEN = 3800;

function useSharedCookies() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'reachdeskcrm.com' || host.endsWith('.reachdeskcrm.com');
}

function cookieFlags() {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  return `; domain=${COOKIE_DOMAIN}; path=/; SameSite=Lax${secure}`;
}

function readCookie(name) {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function writeCookie(name, value, maxAgeSec) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSec}${cookieFlags()}`;
}

function deleteCookie(name) {
  document.cookie = `${name}=; max-age=0${cookieFlags()}`;
}

function readChunked(key) {
  const chunkCount = readCookie(`${key}__chunks`);
  if (chunkCount) {
    const count = parseInt(chunkCount, 10);
    if (!Number.isFinite(count) || count < 1) return null;
    let value = '';
    for (let i = 0; i < count; i += 1) {
      const chunk = readCookie(`${key}__c${i}`);
      if (chunk == null) return null;
      value += chunk;
    }
    return value;
  }
  return readCookie(key);
}

function writeChunked(key, value, maxAgeSec = 60 * 60 * 24 * 365) {
  clearChunked(key);
  if (value.length <= MAX_CHUNK_LEN) {
    writeCookie(key, value, maxAgeSec);
    return;
  }
  const chunks = Math.ceil(value.length / MAX_CHUNK_LEN);
  for (let i = 0; i < chunks; i += 1) {
    writeCookie(`${key}__c${i}`, value.slice(i * MAX_CHUNK_LEN, (i + 1) * MAX_CHUNK_LEN), maxAgeSec);
  }
  writeCookie(`${key}__chunks`, String(chunks), maxAgeSec);
}

function clearChunked(key) {
  deleteCookie(key);
  const chunkCount = readCookie(`${key}__chunks`);
  if (chunkCount) {
    const count = parseInt(chunkCount, 10);
    if (Number.isFinite(count)) {
      for (let i = 0; i < count; i += 1) deleteCookie(`${key}__c${i}`);
    }
  }
  deleteCookie(`${key}__chunks`);
}

const localStorageAdapter = {
  getItem(key) {
    return window.localStorage.getItem(key);
  },
  setItem(key, value) {
    window.localStorage.setItem(key, value);
  },
  removeItem(key) {
    window.localStorage.removeItem(key);
  },
};

const cookieAdapter = {
  getItem(key) {
    const fromCookie = readChunked(key);
    if (fromCookie != null) return fromCookie;

    // One-time migration from origin-scoped localStorage (pre–cross-domain auth).
    try {
      const legacy = window.localStorage.getItem(key);
      if (legacy != null) {
        writeChunked(key, legacy);
        window.localStorage.removeItem(key);
        return legacy;
      }
    } catch {
      /* ignore */
    }
    return null;
  },
  setItem(key, value) {
    writeChunked(key, value);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  removeItem(key) {
    clearChunked(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/** Supabase-compatible storage — shared cookies on *.reachdeskcrm.com, else localStorage. */
export const crossSubdomainAuthStorage = useSharedCookies() ? cookieAdapter : localStorageAdapter;
