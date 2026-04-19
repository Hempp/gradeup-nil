'use client';

/**
 * TransitionProofUpload
 *
 * Uploads an enrollment letter, acceptance letter, or college transcript
 * showing enrolled status to the private `hs-enrollment-proofs` bucket.
 * Mirrors the multipart-form approach used by TranscriptUploadForm.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileUploadDropzone,
  formatFileSize,
  type FileValidation,
} from '@/components/ui/file-upload-dropzone';
import { Button } from '@/components/ui/button';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/png,image/jpeg';
const ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg']);

interface TransitionProofUploadProps {
  transitionId: string;
  /** Whether a proof path is already on file — when true we render "replace" copy. */
  alreadyUploaded?: boolean;
}

export default function TransitionProofUpload({
  transitionId,
  alreadyUploaded = false,
}: TransitionProofUploadProps) {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateFile(file: File): FileValidation {
    if (!ALLOWED_MIME.has(file.type)) {
      return { valid: false, error: 'PDF, PNG, and JPG only.' };
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
    const v = validateFile(f);
    if (!v.valid) {
      setSelectedFile(null);
      setError(v.error ?? 'That file cannot be uploaded.');
      return;
    }
    setSelectedFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Pick a file to upload.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('transitionId', transitionId);
      fd.append('file', selectedFile);
      const res = await fetch('/api/hs/athlete/transition/proof', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Upload failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-xl border border-white/10 bg-white/5 p-6"
    >
      <div>
        <h3 className="font-display text-xl text-white md:text-2xl">
          {alreadyUploaded
            ? 'Replace enrollment proof'
            : 'Upload enrollment proof'}
        </h3>
        <p className="mt-2 text-sm text-white/70">
          One of: enrollment letter from the registrar, official acceptance
          letter with matriculation confirmation, or a college transcript
          showing enrolled status. PDF / PNG / JPG, max 10 MB.
        </p>
      </div>

      <FileUploadDropzone
        accept={ACCEPT}
        maxSize={MAX_BYTES}
        maxFiles={1}
        multiple={false}
        validateFile={validateFile}
        onFilesSelected={onFilesSelected}
        disabled={submitting}
      />

      {error && (
        <p className="rounded-md border border-[var(--color-error,#DA2B57)]/50 bg-[var(--color-error,#DA2B57)]/10 p-3 text-sm text-[var(--color-error,#DA2B57)]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={submitting || !selectedFile}
        >
          {submitting ? 'Uploading…' : 'Upload proof'}
        </Button>
      </div>

      <p className="text-xs text-white/50">
        Your file is stored privately and only reviewed by authorized
        GradeUp staff. Brands never see it.
      </p>
    </form>
  );
}
