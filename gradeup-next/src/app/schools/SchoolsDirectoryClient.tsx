'use client';

/**
 * Client half of /schools. Owns the search + tier-filter state so the
 * list filters instantly as the user types. Server-side data comes in
 * via the `schools` prop (FEATURED_SCHOOLS).
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import type { FeaturedSchool, SchoolTier } from '@/lib/data/schools';
import { SCHOOL_TIER_LABELS } from '@/lib/data/schools';

type TierFilter = 'all' | SchoolTier;

const TIER_OPTIONS: Array<{ value: TierFilter; label: string }> = [
  { value: 'all',  label: 'All' },
  { value: 'ncaa', label: 'NCAA' },
  { value: 'hbcu', label: 'HBCU' },
  { value: 'hs',   label: 'High School' },
];

export function SchoolsDirectoryClient({ schools }: { schools: FeaturedSchool[] }) {
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<TierFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schools.filter((s) => {
      if (tier !== 'all' && s.tier !== tier) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        (s.location?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [schools, query, tier]);

  return (
    <>
      {/* Search + tier filter */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search schools by name or location…"
              className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-10 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-white/30"
              aria-label="Search schools"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {TIER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTier(opt.value)}
                aria-pressed={tier === opt.value}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition border ${
                  tier === opt.value
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'border-white/15 text-white/70 hover:border-white/30 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-xs text-white/50">
          Showing {filtered.length} of {schools.length} schools
        </p>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-10 text-center text-white/70">
            <p className="text-lg">No schools match those filters.</p>
            <p className="mt-2 text-sm text-white/50">
              Try a different search term or switch the tier to All.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filtered.map((school) => (
              <Link
                key={school.name}
                href={`/athletes?school=${encodeURIComponent(school.name)}`}
                className="group flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-colors"
                aria-label={`Browse ${school.fullName} athletes`}
              >
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: `${school.color}1A`,
                    boxShadow: `0 0 0 1px ${school.color}33 inset`,
                  }}
                >
                  {school.logo ? (
                    <Image
                      src={school.logo}
                      alt=""
                      width={36}
                      height={36}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="font-bold text-base leading-none"
                      style={{ color: school.color }}
                    >
                      {school.abbrev ?? school.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm md:text-base font-semibold text-white/90 group-hover:text-white transition-colors truncate">
                    {school.fullName}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
                    <span className="uppercase tracking-wide">
                      {SCHOOL_TIER_LABELS[school.tier]}
                    </span>
                    {school.location && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span className="truncate">{school.location}</span>
                      </>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
