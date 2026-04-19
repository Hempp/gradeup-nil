'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';

const DISMISS_KEY = 'gradeup.hs-banner.dismissed.v1';

export function HSAnnouncementBannerInner() {
  // Render nothing until we've checked localStorage to avoid a flash for users
  // who already dismissed. `ready` flips once the effect runs on the client.
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY) === 'true';
      setVisible(!dismissed);
    } catch {
      // localStorage unavailable (private mode, SSR edge cases) — keep visible.
      setVisible(true);
    }
    setReady(true);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // Best-effort persistence only.
    }
    setVisible(false);
  };

  if (!ready || !visible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="GradeUp HS expansion announcement"
      className="relative z-[60] w-full bg-[var(--accent-primary)] text-black"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <p className="flex-1 text-sm font-medium leading-snug">
          <span className="hidden sm:inline">We&apos;re expanding. </span>
          GradeUp HS is live in CA, FL, GA, IL, NJ, and NY — join the waitlist.
        </p>
        <Link
          href="/hs"
          className="inline-flex items-center gap-1 text-sm font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
        >
          Learn more
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
