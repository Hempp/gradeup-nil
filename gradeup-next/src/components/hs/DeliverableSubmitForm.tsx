'use client';

/**
 * DeliverableSubmitForm
 *
 * Athlete-facing client component. Lets the athlete pick a submission
 * type (social post URL, image proof, external link, text note, or
 * receipt) and ship the proof to
 * POST /api/hs/deals/[id]/deliverables.
 *
 * Design notes:
 *   - 44px touch targets (radios + buttons) per HS accessibility bar.
 *   - Conditional fields per type.
 *   - Optional note textarea appended to every type.
 *   - Optimistic "Submitted" state with a 5s reset so the athlete can
 *     add another proof in the same session (e.g., social post + image
 *     of the event).
 *   - Full a11y: labeled fields, aria-invalid + aria-describedby on
 *     error, aria-live for the status message.
 */

import { useCallback, useId, useRef, useState } from 'react';
import { FileUploadDropzone } from '@/components/ui/file-upload-dropzone';
import { compressImage } from '@/lib/services/storage';

type SubmissionType =
  | 'social_post_url'
  | 'image_proof'
  | 'text_note'
  | 'external_link'
  | 'receipt';

type PlatformOption =
  | 'instagram'
  | 'tiktok'
  | 'twitter_x'
  | 'linkedin'
  | 'facebook'
  | 'youtube'
  | 'other';

type ReceiptMode = 'url' | 'file';

interface Props {
  dealId: string;
  /**
   * Called after a successful submission so the parent page can revalidate
   * its server-rendered submission list.
   */
  onSubmitted?: () => void;
}

const TYPE_OPTIONS: ReadonlyArray<{
  id: SubmissionType;
  label: string;
  hint: string;
}> = [
  {
    id: 'social_post_url',
    label: 'Social post',
    hint: 'Paste the link to your post on Instagram, TikTok, X, etc.',
  },
  {
    id: 'image_proof',
    label: 'Image proof',
    hint: 'Upload a photo or screenshot (PDF/PNG/JPEG, max 10MB).',
  },
  {
    id: 'external_link',
    label: 'External link',
    hint: 'A link to an article, event page, or stream recording.',
  },
  {
    id: 'text_note',
    label: 'Text note',
    hint: 'Write a short description when there is no link or file.',
  },
  {
    id: 'receipt',
    label: 'Receipt',
    hint: 'Proof of purchase or attendance — link or file.',
  },
];

const PLATFORM_OPTIONS: ReadonlyArray<{ id: PlatformOption; label: string }> = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'twitter_x', label: 'X / Twitter' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'other', label: 'Other' },
];

export function DeliverableSubmitForm({ dealId, onSubmitted }: Props) {
  const [submissionType, setSubmissionType] = useState<SubmissionType>(
    'social_post_url'
  );
  const [contentUrl, setContentUrl] = useState('');
  const [note, setNote] = useState('');
  const [platform, setPlatform] = useState<PlatformOption>('instagram');
  const [file, setFile] = useState<File | null>(null);
  const [receiptMode, setReceiptMode] = useState<ReceiptMode>('url');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const errorId = useId();
  const statusId = useId();
  const urlInputId = useId();
  const noteInputId = useId();
  const platformInputId = useId();
  const receiptUrlInputId = useId();

  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAfterSuccess = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setContentUrl('');
      setNote('');
      setFile(null);
      setSuccess(false);
    }, 5000);
  }, []);

  const validate = useCallback((): string | null => {
    switch (submissionType) {
      case 'social_post_url':
        if (!contentUrl.trim()) return 'Paste the link to your social post.';
        if (!isLikelyUrl(contentUrl)) return 'That does not look like a valid URL.';
        return null;
      case 'external_link':
        if (!contentUrl.trim()) return 'Paste a link.';
        if (!isLikelyUrl(contentUrl)) return 'That does not look like a valid URL.';
        return null;
      case 'image_proof':
        if (!file) return 'Upload an image or PDF.';
        if (file.size > 10 * 1024 * 1024) return 'File is larger than 10MB.';
        return null;
      case 'text_note':
        if (!note.trim()) return 'Write a short description of what you delivered.';
        return null;
      case 'receipt':
        if (receiptMode === 'url') {
          if (!contentUrl.trim()) return 'Paste the receipt link.';
          if (!isLikelyUrl(contentUrl)) return 'That does not look like a valid URL.';
        } else {
          if (!file) return 'Upload the receipt file.';
          if (file.size > 10 * 1024 * 1024) return 'File is larger than 10MB.';
        }
        return null;
    }
  }, [submissionType, contentUrl, note, file, receiptMode]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(false);

      const validation = validate();
      if (validation) {
        setError(validation);
        return;
      }

      setSubmitting(true);
      try {
        const isFileMode =
          submissionType === 'image_proof' ||
          (submissionType === 'receipt' && receiptMode === 'file');

        let res: Response;
        if (isFileMode) {
          // Compress phone-camera JPGs/PNGs before upload. A 4032×3024
          // shot from a phone is often 5-8MB; resized to 2000px wide +
          // re-encoded at 0.85 quality it drops to ~400-800KB with no
          // visible loss at feed scale. compressImage returns the
          // original untouched for non-image types or if compression
          // would make it larger.
          const fileToSend =
            file && file.type.startsWith('image/')
              ? await compressImage(file, 2000, 0.85).catch(() => file)
              : file;

          const form = new FormData();
          form.append('submissionType', submissionType);
          if (fileToSend) form.append('file', fileToSend);
          if (note.trim()) form.append('note', note.trim());
          res = await fetch(`/api/hs/deals/${dealId}/deliverables`, {
            method: 'POST',
            body: form,
          });
        } else {
          const payload: Record<string, unknown> = {
            submissionType,
          };
          if (contentUrl.trim()) payload.contentUrl = contentUrl.trim();
          if (note.trim()) payload.note = note.trim();
          if (submissionType === 'social_post_url') payload.platform = platform;
          res = await fetch(`/api/hs/deals/${dealId}/deliverables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error || `Submission failed (${res.status}).`);
        }

        setSuccess(true);
        resetAfterSuccess();
        onSubmitted?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Submission failed.');
      } finally {
        setSubmitting(false);
      }
    },
    [
      validate,
      submissionType,
      receiptMode,
      file,
      contentUrl,
      note,
      platform,
      dealId,
      onSubmitted,
      resetAfterSuccess,
    ]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8"
      aria-describedby={error ? errorId : undefined}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Submit deliverable
        </p>
        <h2 className="mt-2 font-display text-2xl text-white">
          Show the brand the work
        </h2>
        <p className="mt-2 text-sm text-white/70">
          Pick the format that fits — link, photo, or note. You can submit
          more than one piece of proof if the deliverable has multiple parts.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-white/80">Type</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {TYPE_OPTIONS.map((opt) => {
            const checked = submissionType === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  checked
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="submissionType"
                  value={opt.id}
                  checked={checked}
                  onChange={() => {
                    setSubmissionType(opt.id);
                    setError(null);
                    setFile(null);
                  }}
                  className="mt-1 h-4 w-4"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-white">
                    {opt.label}
                  </span>
                  <span className="text-xs text-white/60">{opt.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {submissionType === 'social_post_url' && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor={platformInputId}
              className="block text-sm font-medium text-white/80"
            >
              Platform
            </label>
            <select
              id={platformInputId}
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformOption)}
              className="mt-2 min-h-[44px] w-full rounded-lg border border-white/10 bg-white/5 px-3 text-white focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.id} value={p.id} className="bg-black">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <UrlField
            id={urlInputId}
            label="Post URL"
            value={contentUrl}
            onChange={setContentUrl}
            placeholder="https://instagram.com/p/..."
            invalid={Boolean(error)}
            describedBy={error ? errorId : undefined}
          />
        </div>
      )}

      {submissionType === 'external_link' && (
        <UrlField
          id={urlInputId}
          label="Link"
          value={contentUrl}
          onChange={setContentUrl}
          placeholder="https://..."
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
        />
      )}

      {submissionType === 'image_proof' && (
        <div>
          <label className="block text-sm font-medium text-white/80">
            Upload proof
          </label>
          <div className="mt-2">
            <FileUploadDropzone
              accept="application/pdf,image/png,image/jpeg"
              maxSize={10 * 1024 * 1024}
              multiple={false}
              onFilesSelected={(files) => {
                setFile(files[0] ?? null);
                setError(null);
              }}
              showPreviews
            />
          </div>
        </div>
      )}

      {submissionType === 'receipt' && (
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-white/80">
              Receipt format
            </legend>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setReceiptMode('url');
                  setFile(null);
                  setError(null);
                }}
                aria-pressed={receiptMode === 'url'}
                className={`min-h-[44px] rounded-lg border px-4 text-sm transition-colors ${
                  receiptMode === 'url'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                }`}
              >
                Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setReceiptMode('file');
                  setContentUrl('');
                  setError(null);
                }}
                aria-pressed={receiptMode === 'file'}
                className={`min-h-[44px] rounded-lg border px-4 text-sm transition-colors ${
                  receiptMode === 'file'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                }`}
              >
                File
              </button>
            </div>
          </fieldset>

          {receiptMode === 'url' ? (
            <UrlField
              id={receiptUrlInputId}
              label="Receipt link"
              value={contentUrl}
              onChange={setContentUrl}
              placeholder="https://..."
              invalid={Boolean(error)}
              describedBy={error ? errorId : undefined}
            />
          ) : (
            <div>
              <label className="block text-sm font-medium text-white/80">
                Upload receipt
              </label>
              <div className="mt-2">
                <FileUploadDropzone
                  accept="application/pdf,image/png,image/jpeg"
                  maxSize={10 * 1024 * 1024}
                  multiple={false}
                  onFilesSelected={(files) => {
                    setFile(files[0] ?? null);
                    setError(null);
                  }}
                  showPreviews
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label
          htmlFor={noteInputId}
          className="block text-sm font-medium text-white/80"
        >
          {submissionType === 'text_note'
            ? 'What did you deliver?'
            : 'Note (optional)'}
        </label>
        <textarea
          id={noteInputId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder={
            submissionType === 'text_note'
              ? 'e.g., "Appearance completed Saturday at Cypress HS football game. 40+ autographs signed."'
              : 'Optional: add context the brand should know.'
          }
          className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
          aria-invalid={submissionType === 'text_note' ? Boolean(error) : undefined}
          aria-describedby={
            submissionType === 'text_note' && error ? errorId : undefined
          }
        />
      </div>

      {error && (
        <div
          id={errorId}
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100"
        >
          {error}
        </div>
      )}

      <div id={statusId} aria-live="polite" className="min-h-[1.25rem] text-sm">
        {success && (
          <span className="text-emerald-300">
            Submitted — brand notified.
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-6 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : success ? 'Submitted' : 'Submit'}
        </button>
      </div>
    </form>
  );
}

interface UrlFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}

function UrlField(props: UrlFieldProps) {
  return (
    <div>
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-white/80"
      >
        {props.label}
      </label>
      <input
        id={props.id}
        type="url"
        inputMode="url"
        autoComplete="url"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="mt-2 min-h-[44px] w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
        aria-invalid={props.invalid || undefined}
        aria-describedby={props.describedBy}
      />
    </div>
  );
}

function isLikelyUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default DeliverableSubmitForm;
