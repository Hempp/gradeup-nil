'use client';

/**
 * TrajectoryShareCard — manage public share tokens for the athlete's
 * trajectory. Lists existing shares, creates new ones, and revokes.
 *
 * POSTs to /api/hs/athlete/trajectory/share to create; DELETEs to the
 * same route to revoke. Optimistic update: on create we prepend the
 * new row; on revoke we replace the row in-place with revoked_at set.
 */

import { useState } from 'react';
import type { TrajectoryShare } from '@/lib/hs-nil/trajectory';

export interface TrajectoryShareCardProps {
  initialShares: TrajectoryShare[];
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function statusOf(share: TrajectoryShare): 'live' | 'revoked' | 'expired' {
  if (share.revokedAt) return 'revoked';
  if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
    return 'expired';
  }
  return 'live';
}

export function TrajectoryShareCard({ initialShares }: TrajectoryShareCardProps) {
  const [shares, setShares] = useState<TrajectoryShare[]>(initialShares);
  const [label, setLabel] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/hs/athlete/trajectory/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim() || null,
          expiresInDays: expiresInDays ? Number(expiresInDays) : null,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? 'Failed to create share.');
      }
      const { share } = (await res.json()) as { share: TrajectoryShare };
      setShares((prev) => [share, ...prev]);
      setLabel('');
      setExpiresInDays('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(shareId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/hs/athlete/trajectory/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? 'Failed to revoke share.');
      }
      setShares((prev) =>
        prev.map((s) =>
          s.id === shareId
            ? { ...s, revokedAt: new Date().toISOString() }
            : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(share: TrajectoryShare) {
    try {
      await navigator.clipboard.writeText(share.publicUrl);
      setCopiedToken(share.publicToken);
      setTimeout(() => setCopiedToken((t) => (t === share.publicToken ? null : t)), 2000);
    } catch {
      // noop — some browsers block writeText outside user gesture; the
      // URL is still visible in the row so the user can hand-copy.
    }
  }

  return (
    <section
      aria-labelledby="trajectory-shares-heading"
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Share your trajectory
      </p>
      <h3
        id="trajectory-shares-heading"
        className="mt-2 font-display text-2xl text-white md:text-3xl"
      >
        Public links
      </h3>
      <p className="mt-2 text-sm text-white/70">
        Generate a read-only link for a recruiting packet or social bio.
        Links show your trajectory without any private contact info — you
        can revoke any time.
      </p>

      <form
        onSubmit={handleCreate}
        className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-white/60">
            Label (optional)
          </span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Recruiting Packet 2026"
            maxLength={80}
            className="min-h-[44px] w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-white/60">
            Expires in (days)
          </span>
          <input
            type="number"
            min={1}
            max={730}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            placeholder="∞"
            className="min-h-[44px] w-28 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
        >
          {busy ? 'Working…' : 'Generate link'}
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-200">
          {error}
        </p>
      )}

      {shares.length === 0 ? (
        <p className="mt-6 text-sm text-white/60">
          No share links yet. Generate one above to get started.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-white/10 rounded-xl border border-white/10 bg-black/10">
          {shares.map((share) => {
            const status = statusOf(share);
            return (
              <li
                key={share.id}
                className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">
                      {share.label ?? 'Unlabeled link'}
                    </p>
                    <StatusPill status={status} />
                  </div>
                  <p className="mt-1 break-all text-xs text-white/60">
                    {share.publicUrl}
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">
                    Created {fmtDate(share.createdAt)} •{' '}
                    {share.expiresAt
                      ? `Expires ${fmtDate(share.expiresAt)}`
                      : 'No expiration'}{' '}
                    • {share.viewCount} view
                    {share.viewCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(share)}
                    disabled={status !== 'live'}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {copiedToken === share.publicToken ? 'Copied' : 'Copy'}
                  </button>
                  {status === 'live' && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(share.id)}
                      disabled={busy}
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-400/10 disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: 'live' | 'revoked' | 'expired' }) {
  const cls =
    status === 'live'
      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
      : 'border-white/15 bg-white/5 text-white/60';
  const label =
    status === 'live' ? 'Live' : status === 'revoked' ? 'Revoked' : 'Expired';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${cls}`}
    >
      {label}
    </span>
  );
}

export default TrajectoryShareCard;
