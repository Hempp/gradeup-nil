'use client';

/**
 * PushSubscribeButton — end-to-end subscribe flow.
 *
 * State machine:
 *   unsupported          — browser lacks Notification/PushManager APIs
 *   loading              — reading VAPID key or current subscription
 *   not-subscribed       — user hasn't granted permission yet
 *   subscribing          — permission/subscription in flight
 *   subscribed           — active subscription, server knows about it
 *   denied               — user blocked notification permission
 *   error                — transient failure; UI offers retry
 *
 * Permission is requested ONLY on explicit user click — never on
 * page load — per the browser UX best practices the system prompt
 * is a once-per-origin decision we can't undo.
 */

import { useCallback, useEffect, useState } from 'react';

type State =
  | 'unsupported'
  | 'loading'
  | 'not-subscribed'
  | 'subscribing'
  | 'subscribed'
  | 'denied'
  | 'error';

interface Props {
  className?: string;
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) {
    view[i] = raw.charCodeAt(i);
  }
  return view;
}

export function PushSubscribeButton({ className }: Props) {
  const [state, setState] = useState<State>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial capability check + current subscription probe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === 'undefined') return;
      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        if (!cancelled) setState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        if (!cancelled) setState('denied');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        setState(existing ? 'subscribed' : 'not-subscribed');
      } catch {
        if (!cancelled) setState('not-subscribed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    setErrorMessage(null);
    setState('subscribing');
    try {
      const keyRes = await fetch('/api/push/vapid-public-key', {
        cache: 'no-store',
      });
      if (!keyRes.ok) {
        const body = await keyRes.json().catch(() => ({}));
        setErrorMessage(
          body.error ?? 'Push notifications are not available right now.'
        );
        setState('error');
        return;
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setState('denied');
        return;
      }
      if (permission !== 'granted') {
        setState('not-subscribed');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = subscription.toJSON();
      const postRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });
      if (!postRes.ok) {
        const body = await postRes.json().catch(() => ({}));
        setErrorMessage(body.error ?? 'Could not save your subscription.');
        setState('error');
        return;
      }
      setState('subscribed');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unexpected error subscribing.'
      );
      setState('error');
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setErrorMessage(null);
    setState('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const endpoint = existing?.endpoint;
      if (existing) {
        await existing.unsubscribe();
      }
      if (endpoint) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
      setState('not-subscribed');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not turn off notifications.'
      );
      setState('error');
    }
  }, []);

  if (state === 'unsupported') {
    return (
      <p className={className ?? 'text-sm text-white/60'}>
        Your browser does not support push notifications. Try Chrome or Safari on
        a supported device.
      </p>
    );
  }

  if (state === 'denied') {
    return (
      <div className={className}>
        <p className="text-sm text-white/70">
          You&apos;ve blocked notifications for GradeUp. To re-enable, open your
          browser settings for this site and allow notifications.
        </p>
      </div>
    );
  }

  if (state === 'subscribed') {
    return (
      <div className={className ?? 'space-y-3'}>
        <p className="text-sm text-white/80">
          Push notifications are <strong>on</strong>. You&apos;ll hear about
          consent, deal reviews, and completed payouts in real time.
        </p>
        <button
          type="button"
          onClick={unsubscribe}
          className="inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
        >
          Turn off notifications
        </button>
      </div>
    );
  }

  const busy = state === 'loading' || state === 'subscribing';

  return (
    <div className={className ?? 'space-y-3'}>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
        <p className="font-semibold text-white">What you&apos;ll get</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
          <li>Parent consent requests as soon as they hit the inbox.</li>
          <li>Brand review decisions on submitted deliverables.</li>
          <li>Payout completions the moment a deal closes.</li>
        </ul>
        <p className="mt-3 text-xs text-white/50">
          We only notify on high-signal moments. No marketing pushes.
        </p>
      </div>
      <button
        type="button"
        onClick={subscribe}
        disabled={busy}
        className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Working…' : 'Turn on notifications'}
      </button>
      {state === 'error' && errorMessage && (
        <p className="text-sm text-[color:var(--accent-secondary,#ffd700)]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default PushSubscribeButton;
