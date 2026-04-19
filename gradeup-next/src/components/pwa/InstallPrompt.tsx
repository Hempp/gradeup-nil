'use client';

/**
 * InstallPrompt — thin dismissible banner for the beforeinstallprompt
 * event on Android / Chromium. Auto-hides when the app is already
 * running in standalone (installed) mode on any platform.
 *
 * UX rules:
 *   - Only renders if:
 *       1. Browser fires beforeinstallprompt (Chromium).
 *       2. App is not already installed (display-mode + iOS standalone).
 *       3. User hasn't dismissed before (localStorage, versioned key).
 *   - Dismissal writes a versioned key so we can re-surface when the
 *     install story evolves without tripping stale dismissals.
 */

import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'pwa.install-prompt.dismissed.v1';

// Minimal shape for the non-standard BeforeInstallPromptEvent.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari sets navigator.standalone when launched from home screen.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  // Everything else: display-mode media query.
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(display-mode: standalone)').matches;
  }
  return false;
}

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAppInstalled()) return;

    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      // localStorage can throw in private-mode Safari. Treat as not-dismissed.
    }
    if (dismissed) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If the user completes install while the banner is visible, hide it.
    const installedHandler = () => {
      setVisible(false);
      setPromptEvent(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const onInstall = useCallback(async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const result = await promptEvent.userChoice;
      if (result.outcome === 'accepted') {
        setVisible(false);
        setPromptEvent(null);
      }
    } catch {
      // Prompt can throw if the user dismissed via system UI.
      setVisible(false);
    }
  }, [promptEvent]);

  const onDismiss = useCallback(() => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Best-effort; if storage is unavailable the banner just won't
      // remember the dismissal across reloads.
    }
  }, []);

  if (!visible || !promptEvent) return null;

  return (
    <div
      role="region"
      aria-label="Install GradeUp HS"
      className="sticky top-0 z-40 w-full border-b border-white/10 bg-[var(--marketing-gray-900)] text-white"
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <p className="flex-1">
          <span className="font-semibold text-[var(--accent-primary)]">
            Install GradeUp HS
          </span>{' '}
          <span className="text-white/70">
            to your home screen for faster check-ins on deals and consent updates.
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onInstall}
            className="inline-flex min-h-[36px] items-center rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-black transition hover:opacity-90"
          >
            Install
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss install prompt"
            className="inline-flex min-h-[36px] items-center rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/5"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
