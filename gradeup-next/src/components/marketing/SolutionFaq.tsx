/**
 * SolutionFaq — accessible FAQ block + JSON-LD schema.org/FAQPage emitter.
 *
 * Used at the bottom of every /solutions/* persona page. We deliberately
 * use <details>/<summary> for keyboard-native expand-collapse so the block
 * works with zero JS (server component) while still being WCAG 2.1.1
 * compliant.
 *
 * JSON-LD is emitted through next/script with id-scoped type="application/ld+json"
 * so Google can index rich FAQ results. Content is generated server-side from
 * the `items` prop (developer-authored strings), so injection risk is nil.
 */
import type { ReactNode } from 'react';
import Script from 'next/script';

export interface FaqItem {
  question: string;
  /** Plain text answer. Kept as string so JSON-LD stays valid. */
  answer: string;
}

export interface SolutionFaqProps {
  heading?: string;
  subheading?: string;
  items: FaqItem[];
  /** Optional extra content rendered below the list (e.g. a CTA row). */
  footer?: ReactNode;
  /** Used for the schema @id so multiple pages don't collide. */
  pageUrl: string;
  /** Unique id for the injected <script> — must be unique per page. */
  scriptId: string;
}

export function SolutionFaq({
  heading = 'Common questions',
  subheading,
  items,
  footer,
  pageUrl,
  scriptId,
}: SolutionFaqProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: it.answer,
      },
    })),
  };

  return (
    <section
      aria-label="Frequently asked questions"
      className="bg-[var(--marketing-gray-950)] py-20 border-t border-white/10"
    >
      <Script
        id={scriptId}
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(jsonLd)}
      </Script>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
          {heading}
        </h2>
        {subheading ? (
          <p className="mt-3 text-white/70 text-lg">{subheading}</p>
        ) : null}

        <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
          {items.map((it, i) => (
            <details key={i} className="group py-5">
              <summary className="flex items-start justify-between gap-4 cursor-pointer list-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-sm py-1">
                <span className="text-lg font-semibold text-white">
                  {it.question}
                </span>
                <span
                  aria-hidden="true"
                  className="flex-shrink-0 mt-1 h-6 w-6 rounded-full border border-white/20 text-white/70 flex items-center justify-center transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-white/70 leading-relaxed">{it.answer}</p>
            </details>
          ))}
        </div>

        {footer ? <div className="mt-10">{footer}</div> : null}
      </div>
    </section>
  );
}
