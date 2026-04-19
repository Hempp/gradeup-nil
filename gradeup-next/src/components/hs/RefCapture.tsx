'use client';

/**
 * RefCapture — captures `?ref=CODE` on any /hs landing.
 *
 * Mounted once in `/src/app/(hs)/layout.tsx`. Renders nothing.
 *
 * Why a Client Component, not an async Server Component:
 *   Layouts in Next 15 don't receive `searchParams` as a prop, and
 *   the request URL isn't reliably exposed in `next/headers` on all
 *   runtime paths (Edge vs Node, preview vs prod). Running client-
 *   side on mount gives us a deterministic read of
 *   `window.location.search` and lets the server-side POST to
 *   `/api/hs/referrals/click` do the cookie write through the
 *   standard Next response cookie channel — which IS reliable.
 *
 * Flow:
 *   1. On mount, read `?ref=CODE` from the URL.
 *   2. If present and we haven't already captured this code in this
 *      session (sessionStorage guard), POST to /api/hs/referrals/click.
 *   3. That endpoint validates the code, records the click, and sets
 *      the httpOnly hs_ref cookie in the response.
 *   4. The visitor navigates freely; the cookie rides along through
 *      all /hs pages and the final signup completion.
 *
 * The cookie itself is set by the server — RefCapture only triggers
 * the click-record request. The cookie must be httpOnly so the signup
 * attribution endpoint can read it server-side without risk of
 * client-side tampering.
 */

import { useEffect } from 'react';

const REF_CODE_PATTERN = /^[A-Za-z0-9]{6,24}$/;
const SESSION_KEY = 'hs_ref_captured';

export function RefCapture(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref || !REF_CODE_PATTERN.test(ref)) return;

    // Skip if we already captured this exact code in this browser
    // session. Prevents a re-write on every /hs page hit for the
    // same referred visit.
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === ref) return;
    } catch {
      // sessionStorage may be blocked in embedded contexts; proceed
      // anyway — the server route is idempotent on same-session
      // clicks (it will write an attribution per call, but we flag
      // this as acceptable noise for privacy-mode users).
    }

    // Fire and forget. Response sets the httpOnly hs_ref cookie.
    fetch('/api/hs/referrals/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: ref,
        path: window.location.pathname,
        utm: {
          source: params.get('utm_source'),
          medium: params.get('utm_medium'),
          campaign: params.get('utm_campaign'),
        },
      }),
      keepalive: true,
    })
      .then((res) => {
        if (res.ok) {
          try {
            window.sessionStorage.setItem(SESSION_KEY, ref);
          } catch {
            /* noop */
          }
        }
      })
      .catch(() => {
        // Swallow — click capture is measurement, never critical.
      });
  }, []);

  return null;
}

export default RefCapture;
