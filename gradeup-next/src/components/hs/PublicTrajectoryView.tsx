/**
 * PublicTrajectoryView — read-only trajectory renderer shared between
 * the auth'd athlete-only page and the public token page.
 *
 * PII minimization (hard contract — callers rely on it):
 *   SHOW: first name + last initial, school, sport, state, graduation
 *         year, GPA (number + tier), completed deals (brand + amount +
 *         approximate date).
 *   HIDE: email, phone, DOB, full address, parent info, waitlist
 *         metadata, referral info.
 *
 * Inputs are already-minimized: the service returns Trajectory with
 * only identity fields listed above. This component renders what it
 * is given and does no further lookups.
 */

import Link from 'next/link';
import type { Trajectory, VerificationTier } from '@/lib/hs-nil/trajectory';
import { tierLabel, formatGpa } from '@/lib/hs-nil/trajectory';
import { TrajectoryChart } from './TrajectoryChart';
import { MilestoneList } from './MilestoneList';
import { CompletedDealsSummary } from './CompletedDealsSummary';

const STATE_NAMES: Record<string, string> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
  TX: 'Texas',
  AL: 'Alabama',
  HI: 'Hawaii',
  IN: 'Indiana',
  MI: 'Michigan',
  WY: 'Wyoming',
};

const TIER_TONE: Record<VerificationTier, string> = {
  self_reported: 'border-white/15 bg-white/5 text-white/70',
  user_submitted: 'border-blue-400/40 bg-blue-400/10 text-blue-200',
  institution_verified:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
};

export interface PublicTrajectoryViewProps {
  trajectory: Trajectory;
  /** When true, render a small "GradeUp" wordmark footer. Default true. */
  showBranding?: boolean;
  /** Present for auth'd page; hidden by the public page. */
  backHref?: string;
}

export function PublicTrajectoryView({
  trajectory,
  showBranding = true,
  backHref,
}: PublicTrajectoryViewProps) {
  const { identity, snapshots, deals, milestones } = trajectory;
  const stateName = identity.stateCode
    ? STATE_NAMES[identity.stateCode] ?? identity.stateCode
    : null;
  const tier = identity.currentTier ?? 'self_reported';
  const tierCls = TIER_TONE[tier];

  const headerLine = [
    `${identity.firstName} ${identity.lastInitial}.`,
    identity.graduationYear ? `Class of ${identity.graduationYear}` : null,
    identity.school,
    stateName,
    identity.sport,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-8">
        {backHref && (
          <Link
            href={backHref}
            className="mb-6 inline-flex items-center text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white"
          >
            ← Back to dashboard
          </Link>
        )}
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Academic-athletic trajectory
        </p>
        <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
          {identity.firstName} {identity.lastInitial}.
        </h1>
        <p className="mt-2 text-sm text-white/70 md:text-base">{headerLine}</p>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Current GPA
            </p>
            <p className="mt-1 font-display text-6xl leading-none text-white">
              {formatGpa(identity.currentGpa)}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tierCls}`}
          >
            {tierLabel(tier)}
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-10">
        <h2 className="font-display text-2xl text-white md:text-3xl">
          GPA over time
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Every reading is tied to a verification tier — brands and coaches
          can tell a self-report from a transcript at a glance.
        </p>
        <div className="mt-4">
          <TrajectoryChart snapshots={snapshots} deals={deals} />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-10">
        <h2 className="font-display text-2xl text-white md:text-3xl">
          Milestones
        </h2>
        <div className="mt-4">
          <MilestoneList milestones={milestones} />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="font-display text-2xl text-white md:text-3xl">
          Completed deals
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Every dollar here settled. Brand, amount, and approximate date —
          nothing private.
        </p>
        <div className="mt-4">
          <CompletedDealsSummary deals={deals} />
        </div>
      </section>

      {showBranding && (
        <footer className="mx-auto max-w-5xl px-6 pb-12">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-xs text-white/60">
            <span>
              Verified trajectory via{' '}
              <span className="font-semibold text-white">GradeUp NIL</span>
            </span>
            <Link
              href="/hs"
              className="font-semibold text-[var(--accent-primary)] hover:underline"
            >
              gradeup.nil →
            </Link>
          </div>
        </footer>
      )}
    </main>
  );
}

export default PublicTrajectoryView;
