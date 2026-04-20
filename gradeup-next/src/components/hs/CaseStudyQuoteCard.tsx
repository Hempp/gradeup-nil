/**
 * Pull-quote card rendered alongside a case-study body.
 * Server Component.
 */
import type { CaseStudyQuote } from '@/lib/hs-nil/case-studies';

const ROLE_LABEL: Record<CaseStudyQuote['attributedRole'], string> = {
  athlete: 'Athlete',
  parent: 'Parent',
  brand_marketer: 'Brand marketer',
  athletic_director: 'Athletic director',
  other: '',
};

export function CaseStudyQuoteCard({ quote }: { quote: CaseStudyQuote }) {
  const roleLabel = ROLE_LABEL[quote.attributedRole];
  return (
    <figure className="rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-6 md:p-8">
      <blockquote className="text-lg md:text-xl text-white leading-relaxed">
        &ldquo;{quote.quoteBody}&rdquo;
      </blockquote>
      <figcaption className="mt-4 text-sm text-[var(--marketing-gray-400)]">
        <span className="font-semibold text-white">{quote.attributedName}</span>
        {roleLabel && (
          <>
            {' '}
            <span className="text-[var(--marketing-gray-500)]">·</span>{' '}
            <span>{roleLabel}</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}
