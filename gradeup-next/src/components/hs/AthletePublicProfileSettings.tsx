'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UsernameAvailabilityField } from './UsernameAvailabilityField';
import { BIO_MAX } from '@/lib/hs-nil/athlete-profile';

export interface AthletePublicProfileSettingsProps {
  initial: {
    username: string | null;
    bio: string | null;
    visibility: boolean;
  };
}

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

export function AthletePublicProfileSettings({
  initial,
}: AthletePublicProfileSettingsProps) {
  const router = useRouter();
  const [usernameValue, setUsernameValue] = useState(initial.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken' | 'invalid' | 'locked' | 'checking' | 'error'>(
    initial.username ? 'locked' : 'idle',
  );
  const [bio, setBio] = useState(initial.bio ?? '');
  const [visibility, setVisibility] = useState(initial.visibility);
  const [claimState, setClaimState] = useState<SaveState>({ kind: 'idle' });
  const [bioState, setBioState] = useState<SaveState>({ kind: 'idle' });
  const [visState, setVisState] = useState<SaveState>({ kind: 'idle' });

  const locked = Boolean(initial.username);

  async function submitClaim(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (usernameStatus !== 'available') return;
    setClaimState({ kind: 'saving' });
    try {
      const res = await fetch(
        '/api/hs/athlete/profile-public/claim-username',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameValue }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setClaimState({
          kind: 'error',
          message: (j as { error?: string }).error ?? 'Claim failed.',
        });
        return;
      }
      setClaimState({ kind: 'ok', message: 'Username claimed.' });
      router.refresh();
    } catch {
      setClaimState({ kind: 'error', message: 'Network error.' });
    }
  }

  async function submitBio(e: React.FormEvent) {
    e.preventDefault();
    setBioState({ kind: 'saving' });
    try {
      const res = await fetch('/api/hs/athlete/profile-public/bio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setBioState({
          kind: 'error',
          message: (j as { error?: string }).error ?? 'Save failed.',
        });
        return;
      }
      setBioState({ kind: 'ok', message: 'Bio saved.' });
    } catch {
      setBioState({ kind: 'error', message: 'Network error.' });
    }
  }

  async function toggleVisibility() {
    const next = !visibility;
    setVisState({ kind: 'saving' });
    try {
      const res = await fetch(
        '/api/hs/athlete/profile-public/visibility',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visible: next }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setVisState({
          kind: 'error',
          message: (j as { error?: string }).error ?? 'Update failed.',
        });
        return;
      }
      setVisibility(next);
      setVisState({
        kind: 'ok',
        message: next ? 'Profile is now public.' : 'Profile hidden.',
      });
      router.refresh();
    } catch {
      setVisState({ kind: 'error', message: 'Network error.' });
    }
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <h2 className="font-display text-xl text-white">Username</h2>
        <p className="mt-1 text-sm text-white/60">
          Your public URL: <span className="text-white/90">/athletes/
            {initial.username ?? 'your-handle'}</span>. Choose carefully — you
          can&apos;t freely change it once claimed.
        </p>
        <form onSubmit={submitClaim} className="mt-4 space-y-3">
          <UsernameAvailabilityField
            name="username"
            initial={initial.username}
            locked={locked}
            onChange={(v, s) => {
              setUsernameValue(v);
              setUsernameStatus(s.kind === 'checking' ? 'checking' : s.kind);
            }}
          />
          {!locked && (
            <button
              type="submit"
              disabled={
                claimState.kind === 'saving' || usernameStatus !== 'available'
              }
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              {claimState.kind === 'saving' ? 'Claiming…' : 'Claim username'}
            </button>
          )}
          {claimState.kind === 'ok' && (
            <p className="text-sm text-emerald-400" role="alert">
              {claimState.message}
            </p>
          )}
          {claimState.kind === 'error' && (
            <p className="text-sm text-red-400" role="alert">
              {claimState.message}
            </p>
          )}
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <h2 className="font-display text-xl text-white">Bio</h2>
        <p className="mt-1 text-sm text-white/60">
          Up to {BIO_MAX} characters. Shown publicly if your profile is visible.
        </p>
        <form onSubmit={submitBio} className="mt-4 space-y-3">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX}
            rows={4}
            className="min-h-[100px] w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            aria-label="Public bio"
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">
              {bio.length} / {BIO_MAX}
            </span>
            <button
              type="submit"
              disabled={bioState.kind === 'saving'}
              className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-white/15 px-4 py-1 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
            >
              {bioState.kind === 'saving' ? 'Saving…' : 'Save bio'}
            </button>
          </div>
          {bioState.kind === 'ok' && (
            <p className="text-sm text-emerald-400" role="alert">
              {bioState.message}
            </p>
          )}
          {bioState.kind === 'error' && (
            <p className="text-sm text-red-400" role="alert">
              {bioState.message}
            </p>
          )}
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <h2 className="font-display text-xl text-white">Visibility</h2>
        <p className="mt-2 text-sm text-white/60">
          {visibility
            ? 'Your profile is PUBLIC. Anyone can view your GPA, school, sport, and completed deals via your URL.'
            : 'Your profile is PRIVATE. No one can discover it publicly until you turn this on.'}
        </p>
        {!locked && !visibility && (
          <p className="mt-2 text-sm text-amber-400">
            Claim a username first to enable public visibility.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleVisibility}
            disabled={visState.kind === 'saving' || (!visibility && !locked)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {visState.kind === 'saving'
              ? 'Saving…'
              : visibility
                ? 'Hide profile'
                : 'Make public'}
          </button>
          {visibility && initial.username && (
            <Link
              href={`/athletes/${initial.username}`}
              className="text-sm text-[var(--accent-primary)] underline underline-offset-4"
              target="_blank"
              rel="noopener"
            >
              View your public profile →
            </Link>
          )}
        </div>
        {visState.kind === 'ok' && (
          <p className="mt-3 text-sm text-emerald-400" role="alert">
            {visState.message}
          </p>
        )}
        {visState.kind === 'error' && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {visState.message}
          </p>
        )}
      </section>
    </div>
  );
}
