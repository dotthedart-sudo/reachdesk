const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Convert a URL-safe base64 string to a Uint8Array for the applicationServerKey.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register the service worker, request notification permission,
 * subscribe to push, and save the subscription to Supabase.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<boolean>} true if subscribed successfully
 */
export async function subscribeToPush(supabase, userId) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] Push notifications not supported in this browser.');
      return false;
    }

    if (window.Notification && window.Notification.permission === 'denied') {
      console.log('[Push] Notification permission is denied.');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] VITE_VAPID_PUBLIC_KEY not set — skipping push subscription.');
      return false;
    }

    // Register / get the service worker registration
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch {
      // May already be registered — try to get the existing one
      registration = await navigator.serviceWorker.ready;
    }

    // Wait for the SW to be active
    await navigator.serviceWorker.ready;

    // Request permission (noop if already granted/denied)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Notification permission not granted:', permission);
      return false;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { endpoint, keys } = subscription.toJSON();

    // Check if this exact endpoint is already saved for this user
    const { data: existing, error: checkErr } = await supabase
      .from('push_subscriptions')
      .select('id, p256dh')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (checkErr) {
      console.warn('[Push] Could not check existing subscription:', checkErr);
    }

    // Only upsert if no existing row or keys have changed
    const keysChanged = !existing || existing.p256dh !== keys.p256dh;
    if (keysChanged) {
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) {
        console.error('[Push] Failed to save subscription:', error);
        return false;
      }
      console.log('[Push] Subscription saved successfully.');
    } else {
      console.log('[Push] Subscription already up-to-date, skipping upsert.');
    }

    return true;
  } catch (err) {
    console.error('[Push] subscribeToPush error:', err);
    return false;
  }
}
