const CACHE_NAME = 'gradeup-nil-v1';
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/icon-192.svg',
  '/icon-512.svg',
  '/favicon.svg',
  '/logo-icon.svg',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip Next.js internal routes and API routes
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match('/offline')))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'GradeUp NIL', body: 'New notification' };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // If JSON parsing fails, try to get text
    if (event.data) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.svg',
    badge: data.badge || '/icon-192.svg',
    tag: data.tag || `gradeup-${Date.now()}`,
    data: {
      url: data.url || '/',
      ...data.data,
    },
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: data.vibrate || [200, 100, 200],
    actions: data.actions || [],
    timestamp: data.timestamp || Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  // Handle action buttons
  let urlToOpen = notificationData.url || '/';

  if (action) {
    // Find the action URL from notification data if available
    const actionUrl = notificationData.actionUrls?.[action];
    if (actionUrl) {
      urlToOpen = actionUrl;
    }

    // Default action handling for common actions
    switch (action) {
      case 'view':
        urlToOpen = notificationData.url || '/dashboard';
        break;
      case 'dismiss':
        // Just close the notification, don't open anything
        return;
      case 'view-deal':
        urlToOpen = notificationData.dealUrl || '/dashboard/deals';
        break;
      case 'view-message':
        urlToOpen = notificationData.messageUrl || '/dashboard/messages';
        break;
      default:
        break;
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open with the same URL, focus it
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);

        if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
          return client.focus();
        }
      }

      // If any window is open, navigate it to the URL and focus
      for (const client of clientList) {
        if ('navigate' in client && 'focus' in client) {
          return client.navigate(urlToOpen).then(() => client.focus());
        }
      }

      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close handler (for analytics/cleanup)
self.addEventListener('notificationclose', (event) => {
  const notificationData = event.notification.data || {};

  // You can track notification dismissals here
  // Send to analytics endpoint if needed
  console.log('[SW] Notification closed:', notificationData.tag || 'unknown');
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // Placeholder for syncing offline actions when back online
  // This can be extended to sync form submissions, etc.
  console.log('Background sync triggered');
}
