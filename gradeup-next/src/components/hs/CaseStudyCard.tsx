/**
 * Public-facing case-study card used on /business/case-studies.
 * Renders the study hero image, title, subtitle, up to 3 metrics, and tags.
 * Server Component — no client-side state needed.
 */
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { CaseStudySummary } from '@/lib/hs-nil/case-studies';

export function CaseStudyCard({ study }: { study: CaseStudySummary }) {
  return (
    <Link
      href={`/business/case-studies/${study.slug}`}
      className="group card-marketing overflow-hidden flex flex-col hover-lift transition-transform"
    >
      <div className="relative aspect-[16/9] bg-[var(--marketing-gray-900)] overflow-hidden">
        {study.heroImageUrl ? (
          <Image
            src={study.heroImageUrl}
            alt={study.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/20 via-[var(--marketing-gray-900)] to-[var(--accent-gold)]/10" />
        )}
        {study.tags.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {study.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] uppercase tracking-wider text-white/90 font-semibold"
              >
                {tag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-6">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--accent-primary)] transition-colors">
          {study.title}
        </h3>
        {study.subtitle && (
          <p className="text-sm text-[var(--marketing-gray-400)] mb-4 line-clamp-2">
            {study.subtitle}
          </p>
        )}

        {study.topMetrics.length > 0 && (
          <div className="mt-auto grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
            {study.topMetrics.map((m) => (
              <div key={m.id} className="text-center">
                <div className="text-base font-bold text-[var(--accent-success)] tabular-nums truncate">
                  {m.metricValue}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--marketing-gray-500)] mt-0.5 truncate">
                  {m.metricLabel}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-primary)] mt-4">
          Read case study
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
