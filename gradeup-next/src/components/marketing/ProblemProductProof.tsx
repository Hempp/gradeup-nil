/**
 * ProblemProductProof — reusable three-step narrative block.
 *
 * Opendorse's persona landings all rest on the same underlying story: here's
 * the problem you have, here's what our product does, here's the proof.
 * This component is the canonical form of that narrative across /solutions/*.
 *
 * Each step renders as a card with a number (01/02/03), eyebrow label,
 * heading, and a bullet list. Cards sit in a three-column grid on desktop,
 * stacked on mobile.
 *
 * Server Component.
 */

export interface ProblemProductProofStep {
  /** 'problem' | 'product' | 'proof' — drives the eyebrow color. */
  kind: 'problem' | 'product' | 'proof';
  heading: string;
  /** Short supporting paragraph shown under the heading. */
  body: string;
  /** Optional bullets — rendered as a checked list (problem uses x marks). */
  bullets?: string[];
}

export interface ProblemProductProofProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  steps: [ProblemProductProofStep, ProblemProductProofStep, ProblemProductProofStep];
}

function colorFor(kind: ProblemProductProofStep['kind']): {
  dot: string;
  text: string;
  border: string;
  label: string;
} {
  if (kind === 'problem') {
    return {
      dot: 'bg-[var(--accent-magenta,_#f43f5e)]',
      text: 'text-[var(--accent-magenta,_#f43f5e)]',
      border: 'border-[var(--accent-magenta,_#f43f5e)]/30',
      label: 'Problem',
    };
  }
  if (kind === 'product') {
    return {
      dot: 'bg-[var(--accent-primary)]',
      text: 'text-[var(--accent-primary)]',
      border: 'border-[var(--accent-primary)]/30',
      label: 'Product',
    };
  }
  return {
    dot: 'bg-[var(--accent-success)]',
    text: 'text-[var(--accent-success)]',
    border: 'border-[var(--accent-success)]/30',
    label: 'Proof',
  };
}

export function ProblemProductProof({
  eyebrow,
  heading,
  subheading,
  steps,
}: ProblemProductProofProps) {
  return (
    <section
      aria-label="Problem, product, proof"
      className="bg-[var(--marketing-gray-950)] py-20 border-y border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(eyebrow || heading || subheading) && (
          <div className="mb-12 max-w-3xl">
            {eyebrow ? (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
                {eyebrow}
              </span>
            ) : null}
            {heading ? (
              <h2 className="font-display mt-4 text-3xl sm:text-4xl font-bold text-white">
                {heading}
              </h2>
            ) : null}
            {subheading ? (
              <p className="mt-3 text-white/70 text-lg">{subheading}</p>
            ) : null}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => {
            const c = colorFor(step.kind);
            const num = String(i + 1).padStart(2, '0');
            return (
              <div
                key={`${step.kind}-${i}`}
                className={`card-marketing p-6 border-l-4 ${c.border}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} aria-hidden="true" />
                  <span className={`text-xs font-bold uppercase tracking-widest ${c.text}`}>
                    {num} · {c.label}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{step.heading}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{step.body}</p>
                {step.bullets && step.bullets.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm text-white/80">
                    {step.bullets.map((b, bi) => (
                      <li key={bi} className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${c.dot}`}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
