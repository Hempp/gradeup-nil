/**
 * MentorProfileCard — compact tile for the /hs/alumni grid.
 *
 * Surfaces the mentor's college, division, sport, specialties, availability,
 * and a link to the full profile. Rate (if any) is shown as a chip — many
 * mentors go pro-bono, so "Free" is a real signal, not a default.
 */

import Link from 'next/link';
import type {
  MentorProfile,
  MentorAvailability,
} from '@/lib/hs-nil/mentors';
import { formatAvailability } from '@/lib/hs-nil/mentors';

export interface MentorProfileCardProps {
  mentor: MentorProfile;
  mentorDisplayName?: string | null;
}

const AVAILABILITY_TONE: Record<MentorAvailability, string> = {
  weekly: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  biweekly: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  monthly: 'border-blue-400/40 bg-blue-400/10 text-blue-200',
  paused: 'border-white/20 bg-white/5 text-white/60',
};

function formatRate(cents: number | null): string {
  if (cents === null) return 'Pro bono';
  if (cents === 0) return 'Free';
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US')}/hr`;
}

export function MentorProfileCard({
  mentor,
  mentorDisplayName,
}: MentorProfileCardProps) {
  const displayName = mentorDisplayName?.trim() || `${mentor.currentSport} mentor`;
  const shownSpecialties = mentor.specialties.slice(0, 3);
  const extraSpecialties = Math.max(0, mentor.specialties.length - 3);

  return (
    <Link
      href={`/hs/alumni/${mentor.id}`}
      className="group block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-white/25 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            {mentor.ncaaDivision} · {mentor.currentSport}
          </p>
          <h3 className="mt-1 font-display text-xl text-white">{displayName}</h3>
          <p className="mt-1 text-sm text-white/70">
            {mentor.collegeName} · {mentor.collegeState}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${AVAILABILITY_TONE[mentor.availability]}`}
        >
          {formatAvailability(mentor.availability)}
        </span>
      </div>

      <p className="mt-4 line-clamp-3 text-sm text-white/75">{mentor.bio}</p>

      {shownSpecialties.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {shownSpecialties.map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-xs text-white/75"
            >
              {s}
            </span>
          ))}
          {extraSpecialties > 0 && (
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/50">
              +{extraSpecialties} more
            </span>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between text-xs text-white/60">
        <span>{formatRate(mentor.hourlyRateCents)}</span>
        <span className="font-semibold text-[var(--accent-primary)] group-hover:underline">
          View profile →
        </span>
      </div>
    </Link>
  );
}

export default MentorProfileCard;
