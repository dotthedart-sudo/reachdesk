const REFRESH_FLAGS = ['chunk_error_reloaded', 'retry_lazy_reload'];

/** Clear deployment retry flags so the next load can attempt a clean boot. */
export function clearAppRefreshFlags() {
  REFRESH_FLAGS.forEach((key) => sessionStorage.removeItem(key));
}

/**
 * Hard refresh after deploys: clear stale caches, activate waiting SW, reload.
 * Used by the update banner, lazy chunk retry, and the error fallback screen.
 */
export async function forceAppRefresh({ clearFlags = true } = {}) {
  if (clearFlags) clearAppRefreshFlags();

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (err) {
    console.warn('[forceAppRefresh] cache clear failed:', err);
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    }
  } catch (err) {
    console.warn('[forceAppRefresh] service worker activation failed:', err);
  }

  window.location.reload();
}
