'use client';

/**
 * ReferralCodeCard — Compact card for the HS parent dashboard.
 *
 * Shows the caller's personal invite code + share CTAs:
 *   • "Copy share link" — copies ${APP_URL}/hs?ref=CODE to clipboard.
 *   • "Email a friend" — opens <InvitePeerDialog>.
 *
 * Also shows a small metric when available: "N parents joined with
 * your code this month." The count comes from `/hs/parent/referrals`
 * (preferred: server-rendered) or from the stats prop when inlined
 * on the dashboard.
 *
 * Loads the code lazily via GET /api/hs/referrals/code on mount —
 * this endpoint creates-or-returns the code idempotently. Handles the
 * loading + error states gracefully (never breaks the dashboard).
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { InvitePeerDialog } from './InvitePeerDialog';

interface CodeResponse {
  code: string;
  shareUrl: string;
  role: 'hs_parent' | 'hs_athlete';
}

interface ReferralCodeCardProps {
  /** Optional — if already known server-side, pass to skip the fetch. */
  initialCode?: CodeResponse | null;
  /** Optional — monthly signups attributed to this user. */
  signupsThisMonth?: number;
}

export function ReferralCodeCard({
  initialCode = null,
  signupsThisMonth,
}: ReferralCodeCardProps) {
  const [data, setData] = useState<CodeResponse | null>(initialCode);
  const [loading, setLoading] = useState(!initialCode);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (initialCode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/hs/referrals/code', {
          method: 'GET',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('code fetch failed');
        const json = (await res.json()) as CodeResponse;
        if (!cancelled) setData(json);
      } catch {
        // Soft-fail — the card degrades to a simple "Invite friends"
        // prompt with a link to the full referrals page.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCode]);

  const copyShareLink = useCallback(async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: open a prompt with the link so they can copy manually.
      window.prompt('Copy this link:', data.shareUrl);
    }
  }, [data]);

  return (
    <section
      aria-labelledby="referral-code-heading"
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <h3
          id="referral-code-heading"
          className="font-display text-xl text-white"
        >
          Your invite code
        </h3>
        <Link
          href="/hs/parent/referrals"
          className="text-xs text-white/60 transition-colors hover:text-white"
        >
          View funnel &rsaquo;
        </Link>
      </div>

      <p className="mt-2 text-sm text-white/60">
        Share your code with other parents. When they join GradeUp, we tell
        you — and you see their progress on your referrals page.
      </p>

      <div className="mt-4 flex items-center gap-3">
        {loading ? (
          <div
            aria-label="Loading invite code"
            className="h-10 w-32 animate-pulse rounded-lg bg-white/10"
          />
        ) : data ? (
          <code className="select-all rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-lg tracking-wider text-[var(--accent-primary)]">
            {data.code}
          </code>
        ) : (
          <p className="text-sm text-white/50">
            Invite code not available yet. Refresh in a moment.
          </p>
        )}
      </div>

      {typeof signupsThisMonth === 'number' && signupsThisMonth > 0 && (
        <p className="mt-3 text-xs text-white/60">
          <strong className="text-white">{signupsThisMonth}</strong>{' '}
          parent{signupsThisMonth === 1 ? '' : 's'} joined with your code this
          month.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyShareLink}
          disabled={!data}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {copied ? 'Link copied' : 'Copy share link'}
        </button>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={!data}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          Email a friend
        </button>
      </div>

      <InvitePeerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </section>
  );
}

export default ReferralCodeCard;
