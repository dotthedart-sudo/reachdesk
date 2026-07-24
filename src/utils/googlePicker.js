import { supabase } from '../lib/supabase';

/**
 * Dynamically loads the Google API Client library (gapi)
 */
export function loadGapi() {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve(window.gapi);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.gapi) {
        resolve(window.gapi);
      } else {
        reject(new Error('Google API Client (gapi) failed to load.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Google API script.'));
    document.body.appendChild(script);
  });
}

/**
 * Loads the picker module within the Google API Client
 */
export function loadPickerModule() {
  return new Promise((resolve, reject) => {
    loadGapi()
      .then((gapi) => {
        if (window.google?.picker) {
          resolve();
          return;
        }
        gapi.load('picker', {
          callback: () => {
            if (window.google?.picker) {
              resolve();
            } else {
              reject(new Error('Google Picker library failed to initialize.'));
            }
          },
          onerror: () => reject(new Error('Failed to load Google Picker module.')),
          timeout: 10000,
          ontimeout: () => reject(new Error('Timed out loading Google Picker module.')),
        });
      })
      .catch(reject);
  });
}

/** Google Picker injects dialog nodes async — keep them above our modals. */
function ensurePickerOnTop() {
  const PICKER_Z = '2147483000';

  const bump = () => {
    document.querySelectorAll('.picker-dialog-bg, .picker-dialog, .picker').forEach((el) => {
      el.style.setProperty('z-index', PICKER_Z, 'important');
    });
  };

  bump();
  const timers = [0, 50, 100, 250, 500, 1000, 2000].map((ms) => setTimeout(bump, ms));
  const observer = new MutationObserver(bump);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    timers.forEach(clearTimeout);
  };
}

function getPickerAppId() {
  const explicit = import.meta.env.VITE_GOOGLE_APP_ID || import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_NUMBER;
  if (explicit) return String(explicit);

  const clientId =
    import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '';
  // OAuth client IDs are typically `{projectNumber}-{hash}.apps.googleusercontent.com`
  const match = String(clientId).match(/^(\d+)-/);
  return match ? match[1] : '';
}

/**
 * Requests a fresh access token from Supabase Edge Function and opens the Google Picker
 */
export async function openSheetsPicker({ onSelect, onCancel, onError, onOpen }) {
  let stopZIndexWatch = null;

  try {
    const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;
    if (!apiKey) {
      throw new Error('Google Picker API key is missing. Set VITE_GOOGLE_PICKER_API_KEY and rebuild.');
    }

    // 1. Fetch fresh access token right before opening
    const { data, error } = await supabase.functions.invoke('get-sheets-access-token');

    if (error) {
      let detail = error.message || 'Could not get Google access token.';
      try {
        const body = await error.context?.json?.();
        if (body?.error) detail = body.error;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    if (data?.error) throw new Error(data.error);
    if (!data?.access_token) {
      throw new Error('Could not retrieve a valid Google Sheets access token. Please reconnect Google Sheets in Configuration.');
    }

    const accessToken = data.access_token;

    // 2. Load the Picker library
    await loadPickerModule();

    // 3. Build and display the picker above app modals
    const builder = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.SPREADSHEETS)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setOrigin(window.location.origin)
      .setCallback((result) => {
        if (result.action === window.google.picker.Action.PICKED) {
          if (typeof stopZIndexWatch === 'function') stopZIndexWatch();
          const doc = result.docs?.[0];
          if (doc) {
            onSelect({ id: doc.id, name: doc.name || doc.title });
          } else if (onError) {
            onError(new Error('No document was selected.'));
          }
        } else if (result.action === window.google.picker.Action.CANCEL) {
          if (typeof stopZIndexWatch === 'function') stopZIndexWatch();
          if (onCancel) onCancel();
        }
      });

    const appId = getPickerAppId();
    if (appId) builder.setAppId(appId);

    const picker = builder.build();
    stopZIndexWatch = ensurePickerOnTop();
    picker.setVisible(true);
    ensurePickerOnTop();

    if (onOpen) onOpen();
  } catch (err) {
    if (typeof stopZIndexWatch === 'function') stopZIndexWatch();
    console.error('[googlePicker] Error opening picker:', err);
    if (onError) onError(err);
  }
}
