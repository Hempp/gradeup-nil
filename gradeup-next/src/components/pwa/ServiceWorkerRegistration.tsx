'use client';

/**
 * ServiceWorkerRegistration — registers /sw.js at scope "/" on mount.
 *
 * Service workers require a secure context. In localhost + HTTPS this
 * Just Works; on plain http:// (common in dev tunnels or misconfigured
 * previews) registration silently no-ops. We log once at info level
 * so the failure is traceable without spamming production logs.
 */

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Only register in secure contexts. Modern browsers expose this
    // via window.isSecureContext; localhost is treated as secure.
    if (!window.isSecureContext) {
      // eslint-disable-next-line no-console
      console.info('[pwa] insecure context — skipping service worker registration');
      return;
    }

    let cancelled = false;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        if (cancelled) return;
        // Kick an update check once per hour so long-lived tabs pick
        // up new shell caches without a hard reload.
        const interval = window.setInterval(() => {
          registration.update().catch(() => {
            // Swallow — next tick will retry.
          });
        }, 60 * 60 * 1000);
        // Store on the window so other listeners can cancel if needed.
        (window as unknown as { __gradeupSwInterval?: number }).__gradeupSwInterval =
          interval;
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[pwa] service worker registration failed', err);
      });

    return () => {
      cancelled = true;
      const w = window as unknown as { __gradeupSwInterval?: number };
      if (w.__gradeupSwInterval) {
        window.clearInterval(w.__gradeupSwInterval);
        w.__gradeupSwInterval = undefined;
      }
    };
  }, []);

  return null;
}

export default ServiceWorkerRegistration;
