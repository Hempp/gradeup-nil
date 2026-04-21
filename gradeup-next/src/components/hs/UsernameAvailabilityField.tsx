'use client';

import { useEffect, useRef, useState } from 'react';
import {
  USERNAME_MIN,
  USERNAME_MAX,
  USERNAME_REGEX,
  isReservedUsername,
} from '@/lib/hs-nil/athlete-profile';

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'error'; reason: string };

export function UsernameAvailabilityField({
  name,
  initial,
  locked,
  onChange,
}: {
  name: string;
  initial?: string | null;
  locked?: boolean;
  onChange?: (value: string, status: Status) => void;
}) {
  const [value, setValue] = useState(initial ?? '');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onChange?.(value, status);
  }, [value, status, onChange]);

  useEffect(() => {
    if (locked) return;
    if (!value) {
      setStatus({ kind: 'idle' });
      return;
    }
    if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
      setStatus({
        kind: 'invalid',
        reason: `${USERNAME_MIN}-${USERNAME_MAX} characters.`,
      });
      return;
    }
    if (!USERNAME_REGEX.test(value)) {
      setStatus({
        kind: 'invalid',
        reason: 'Lowercase letters, digits, and single dashes only.',
      });
      return;
    }
    if (isReservedUsername(value)) {
      setStatus({ kind: 'invalid', reason: 'That username is reserved.' });
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    setStatus({ kind: 'checking' });
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/hs/athlete/profile-public/check-username?username=${encodeURIComponent(value)}`,
          { method: 'GET' },
        );
        const json = (await res.json()) as {
          available?: boolean;
          reason?: string;
        };
        if (json.available) setStatus({ kind: 'available' });
        else if (json.reason)
          setStatus({ kind: 'invalid', reason: json.reason });
        else setStatus({ kind: 'taken' });
      } catch {
        setStatus({
          kind: 'error',
          reason: 'Could not check availability. Try again.',
        });
      }
    }, 300);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, locked]);

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className="text-xs uppercase tracking-wide text-white/50"
      >
        Public username
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/40">/athletes/</span>
        <input
          id={name}
          name={name}
          type="text"
          value={value}
          disabled={locked}
          maxLength={USERNAME_MAX}
          autoComplete="off"
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          className="min-h-[44px] flex-1 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-describedby={`${name}-status`}
        />
      </div>
      <p
        id={`${name}-status`}
        className="text-xs"
        aria-live="polite"
      >
        {renderStatus(status, locked)}
      </p>
    </div>
  );
}

function renderStatus(status: Status, locked?: boolean): React.ReactNode {
  if (locked) {
    return <span className="text-white/50">Username is locked once claimed.</span>;
  }
  switch (status.kind) {
    case 'idle':
      return <span className="text-white/40">Pick a URL-safe handle.</span>;
    case 'checking':
      return <span className="text-white/60">Checking availability…</span>;
    case 'available':
      return <span className="text-emerald-400">Available.</span>;
    case 'taken':
      return <span className="text-red-400">Already taken.</span>;
    case 'invalid':
      return <span className="text-amber-400">{status.reason}</span>;
    case 'error':
      return <span className="text-red-400">{status.reason}</span>;
  }
}
