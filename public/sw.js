// Banjii Service Worker for Background Web Push & PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for incoming Web Push notifications (Delivered even when app is closed / killed)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Banjii Reminder 🔔', body: event.data.text() };
    }
  }

  const title = data.title || 'Banjii — Smart Money Flow';
  const options = {
    body: data.body || 'You have an upcoming recurring bill alert.',
    icon: data.icon || '/banjii-icon.svg',
    badge: data.badge || '/banjii-icon.svg',
    tag: data.tag || 'banjii-bill-alert',
    renotify: true,
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification tap / click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.registration.scope)) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle in-app messages to trigger reliable notifications on iOS Safari
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      icon: '/banjii-icon.svg',
      badge: '/banjii-icon.svg',
      ...options,
    });
  }
});
