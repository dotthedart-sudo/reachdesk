// Push notification push event — show the notification
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
    badge: '/android-chrome-192x192.png',
    tag: data.tag || 'reachdesk',
    data: { url: data.url || '/dashboard' },
    requireInteraction: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open or focus the app at the correct URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
