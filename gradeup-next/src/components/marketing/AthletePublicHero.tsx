/**
 * AthletePublicHero — top of /athletes/[username].
 *
 * PII-minimized: accepts ONLY the fields the service already
 * promises as public (first name + last initial, GPA, tier,
 * school, sport, state, grad year, bio). Never renders email /
 * phone / DOB / parent info.
 *
 * Full-name variant: future opt-in flag we haven't built. Until
 * then first name + last initial is the only rendering.
 */

import Link from 'next/link';
import type { PublicAthleteProfile } from '@/lib/hs-nil/athlete-profile';
import { tierLabel, formatGpa } from '@/lib/hs-nil/trajectory';
import type { VerificationTier } from '@/lib/hs-nil/trajectory';

const TIER_TONE: Record<VerificationTier, string> = {
  self_reported: 'border-white/15 bg-white/5 text-white/70',
  user_submitted: 'border-blue-400/40 bg-blue-400/10 text-blue-200',
  institution_verified:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
};

export interface AthletePublicHeroProps {
  profile: PublicAthleteProfile;
  /** Brand-signup CTA href with signed athlete ref pre-baked. */
  brandSignupHref: string;
  /** Public absolute URL of the profile, used for share buttons. */
  publicUrl: string;
}

export function AthletePublicHero({
  profile,
  brandSignupHref,
  publicUrl,
}: AthletePublicHeroProps) {
  const tier = profile.currentTier ?? 'self_reported';
  const tierCls = TIER_TONE[tier];

  const metaLine = [
    profile.graduationYear ? `Class of ${profile.graduationYear}` : null,
    profile.school,
    profile.stateName,
    profile.sport,
  ]
    .filter(Boolean)
    .join(' • ');

  const encodedTitle = encodeURIComponent(
    `${profile.firstName} ${profile.lastInitial}. — verified scholar-athlete on GradeUp HS`
  );
  const encodedUrl = encodeURIComponent(publicUrl);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  return (
    <section className="mx-auto max-w-5xl px-6 pt-16 pb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Verified Scholar-Athlete
      </p>
      <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
        {profile.firstName} {profile.lastInitial}.
      </h1>
      {metaLine && (
        <p className="mt-2 text-sm text-white/70 md:text-base">{metaLine}</p>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Current GPA
          </p>
          <p className="mt-1 font-display text-6xl leading-none text-white">
            {formatGpa(profile.currentGpa)}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tierCls}`}
          aria-label={`GPA verification: ${tierLabel(tier)}`}
        >
          {tierLabel(tier)}
        </span>
      </div>

      {profile.publicBio && (
        <p className="mt-6 max-w-2xl text-base text-white/80 md:text-lg">
          {profile.publicBio}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={brandSignupHref}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-black hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
        >
          Request a deal
        </Link>
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          aria-label="Share on X (Twitter)"
        >
          Share on X
        </a>
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          aria-label="Share on LinkedIn"
        >
          Share on LinkedIn
        </a>
        <CopyLinkButton url={publicUrl} />
      </div>
    </section>
  );
}

// Tiny client-free copy button. Uses an <a> tag with a data-attr so we
// can hydrate a client handler if desired; for now it falls back to a
// plain link. The full client variant lives in the settings file.
function CopyLinkButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      className="inline-flex min-h-[44px] items-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      aria-label={`Public profile link: ${url}`}
    >
      Copy link
    </a>
  );
}

export default AthletePublicHero;
