'use client';

/**
 * PreferenceListClient — per-type push preference toggles.
 *
 * Owns client-side state and PATCHes /api/push/preferences on change.
 * Optimistic UI: flip immediately, revert + surface error on failure.
 */

import { useCallback, useState } from 'react';

interface Preferences {
  consent_requests: boolean;
  deal_review: boolean;
  deal_completed: boolean;
  referral_milestones: boolean;
}

const ITEMS: Array<{
  key: keyof Preferences;
  label: string;
  description: string;
}> = [
  {
    key: 'consent_requests',
    label: 'Parent consent requests',
    description:
      'When a parent signs or updates a consent scope for you or your athlete.',
  },
  {
    key: 'deal_review',
    label: 'Brand review decisions',
    description:
      'When a brand approves, requests changes, or disputes a deliverable you submitted.',
  },
  {
    key: 'deal_completed',
    label: 'Deal completions',
    description: 'When a deal closes and payout has been released.',
  },
  {
    key: 'referral_milestones',
    label: 'Referral milestones',
    description:
      'When a parent-to-parent referral you started hits a reward tier.',
  },
];

export function PreferenceListClient({
  initial,
}: {
  initial: Preferences & { updated_at?: string | null };
}) {
  const [prefs, setPrefs] = useState<Preferences>({
    consent_requests: initial.consent_requests,
    deal_review: initial.deal_review,
    deal_completed: initial.deal_completed,
    referral_milestones: initial.referral_milestones,
  });
  const [busyKey, setBusyKey] = useState<keyof Preferences | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggle = useCallback(
    async (key: keyof Preferences) => {
      const next = !prefs[key];
      const optimistic = { ...prefs, [key]: next };
      setPrefs(optimistic);
      setBusyKey(key);
      setErrorMessage(null);

      try {
        const res = await fetch('/api/push/preferences', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ [key]: next }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setErrorMessage(body.error ?? 'Could not save that preference.');
          setPrefs((p) => ({ ...p, [key]: !next }));
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Network error saving preference.'
        );
        setPrefs((p) => ({ ...p, [key]: !next }));
      } finally {
        setBusyKey(null);
      }
    },
    [prefs]
  );

  return (
    <div className="mt-4 space-y-3">
      {ITEMS.map((item) => {
        const checked = prefs[item.key];
        const busy = busyKey === item.key;
        return (
          <label
            key={item.key}
            htmlFor={`pref-${item.key}`}
            className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20"
          >
            <span className="flex-1">
              <span className="block text-sm font-semibold text-white">
                {item.label}
              </span>
              <span className="mt-1 block text-xs text-white/60">
                {item.description}
              </span>
            </span>
            <span className="relative inline-flex items-center">
              <input
                id={`pref-${item.key}`}
                type="checkbox"
                className="peer sr-only"
                checked={checked}
                disabled={busy}
                onChange={() => toggle(item.key)}
              />
              <span
                aria-hidden
                className={[
                  'relative inline-block h-6 w-11 rounded-full transition',
                  checked
                    ? 'bg-[var(--accent-primary)]'
                    : 'bg-white/20',
                  busy ? 'opacity-60' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    checked ? 'translate-x-5' : 'translate-x-0.5',
                  ].join(' ')}
                />
              </span>
            </span>
          </label>
        );
      })}
      {errorMessage && (
        <p className="text-sm text-[color:var(--accent-secondary,#ffd700)]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default PreferenceListClient;
