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
        gapi.load('picker', {
          callback: () => {
            if (window.google && window.google.picker) {
              resolve();
            } else {
              reject(new Error('Google Picker library failed to initialize.'));
            }
          },
          onerror: () => reject(new Error('Failed to load Google Picker module.')),
          timeout: 5000,
          ontimeout: () => reject(new Error('Timed out loading Google Picker module.')),
        });
      })
      .catch(reject);
  });
}

/**
 * Requests a fresh access token from Supabase Edge Function and opens the Google Picker
 */
export async function openSheetsPicker({ onSelect, onCancel, onError }) {
  try {
    // 1. Fetch fresh access token right before opening
    const { data, error } = await supabase.functions.invoke('get-sheets-access-token');
    
    if (error) throw error;
    if (!data?.access_token) {
      throw new Error('Could not retrieve a valid Google Sheets access token. Please reconnect.');
    }

    const accessToken = data.access_token;

    // 2. Load the Picker library
    await loadPickerModule();

    // 3. Build and display the picker
    const picker = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.SPREADSHEETS)
      .setOAuthToken(accessToken)
      .setDeveloperKey(import.meta.env.VITE_GOOGLE_PICKER_API_KEY)
      .setCallback((result) => {
        if (result.action === window.google.picker.Action.PICKED) {
          const doc = result.docs[0];
          if (doc) {
            onSelect({ id: doc.id, name: doc.name || doc.title });
          } else {
            if (onError) onError(new Error('No document was selected.'));
          }
        } else if (result.action === window.google.picker.Action.CANCEL) {
          if (onCancel) onCancel();
        }
      })
      .build();

    picker.setVisible(true);
    
    // Position the picker on top of any bootstrap or styled modals
    const pickerEl = document.querySelector('.picker-dialog-bg');
    if (pickerEl) {
      pickerEl.style.zIndex = '200000';
    }
  } catch (err) {
    console.error('[googlePicker] Error opening picker:', err);
    if (onError) onError(err);
  }
}
