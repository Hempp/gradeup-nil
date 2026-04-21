/**
 * Hero for the /brands directory index. Server Component — pure presentational.
 */

import { Sparkles } from 'lucide-react';

export function BrandDirectoryHero({ total }: { total: number }) {
  return (
    <section
      aria-label="Brand directory hero"
      className="relative bg-black pt-32 pb-16 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 200, 0, 0.10) 0%, transparent 50%)',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
          <Sparkles
            className="h-4 w-4 text-[var(--accent-primary)]"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-white/90">
            Brands running HS-NIL campaigns
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl">
          The brand directory.{' '}
          <span className="text-[var(--accent-primary)]">Local. Verified.</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--marketing-gray-400)] max-w-2xl">
          {total > 0
            ? `${total.toLocaleString()} brand${total === 1 ? '' : 's'} running state-compliant NIL deals with scholar-athletes today.`
            : 'Opt-in brand profiles from HS-enabled brands running state-compliant NIL deals.'}
        </p>
      </div>
    </section>
  );
}
