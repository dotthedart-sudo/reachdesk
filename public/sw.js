// Push notification handler — all options required for lock screen display
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('[Service Worker] Failed to parse push payload:', e);
  }

  const title = data.title || 'ReachDesk CRM';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag: data.tag || 'reachdesk-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: data.url || 'https://app.reachdeskcrm.com' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open or focus the app at the correct URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || 'https://app.reachdeskcrm.com';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an already-open tab first
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Focus any open ReachDesk tab (in case URL differs but same origin)
      for (const client of clientList) {
        if (client.url.includes('app.reachdeskcrm.com') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // No existing tab — open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// App lifecycle listeners
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
