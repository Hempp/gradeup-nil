'use client';

/**
 * TranscriptUploadForm — athlete-facing transcript upload (Tier B).
 *
 * Wraps the shared `FileUploadDropzone` primitive plus a claimed-GPA input.
 * Submits a multipart POST to `/api/hs/transcripts/upload`. On success we
 * flip to an optimistic "under review" state; the parent page re-queries
 * submissions on navigation to confirm from the DB.
 *
 * Client-side validation mirrors the API contract (≤10MB, PDF/PNG/JPG,
 * GPA 0-5) so users get immediate feedback. The server validates again —
 * client checks are UX, not security.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileUploadDropzone,
  formatFileSize,
  type FileValidation,
} from '@/components/ui/file-upload-dropzone';
import { Button } from '@/components/ui/button';
import { compressImage } from '@/lib/services/storage';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/png,image/jpeg';
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
]);

interface TranscriptUploadFormProps {
  /** If the athlete already has a pending submission the parent page
   *  renders a waiting state — this form is only mounted when fresh
   *  input is expected. */
  defaultClaimedGpa?: number;
}

export default function TranscriptUploadForm({
  defaultClaimedGpa,
}: TranscriptUploadFormProps) {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [claimedGpa, setClaimedGpa] = useState<string>(
    defaultClaimedGpa !== undefined ? defaultClaimedGpa.toFixed(2) : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  function validateFile(file: File): FileValidation {
    if (!ALLOWED_MIME.has(file.type)) {
      return {
        valid: false,
        error: 'PDF, PNG, and JPG only.',
      };
    }
    if (file.size > MAX_BYTES) {
      return {
        valid: false,
        error: `Max size is ${formatFileSize(MAX_BYTES)}.`,
      };
    }
    return { valid: true };
  }

  function onFilesSelected(files: File[]) {
    setError(null);
    const f = files[0];
    if (!f) return;
    const validation = validateFile(f);
    if (!validation.valid) {
      setSelectedFile(null);
      setError(validation.error ?? 'That file cannot be uploaded.');
      return;
    }
    setSelectedFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Pick a transcript file to upload.');
      return;
    }

    const gpaNum = Number(claimedGpa);
    if (!Number.isFinite(gpaNum) || gpaNum < 0 || gpaNum > 5) {
      setError('Enter a GPA between 0.00 and 5.00.');
      return;
    }

    setSubmitting(true);
    try {
      // Client-side compress for JPG/PNG phone photos. A 4032×3024 photo
      // from a phone is often 4-8MB; after resize + JPEG re-encode it
      // drops to 300-700KB with no visible loss at transcript scan sizes.
      // PDFs are passed through untouched (compressImage early-returns on
      // non-image types). compressImage also returns the original if the
      // re-encoded result is larger, so small files aren't penalized.
      const toUpload = selectedFile.type.startsWith('image/')
        ? await compressImage(selectedFile, 1800, 0.85).catch(() => selectedFile)
        : selectedFile;

      const fd = new FormData();
      fd.append('file', toUpload);
      fd.append('claimed_gpa', String(gpaNum));

      const res = await fetch('/api/hs/transcripts/upload', {
        method: 'POST',
        body: fd,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Upload failed (${res.status})`);
      }

      setSuccess(true);
      // Let the server-rendered status tiles catch up with the new row.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Submitted
        </p>
        <h2 className="mt-2 font-display text-2xl md:text-3xl">
          Your transcript is under review
        </h2>
        <p className="mt-3 text-sm text-white/70">
          A member of our ops team will review your upload, typically within
          two business days. You&rsquo;ll get an email as soon as a decision is
          made. You can close this page — nothing else is needed from you right
          now.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-xl border border-white/10 bg-white/5 p-6"
    >
      <div>
        <h2 className="font-display text-2xl text-white md:text-3xl">
          Upload your transcript
        </h2>
        <p className="mt-2 text-sm text-white/70">
          PDF preferred; PNG or JPG also accepted. Make sure the school name,
          your name, the GPA, and any official seal or registrar signature are
          clearly visible. Max file size 10&nbsp;MB. We typically review within
          two business days.
        </p>
      </div>

      <div>
        <label
          htmlFor="claimed_gpa"
          className="block text-xs font-semibold uppercase tracking-widest text-white/60"
        >
          Your GPA (as listed on the transcript)
        </label>
        <input
          id="claimed_gpa"
          name="claimed_gpa"
          type="number"
          min={0}
          max={5}
          step={0.01}
          inputMode="decimal"
          required
          value={claimedGpa}
          onChange={(e) => setClaimedGpa(e.target.value)}
          className="mt-2 w-40 rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
          placeholder="3.75"
          disabled={submitting}
        />
        <p className="mt-1 text-xs text-white/50">
          Ops will verify this number against the transcript. Mismatches are
          corrected on our side — you won&rsquo;t be penalized for a typo.
        </p>
      </div>

      <div>
        <p className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/60">
          Transcript file
        </p>
        <FileUploadDropzone
          accept={ACCEPT}
          maxSize={MAX_BYTES}
          maxFiles={1}
          multiple={false}
          validateFile={validateFile}
          onFilesSelected={onFilesSelected}
          disabled={submitting}
        />
      </div>

      {error && (
        <p className="rounded-md border border-[var(--color-error,#DA2B57)]/50 bg-[var(--color-error,#DA2B57)]/10 p-3 text-sm text-[var(--color-error,#DA2B57)]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={submitting || !selectedFile}
        >
          {submitting ? 'Uploading…' : 'Submit for review'}
        </Button>
      </div>

      <p className="text-xs text-white/50">
        Your transcript is stored privately and only reviewed by authorized
        GradeUp staff. It is never shared with brands.
      </p>
    </form>
  );
}
