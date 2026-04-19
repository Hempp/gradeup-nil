/**
 * GradeUp service worker.
 *
 * Caching strategy:
 *   - App-shell (precache on install): landing /, HS landing /hs,
 *     login / signup entry points, manifest, core icons.
 *   - HTML navigations: stale-while-revalidate (serve cached shell
 *     instantly when offline; refresh from network in background).
 *   - /icons/*, /favicon.*, SVG icons: cache-first.
 *   - Everything else (API, _next internals, cross-origin): pass-through.
 *
 * Push events:
 *   - Renders a notification with title + body + icon + badge.
 *   - notificationclick focuses an existing window with the same
 *     pathname or opens a new one at data.url.
 */

const CACHE_VERSION = 'gradeup-v2';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ICON_CACHE = `${CACHE_VERSION}-icons`;
const HTML_CACHE = `${CACHE_VERSION}-html`;

const APP_SHELL_URLS = [
  '/',
  '/hs',
  '/login',
  '/signup',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/favicon.svg',
];

// ────────────────────────────────────────────────────────────────
// install — precache the shell
// ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        // addAll fails atomically; if one URL 404s, drop to individual adds
        // so a missing asset doesn't break registration.
        Promise.all(
          APP_SHELL_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
              console.warn('[sw] shell precache miss', url, err);
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// ────────────────────────────────────────────────────────────────
// activate — purge old cache versions
// ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ────────────────────────────────────────────────────────────────
// fetch — route by request type
// ────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only same-origin.
  if (url.origin !== self.location.origin) return;

  // Never intercept Next.js internals or API routes.
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache-first for icon assets (stable, long-lived).
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(cacheFirst(req, ICON_CACHE));
    return;
  }

  // Stale-while-revalidate for HTML navigations.
  const accept = req.headers.get('accept') || '';
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(staleWhileRevalidate(req, HTML_CACHE, event));
    return;
  }

  // Default: pass through to network.
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Return a typed empty response so the browser doesn't hang.
    return cached || new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request, cacheName, event) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Return cached immediately if available; otherwise wait for network.
  if (cached) {
    // Kick off the revalidation but don't await it.
    if (event && typeof event.waitUntil === 'function') {
      event.waitUntil(networkPromise);
    }
    return cached;
  }
  const response = await networkPromise;
  if (response) return response;

  // Offline and nothing cached — fall back to the shell if we have it.
  const shell = await cache.match('/hs') || await cache.match('/');
  return shell || new Response('Offline', { status: 503 });
}

// ────────────────────────────────────────────────────────────────
// push — render a notification from the server payload
// ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'GradeUp', body: 'New notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      try {
        data.body = event.data.text() || data.body;
      } catch {
        // Keep defaults.
      }
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.svg',
    badge: data.badge || '/icon-192.svg',
    tag: data.tag || `gradeup-${data?.data?.type || 'generic'}`,
    data: {
      url: (data.data && data.data.url) || data.url || '/hs',
      type: (data.data && data.data.type) || data.type || 'generic',
      meta: (data.data && data.data.meta) || null,
    },
    requireInteraction: Boolean(data.requireInteraction),
    silent: Boolean(data.silent),
    vibrate: data.vibrate || [180, 80, 180],
    timestamp: data.timestamp || Date.now(),
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ────────────────────────────────────────────────────────────────
// notificationclick — focus existing window or open URL
// ────────────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = typeof data.url === 'string' ? data.url : '/hs';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          try {
            const clientUrl = new URL(client.url);
            const dest = new URL(targetUrl, self.location.origin);
            if (clientUrl.pathname === dest.pathname && 'focus' in client) {
              return client.focus();
            }
          } catch {
            // Ignore malformed client URLs.
          }
        }
        for (const client of clients) {
          if ('navigate' in client && 'focus' in client) {
            return client.navigate(targetUrl).then(() => client.focus());
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return null;
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Reserved for future analytics hooks.
  const data = event.notification.data || {};
  if (data && data.type) {
    // eslint-disable-next-line no-console
    console.log('[sw] notification closed', data.type);
  }
});
