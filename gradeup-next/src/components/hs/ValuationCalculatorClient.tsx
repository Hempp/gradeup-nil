'use client';

/**
 * Client glue for /hs/valuation. Holds the form → result → CTA state
 * machine so the parent page can stay a pure server component (metadata,
 * JSON-LD, static copy).
 */

import { useRef, useState } from 'react';
import { ValuationForm } from './ValuationForm';
import { ValuationResultCard } from './ValuationResultCard';
import { ValuationPostCTA } from './ValuationPostCTA';
import type {
  ValuationInput,
  ValuationResult,
} from '@/lib/hs-nil/valuation';

interface ResultState {
  input: ValuationInput;
  result: ValuationResult;
  requestId: string | null;
}

export function ValuationCalculatorClient() {
  const [state, setState] = useState<ResultState | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  function handleResult(next: ResultState) {
    setState(next);
    // Scroll result into view on small screens.
    queueMicrotask(() => {
      resultRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  if (!state) {
    return <ValuationForm onResult={handleResult} />;
  }

  return (
    <div ref={resultRef} className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <ValuationResultCard result={state.result} />
      <div className="space-y-4">
        <ValuationPostCTA
          inputs={state.input}
          valuationRequestId={state.requestId}
        />
        <button
          type="button"
          onClick={() => setState(null)}
          className="w-full rounded-lg border border-[var(--hairline)] bg-[var(--cream-surface)] px-4 py-3 text-sm font-medium text-[var(--ink-muted)] transition-colors hover:border-[var(--cobalt)] hover:text-[var(--ink)]"
        >
          Recalculate with different inputs
        </button>
      </div>
    </div>
  );
}

export default ValuationCalculatorClient;
