/**
 * /schools
 *
 * Searchable directory of every featured school on GradeUp. Reads from
 * the same FEATURED_SCHOOLS module that drives the homepage strip.
 *
 * Each card links into /athletes?school={name} which runs a case-
 * insensitive substring match against hs_athlete_profiles.school_name
 * (see lib/hs-nil/athlete-profile.ts).
 */

import { SchoolsDirectoryClient } from './SchoolsDirectoryClient';
import { FEATURED_SCHOOLS } from '@/lib/data/schools';
import { buildMarketingMetadata } from '@/lib/seo';

export const metadata = buildMarketingMetadata({
  title: 'Browse Schools — GradeUp NIL',
  description:
    'Search the schools on GradeUp. NCAA Power 5, HBCU programs, and high-school powerhouses — click a school to see every athlete from that program.',
  path: '/schools',
});

export default function SchoolsPage() {
  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          School Directory
        </p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">
          Every school. Every roster. One place.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/70">
          Search across {FEATURED_SCHOOLS.length} featured schools — from
          Power 5 programs to HBCUs to high-school powerhouses. Click a
          school to browse every verified athlete from that program.
        </p>
      </section>

      <SchoolsDirectoryClient schools={FEATURED_SCHOOLS} />
    </main>
  );
}
