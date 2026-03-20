// FoodieRadar Khordha — Push Notification Handler
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'FoodieRadar Khordha';
  const options = {
    body:    data.body  || 'New food update!',
    icon:    data.icon  || '/favicon.svg',
    badge:   '/favicon.svg',
    data:    { url: data.url || '/' },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.openWindow(url));
});