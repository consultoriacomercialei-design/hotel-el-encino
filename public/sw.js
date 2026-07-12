/* Service Worker — Hotel El Encino Push Notifications */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { return; }

  const title   = data.title  || 'Hotel El Encino — Directorio';
  const options = {
    body:   data.body  || 'Tienes una nueva actividad en tu anuncio.',
    icon:   data.icon  || '/logo.png',
    badge:  '/logo.png',
    tag:    data.tag   || 'encino-push',
    renotify: true,
    requireInteraction: false,
    data:   { url: data.url || '/mi-negocio' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/mi-negocio';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
