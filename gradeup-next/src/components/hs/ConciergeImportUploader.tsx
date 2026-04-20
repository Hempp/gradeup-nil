'use client';

/**
 * ConciergeImportUploader
 * -------------------------------------------------------------
 * Admin-facing upload form for a concierge CSV. Captures:
 *   - file (CSV, single select — drag-drop or click-to-pick)
 *   - pilot_state_code (select from PILOT_STATES)
 *   - notes (optional, free-form)
 *
 * On submit POSTs multipart to
 * /api/hs/admin/actions/concierge-import/upload and redirects to the
 * batch detail page on success. Validation failures bubble up as inline
 * errors — the page-level preview surface is where the admin reviews
 * per-row issues.
 */

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PILOT_STATES } from '@/lib/hs-nil/state-rules';

interface UploadResponse {
  ok: boolean;
  batchId?: string;
  rowCount?: number;
  validCount?: number;
  invalidCount?: number;
  error?: string;
}

export function ConciergeImportUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stateCode, setStateCode] = useState<string>('CA');
  const [notes, setNotes] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = useCallback((f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') {
      setError('Please pick a .csv file.');
      return;
    }
    setError(null);
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files?.[0] ?? null;
      handleFile(f);
    },
    [handleFile]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Attach a CSV file first.');
      return;
    }
    if (!stateCode) {
      setError('Select the pilot state this cohort targets.');
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('pilot_state_code', stateCode);
      if (notes.trim()) body.append('notes', notes.trim());

      const res = await fetch('/api/hs/admin/actions/concierge-import/upload', {
        method: 'POST',
        body,
      });
      const data: UploadResponse = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok || !data.batchId) {
        setError(data.error ?? `Upload failed (HTTP ${res.status}).`);
        return;
      }
      router.push(`/hs/admin/concierge-import/${data.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8"
      noValidate
    >
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {/* Drop zone */}
      <label className="block">
        <span className="text-sm font-medium text-white">CSV file</span>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            'mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragActive
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
              : 'border-white/20 bg-white/5 hover:border-white/40',
          ].join(' ')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          aria-label="CSV upload drop zone"
        >
          <p className="text-sm text-white">
            {file ? (
              <>
                <span className="font-semibold">{file.name}</span>
                <span className="text-white/60"> · {(file.size / 1024).toFixed(1)} KB</span>
              </>
            ) : (
              <>
                Drop a CSV here, or <span className="underline">click to pick</span>.
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-white/50">
            Use the template at /docs/HS-NIL-CONCIERGE-IMPORT-TEMPLATE.csv. Max 1 MB.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </label>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-white">Pilot state</span>
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
          >
            {PILOT_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-white/50">
            Every row in this upload must be for this pilot state.
          </p>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-white">Notes (optional)</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Oct 2026 cohort — sourced via Coach network"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting || !file}
        className="mt-6 w-full rounded-xl bg-[var(--accent-primary)] px-6 py-3 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? 'Uploading + validating...' : 'Upload CSV'}
      </button>
      <p className="mt-3 text-xs text-white/50">
        No rows are applied yet — the next screen shows per-row validation so
        you can review before committing.
      </p>
    </form>
  );
}
