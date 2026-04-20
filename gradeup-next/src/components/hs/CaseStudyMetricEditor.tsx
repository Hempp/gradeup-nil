'use client';

/**
 * Inline editor for a case study's metric rows and quote rows.
 * Parent form owns state; this is a pure controlled component.
 */

import { Button } from '@/components/ui/button';
import type { CaseStudyQuoteRole } from '@/lib/hs-nil/case-studies';

export interface MetricDraft {
  metricLabel: string;
  metricValue: string;
  metricHint: string | null;
  displayOrder: number;
}

export interface QuoteDraft {
  quoteBody: string;
  attributedRole: CaseStudyQuoteRole;
  attributedName: string;
  displayOrder: number;
}

const ROLE_OPTIONS: Array<{ value: CaseStudyQuoteRole; label: string }> = [
  { value: 'athlete', label: 'Athlete' },
  { value: 'parent', label: 'Parent' },
  { value: 'brand_marketer', label: 'Brand marketer' },
  { value: 'athletic_director', label: 'Athletic director' },
  { value: 'other', label: 'Other' },
];

interface Props {
  metrics: MetricDraft[];
  onChange: (next: MetricDraft[]) => void;
  quotes: QuoteDraft[];
  onQuotesChange: (next: QuoteDraft[]) => void;
}

export function CaseStudyMetricEditor({
  metrics,
  onChange,
  quotes,
  onQuotesChange,
}: Props) {
  const updateMetric = (idx: number, patch: Partial<MetricDraft>) => {
    const next = metrics.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange(next);
  };
  const removeMetric = (idx: number) => {
    onChange(metrics.filter((_, i) => i !== idx));
  };
  const addMetric = () => {
    onChange([
      ...metrics,
      {
        metricLabel: '',
        metricValue: '',
        metricHint: null,
        displayOrder: metrics.length,
      },
    ]);
  };

  const updateQuote = (idx: number, patch: Partial<QuoteDraft>) => {
    const next = quotes.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    onQuotesChange(next);
  };
  const removeQuote = (idx: number) => {
    onQuotesChange(quotes.filter((_, i) => i !== idx));
  };
  const addQuote = () => {
    onQuotesChange([
      ...quotes,
      {
        quoteBody: '',
        attributedRole: 'brand_marketer',
        attributedName: '',
        displayOrder: quotes.length,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2"
          >
            <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
              <label className="block text-xs">
                <span className="text-white/60">Label</span>
                <input
                  value={m.metricLabel}
                  onChange={(e) =>
                    updateMetric(idx, { metricLabel: e.target.value })
                  }
                  maxLength={120}
                  className="mt-1 w-full rounded-md bg-black/40 border border-white/10 px-2 py-1.5 text-white text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-white/60">Value (freeform)</span>
                <input
                  value={m.metricValue}
                  onChange={(e) =>
                    updateMetric(idx, { metricValue: e.target.value })
                  }
                  maxLength={60}
                  className="mt-1 w-full rounded-md bg-black/40 border border-white/10 px-2 py-1.5 text-white text-sm"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeMetric(idx)}
                  className="text-xs text-red-300 hover:text-red-200"
                >
                  Remove
                </button>
              </div>
            </div>
            <label className="block text-xs">
              <span className="text-white/60">Hint (optional)</span>
              <input
                value={m.metricHint ?? ''}
                onChange={(e) =>
                  updateMetric(idx, {
                    metricHint: e.target.value || null,
                  })
                }
                maxLength={400}
                className="mt-1 w-full rounded-md bg-black/40 border border-white/10 px-2 py-1.5 text-white text-sm"
              />
            </label>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addMetric}>
          + Add metric
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/80">Pull quotes</h3>
        {quotes.map((q, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2"
          >
            <label className="block text-xs">
              <span className="text-white/60">Quote body</span>
              <textarea
                value={q.quoteBody}
                onChange={(e) =>
                  updateQuote(idx, { quoteBody: e.target.value })
                }
                maxLength={2000}
                rows={3}
                className="mt-1 w-full rounded-md bg-black/40 border border-white/10 px-2 py-1.5 text-white text-sm"
              />
            </label>
            <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
              <label className="block text-xs">
                <span className="text-white/60">Role</span>
                <select
                  value={q.attributedRole}
                  onChange={(e) =>
                    updateQuote(idx, {
                      attributedRole: e.target.value as CaseStudyQuoteRole,
                    })
                  }
                  className="mt-1 w-full rounded-md bg-black/40 border border-white/10 px-2 py-1.5 text-white text-sm"
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                <span className="text-white/60">
                  Display name (first name + last initial OR brand)
                </span>
                <input
                  value={q.attributedName}
                  onChange={(e) =>
                    updateQuote(idx, { attributedName: e.target.value })
                  }
                  maxLength={160}
                  className="mt-1 w-full rounded-md bg-black/40 border border-white/10 px-2 py-1.5 text-white text-sm"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeQuote(idx)}
                  className="text-xs text-red-300 hover:text-red-200"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addQuote}>
          + Add quote
        </Button>
      </div>
    </div>
  );
}
