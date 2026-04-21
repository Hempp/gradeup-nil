'use client';

/**
 * Slug availability field used in the brand public-profile settings screen.
 * Debounces the /api/hs/brand/public-profile/check-slug call and exposes the
 * live status (available / taken / reserved / invalid) inline.
 */

import { useEffect, useId, useRef, useState } from 'react';

export interface BrandSlugAvailabilityFieldProps {
  initialValue?: string;
  disabled?: boolean;
  onAvailabilityChange?: (params: {
    slug: string;
    available: boolean;
    reason?: string;
  }) => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'unavailable'; reason: string };

function labelFor(reason: string | undefined): string {
  switch (reason) {
    case 'invalid_slug':
      return 'Use 3-64 lowercase letters, numbers, and dashes.';
    case 'reserved_slug':
      return 'This slug is reserved. Pick another.';
    case 'slug_conflict':
      return 'Another brand already uses this slug.';
    default:
      return 'Slug unavailable.';
  }
}

export function BrandSlugAvailabilityField({
  initialValue = '',
  disabled = false,
  onAvailabilityChange,
}: BrandSlugAvailabilityFieldProps) {
  const inputId = useId();
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setStatus({ kind: 'idle' });
      return;
    }
    setStatus({ kind: 'checking' });
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/hs/brand/public-profile/check-slug?slug=${encodeURIComponent(
            value.trim().toLowerCase(),
          )}`,
        );
        if (!res.ok) {
          setStatus({ kind: 'unavailable', reason: 'db_error' });
          onAvailabilityChange?.({
            slug: value,
            available: false,
            reason: 'db_error',
          });
          return;
        }
        const data = (await res.json()) as {
          available: boolean;
          reason?: string;
        };
        if (data.available) {
          setStatus({ kind: 'available' });
          onAvailabilityChange?.({ slug: value, available: true });
        } else {
          setStatus({ kind: 'unavailable', reason: data.reason ?? 'unknown' });
          onAvailabilityChange?.({
            slug: value,
            available: false,
            reason: data.reason,
          });
        }
      } catch {
        setStatus({ kind: 'unavailable', reason: 'db_error' });
      }
    }, 350);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-white"
      >
        Public URL slug
      </label>
      <p className="mt-1 text-xs text-white/60">
        gradeupnil.com/brands/<span className="font-mono">{value || 'your-slug'}</span>
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={inputId}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          placeholder="your-brand-name"
          pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
          minLength={3}
          maxLength={64}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-[44px] w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 disabled:opacity-50"
        />
      </div>
      <div aria-live="polite" className="mt-2 min-h-[1.25rem] text-xs">
        {status.kind === 'checking' && (
          <span className="text-white/60">Checking…</span>
        )}
        {status.kind === 'available' && (
          <span className="text-[var(--accent-primary)]">Slug is available.</span>
        )}
        {status.kind === 'unavailable' && (
          <span className="text-[color:var(--error,#D23B3B)]">
            {labelFor(status.reason)}
          </span>
        )}
      </div>
    </div>
  );
}
