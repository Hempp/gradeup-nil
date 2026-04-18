/**
 * AthleteProfileCard — GPA hero + tier badge + key profile facts.
 *
 * Displays:
 *   - Big GPA number (or "—" if not provided).
 *   - Verification-tier pill with human-readable label.
 *   - Graduation year, sport, school.
 *   - CTA to verify GPA when the tier is still self_reported.
 *
 * Tier labels follow the Phase 1 product spec in docs/HS-NIL-BRIEF.md:
 *   self_reported       → "Self-reported"
 *   user_submitted      → "User-submitted"
 *   institution_verified → "Institution-verified"
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { OnboardingCard } from './OnboardingCard';

export type GpaTier =
  | 'self_reported'
  | 'user_submitted'
  | 'institution_verified';

export interface AthleteProfileCardProps {
  gpa: number | null;
  tier: GpaTier;
  graduationYear: number | null;
  sport: string | null;
  school: string | null;
  /** Where the "Verify your GPA" CTA should navigate. */
  verifyHref?: string;
}

const TIER_META: Record<
  GpaTier,
  { label: string; tone: 'muted' | 'warn' | 'ok' }
> = {
  self_reported: { label: 'Self-reported', tone: 'warn' },
  user_submitted: { label: 'User-submitted', tone: 'muted' },
  institution_verified: { label: 'Institution-verified', tone: 'ok' },
};

const TIER_TONE_CLS: Record<'muted' | 'warn' | 'ok', string> = {
  muted: 'border-white/15 bg-white/5 text-white/70',
  warn: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  ok: 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]',
};

export function AthleteProfileCard({
  gpa,
  tier,
  graduationYear,
  sport,
  school,
  verifyHref = '/hs/onboarding/verify-gpa',
}: AthleteProfileCardProps) {
  const meta = TIER_META[tier];
  const gpaDisplay = gpa !== null ? gpa.toFixed(2) : '—';
  const needsVerify = tier === 'self_reported';

  return (
    <OnboardingCard
      eyebrow="Your profile"
      title="Academic + athletic snapshot"
      description="This is what brands see first. Verified grades unlock premium deals."
    >
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            GPA
          </p>
          <p className="mt-1 font-display text-6xl leading-none text-white">
            {gpaDisplay}
          </p>
        </div>
        <span
          className={[
            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
            TIER_TONE_CLS[meta.tone],
          ].join(' ')}
        >
          {meta.label}
        </span>
      </div>

      <dl className="mt-6 grid gap-3 text-sm md:grid-cols-3">
        <Fact label="Sport" value={sport ?? 'Not set'} />
        <Fact
          label="Graduation"
          value={graduationYear ? String(graduationYear) : 'Not set'}
        />
        <Fact label="School" value={school ?? 'Not set'} />
      </dl>

      {needsVerify && (
        <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4">
          <p className="text-sm text-amber-100">
            Your GPA is self-reported. Upload a transcript to earn a verified
            badge — it typically doubles deal value.
          </p>
          <Link href={verifyHref} className="mt-3 inline-block">
            <Button size="lg" variant="primary">
              Verify your GPA
            </Button>
          </Link>
        </div>
      )}
    </OnboardingCard>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
        {label}
      </dt>
      <dd className="mt-1 text-white">{value}</dd>
    </div>
  );
}

export default AthleteProfileCard;
