'use client';

/**
 * DiscoverabilityToggleCard — Client Component.
 *
 * Renders the athlete's is_discoverable flag as a toggle. On change
 * POSTs to /api/hs/athlete/discoverability and updates its internal
 * state on success. On failure it rolls back the UI and surfaces the
 * server error.
 *
 * Copy is deliberately concrete about what brands CAN and CANNOT see
 * — the privacy page is where we earn trust with athletes and their
 * parents, so the disclosure list is part of the product, not a
 * tooltip.
 */

import { useState, useTransition } from 'react';

export interface DiscoverabilityToggleCardProps {
  initialIsDiscoverable: boolean;
  initialUpdatedAt: string | null;
  stateCode: string;
}

const STATE_LABELS: Record<string, string> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
  TX: 'Texas',
};

function formatStamp(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DiscoverabilityToggleCard({
  initialIsDiscoverable,
  initialUpdatedAt,
  stateCode,
}: DiscoverabilityToggleCardProps) {
  const [isOn, setIsOn] = useState(initialIsDiscoverable);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stateLabel = STATE_LABELS[stateCode] ?? stateCode;
  const lastChanged = formatStamp(updatedAt);

  const onToggle = () => {
    const next = !isOn;
    const prev = isOn;
    setError(null);
    setIsOn(next); // optimistic
    startTransition(async () => {
      try {
        const res = await fetch('/api/hs/athlete/discoverability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isDiscoverable: next }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed (${res.status}).`);
        }
        const body = (await res.json()) as {
          isDiscoverable: boolean;
          updatedAt: string | null;
        };
        setIsOn(body.isDiscoverable);
        setUpdatedAt(body.updatedAt);
      } catch (err) {
        setIsOn(prev); // rollback
        setError(err instanceof Error ? err.message : 'Update failed.');
      }
    });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Brand discoverability
          </p>
          <h2 className="mt-2 font-display text-2xl text-white md:text-3xl">
            {isOn ? 'Brands can find you.' : 'You are hidden from brands.'}
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {isOn
              ? `Brands searching in ${stateLabel} with deals matching your categories can see your profile in their suggested-athletes list.`
              : `You will not appear in brand suggested-athletes lists. Existing deals are unaffected.`}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-label={
            isOn
              ? 'Turn off brand discoverability'
              : 'Turn on brand discoverability'
          }
          disabled={pending}
          onClick={onToggle}
          className={`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full border transition-colors ${
            isOn
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/30'
              : 'border-white/25 bg-white/10'
          } ${pending ? 'opacity-60' : ''}`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-6 w-6 transform rounded-full transition-transform ${
              isOn
                ? 'translate-x-7 bg-[var(--accent-primary)]'
                : 'translate-x-1 bg-white/80'
            }`}
          />
        </button>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Brands see
          </p>
          <ul className="mt-2 space-y-1 text-sm text-white/80">
            <li>Your first name</li>
            <li>Your school + sport</li>
            <li>Your state</li>
            <li>GPA + verification tier</li>
            <li>Graduation year</li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--error-text,#D23B3B)]">
            Brands do NOT see
          </p>
          <ul className="mt-2 space-y-1 text-sm text-white/80">
            <li>Your last name</li>
            <li>Your email</li>
            <li>Your phone</li>
            <li>Your date of birth</li>
            <li>Your address</li>
          </ul>
        </div>
      </div>

      <p className="mt-4 text-xs text-white/50">
        You can change this at any time. Opting out doesn&rsquo;t affect deals
        already in motion.
      </p>

      {lastChanged && (
        <p className="mt-2 text-xs text-white/40">
          Last changed {lastChanged}.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-[color:var(--error-text,#D23B3B)]"
        >
          {error}
        </p>
      )}
    </section>
  );
}
