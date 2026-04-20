'use client';

/**
 * ExportPdfButton — client button that triggers a PDF download from a
 * GET endpoint and surfaces a loading / error state while the server
 * renders. Used by:
 *
 *   - /hs/brand/deals/[id]        → "Download deal report"
 *   - /hs/brand/performance       → "Download performance report"
 *     (rendered from inside PdfExportOptions which owns the query params)
 *
 * Behaviour:
 *   - Fetches the URL as a Blob, creates an object URL, triggers an
 *     anchor-click with `download=<filename>`, then revokes the URL.
 *   - Keeps the endpoint's server-side Content-Disposition filename as
 *     the source of truth when the server sends one, falling back to the
 *     `filename` prop on rejections/older browsers.
 *   - On a 4xx/5xx response, reads the error JSON and surfaces the
 *     message inline (aria-live="polite") for ten seconds before
 *     resetting, so the brand sees *why* a download failed.
 *
 * This component intentionally does NOT trigger a plain <a href> — a
 * naive link swallows network errors silently, and the rate-limiter
 * returns JSON for 429s which would open as a tab of error text.
 */
import { useCallback, useState } from 'react';

export interface ExportPdfButtonProps {
  /** Absolute or same-origin path that returns application/pdf on GET. */
  href: string;
  /**
   * Fallback filename used only when the server doesn't send a
   * Content-Disposition header (legacy proxies strip it).
   */
  filename: string;
  /** Button label (e.g. "Download deal report"). */
  label: string;
  /** Optional — text rendered while the download is in-flight. */
  loadingLabel?: string;
  /**
   * Visual variant. 'primary' is the cyan-accent button used on deal
   * pages; 'outline' is the lighter treatment used on performance.
   */
  variant?: 'primary' | 'outline';
  /** Extra classes to merge at the edge of the caller's layout. */
  className?: string;
  /** Hides the button entirely — used when the deal isn't in a paid state. */
  disabled?: boolean;
}

function parseFilenameFromHeaders(headers: Headers): string | null {
  const disposition = headers.get('content-disposition');
  if (!disposition) return null;
  // Match either filename="..." or filename=...
  const re = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i;
  const match = re.test(disposition) ? disposition.match(re) : null;
  return match?.[1] ?? null;
}

export function ExportPdfButton({
  href,
  filename,
  label,
  loadingLabel = 'Preparing PDF…',
  variant = 'primary',
  className,
  disabled = false,
}: ExportPdfButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onClick = useCallback(async () => {
    if (state === 'loading' || disabled) return;
    setState('loading');
    setErrorMsg(null);

    try {
      const res = await fetch(href, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });

      if (!res.ok) {
        // Try to read a JSON error body; if that fails, show status text.
        let msg = `Download failed (${res.status})`;
        try {
          const data = (await res.json()) as { error?: string; message?: string };
          msg = data.error ?? data.message ?? msg;
        } catch {
          /* non-JSON error body — fall back to generic message */
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      const resolvedName = parseFilenameFromHeaders(res.headers) ?? filename;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resolvedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke on the next tick so Safari doesn't clobber the download.
      setTimeout(() => URL.revokeObjectURL(url), 250);

      setState('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed.';
      setErrorMsg(message);
      setState('error');
      // Auto-clear after 10s so the UI doesn't stay stuck.
      window.setTimeout(() => {
        setState('idle');
        setErrorMsg(null);
      }, 10_000);
    }
  }, [href, filename, state, disabled]);

  if (disabled) return null;

  const base =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';
  const variants = {
    primary:
      'bg-[var(--accent-primary)] text-black hover:bg-[var(--accent-primary)]/90',
    outline:
      'border border-white/20 bg-transparent text-white hover:bg-white/10',
  } as const;

  return (
    <div className={className ?? ''}>
      <button
        type="button"
        onClick={onClick}
        disabled={state === 'loading'}
        className={`${base} ${variants[variant]}`}
        aria-busy={state === 'loading'}
      >
        {state === 'loading' ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                opacity="0.25"
              />
              <path
                d="M22 12a10 10 0 0 1-10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            {loadingLabel}
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {label}
          </>
        )}
      </button>

      {state === 'error' && errorMsg && (
        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-xs text-[color:var(--error,#D23B3B)]"
        >
          {errorMsg}
        </p>
      )}
    </div>
  );
}

export default ExportPdfButton;
