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
import { Share2, Linkedin, Link2 } from 'lucide-react';
import type { PublicAthleteProfile } from '@/lib/hs-nil/athlete-profile';
import { tierLabel, formatGpa } from '@/lib/hs-nil/trajectory';
import type { VerificationTier } from '@/lib/hs-nil/trajectory';

const TIER_TONE: Record<VerificationTier, string> = {
  self_reported: 'border-[var(--hairline)] bg-[var(--cream-surface)] text-[var(--ink-meta)]',
  user_submitted: 'border-[var(--cobalt)]/40 bg-[var(--cobalt)]/10 text-[var(--cobalt)]',
  institution_verified:
    'border-[var(--status-verified)]/40 bg-[var(--status-verified)]/10 text-[var(--status-verified)]',
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
    <section className="marketing-dark pb-8">
      <p className="eyebrow">
        Verified Scholar-Athlete
      </p>
      <h1 className="mt-3 font-display text-4xl text-[var(--ink)] md:text-5xl">
        {profile.firstName} <span className="text-[var(--cobalt)]">{profile.lastInitial}.</span>
      </h1>
      {metaLine && (
        <p className="mt-2 text-sm text-[var(--ink-muted)] md:text-base">{metaLine}</p>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <p className="eyebrow">
            Current GPA
          </p>
          <p className="mt-1 font-display text-6xl leading-none text-[var(--ink)]">
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
        <p className="mt-6 max-w-2xl text-base text-[var(--ink-muted)] md:text-lg">
          {profile.publicBio}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={brandSignupHref}
          className="btn-marketing-primary inline-flex min-h-[44px] items-center rounded-lg px-5 py-2 text-sm font-semibold"
        >
          Request a deal
        </Link>
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-marketing-outline inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          aria-label="Share on X (Twitter)"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share on X
        </a>
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-marketing-outline inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          aria-label="Share on LinkedIn"
        >
          <Linkedin className="h-4 w-4" aria-hidden="true" />
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
      className="btn-marketing-outline inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
      aria-label={`Public profile link: ${url}`}
    >
      <Link2 className="h-4 w-4" aria-hidden="true" />
      Copy link
    </a>
  );
}

export default AthletePublicHero;
