'use client';

import { useState } from 'react';
import type { ConsentScope } from '@/lib/hs-nil/consent-provider';

interface ConsentSignFormProps {
  token: string;
  parentEmail: string;
  scope: ConsentScope;
  defaultParentFullName?: string | null;
}

type SignatureMethod = 'e_signature' | 'notarized_upload' | 'video_attestation';

export default function ConsentSignForm({
  token,
  parentEmail,
  scope,
  defaultParentFullName,
}: ConsentSignFormProps) {
  const [parentFullName, setParentFullName] = useState(defaultParentFullName ?? '');
  const [relationship, setRelationship] = useState<'parent' | 'legal_guardian'>('parent');
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [scopeAcknowledged, setScopeAcknowledged] = useState(false);
  const [signatureMethod, setSignatureMethod] = useState<SignatureMethod>('e_signature');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit =
    !submitting &&
    parentFullName.trim().length >= 2 &&
    identityConfirmed &&
    scopeAcknowledged &&
    signatureMethod === 'e_signature';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/hs/consent/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentFullName: parentFullName.trim(),
          relationship,
          signatureAcknowledged: true,
          scopeAcknowledged: true,
          signatureMethod,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? 'Signing failed. Please try again.');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-emerald-100"
      >
        <h2 className="font-display text-2xl">Consent signed.</h2>
        <p className="mt-2 text-sm text-white/80">
          Thank you. Your consent is on file. Your athlete will be notified and can now begin
          accepting eligible deals within the scope above. A copy of this consent will be emailed
          to {parentEmail}.
        </p>
      </div>
    );
  }

  // Surface the gating steps so the disabled button never feels silent.
  const checklist: Array<{ label: string; done: boolean }> = [
    { label: 'Enter your legal name', done: parentFullName.trim().length >= 2 },
    { label: 'Confirm you are the parent or legal guardian', done: identityConfirmed },
    { label: 'Acknowledge the consent scope', done: scopeAcknowledged },
  ];
  const remaining = checklist.filter((c) => !c.done).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-describedby="consent-form-help">
      <p id="consent-form-help" className="sr-only">
        Form to sign parental consent for high-school NIL deals.
      </p>

      <div>
        <label htmlFor="parentFullName" className="block text-sm font-medium text-white/80">
          Your full legal name
        </label>
        <input
          id="parentFullName"
          type="text"
          required
          autoComplete="name"
          value={parentFullName}
          onChange={(e) => setParentFullName(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
        />
      </div>

      <div>
        <label htmlFor="relationship" className="block text-sm font-medium text-white/80">
          Your relationship to the athlete
        </label>
        <select
          id="relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as 'parent' | 'legal_guardian')}
          className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
        >
          <option value="parent">Parent</option>
          <option value="legal_guardian">Legal guardian</option>
        </select>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
        <legend className="text-sm font-medium text-white/80">
          Signature method
        </legend>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-white/80">
          <input
            type="radio"
            name="signatureMethod"
            value="e_signature"
            checked={signatureMethod === 'e_signature'}
            onChange={() => setSignatureMethod('e_signature')}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-white">E-signature</span>
            <span className="block text-xs text-white/60">
              Typing your full legal name below counts as your signature.
            </span>
          </span>
        </label>

        <label
          className="flex items-start gap-3 text-sm text-white/40"
          aria-disabled="true"
        >
          <input
            type="radio"
            name="signatureMethod"
            value="notarized_upload"
            disabled
            className="mt-1"
          />
          <span>
            <span className="font-medium">Notarized upload</span>
            <span className="block text-xs">Coming soon.</span>
          </span>
        </label>

        <label
          className="flex items-start gap-3 text-sm text-white/40"
          aria-disabled="true"
        >
          <input
            type="radio"
            name="signatureMethod"
            value="video_attestation"
            disabled
            className="mt-1"
          />
          <span>
            <span className="font-medium">Video attestation</span>
            <span className="block text-xs">Coming soon.</span>
          </span>
        </label>
      </fieldset>

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={identityConfirmed}
            onChange={(e) => setIdentityConfirmed(e.target.checked)}
            className="mt-1"
            required
          />
          <span>
            I confirm I am the <strong>parent or legal guardian</strong> of the named athlete and
            that the name I entered above is my true legal name.
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={scopeAcknowledged}
            onChange={(e) => setScopeAcknowledged(e.target.checked)}
            className="mt-1"
            required
          />
          <span>
            I have read the consent scope (deal categories, maximum deal amount of
            {' '}
            <strong>${scope.maxDealAmount.toLocaleString()}</strong>, duration of
            {' '}
            <strong>{scope.durationMonths} months</strong>) and agree on behalf of my athlete.
          </span>
        </label>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        aria-describedby={remaining > 0 ? 'sign-remaining-hint' : undefined}
        className="inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting && (
          <svg
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.25"
            />
            <path
              d="M22 12a10 10 0 0 1-10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        )}
        {submitting ? 'Recording signature…' : 'Sign consent'}
      </button>

      {remaining > 0 && (
        <p
          id="sign-remaining-hint"
          className="text-center text-xs text-white/50"
          aria-live="polite"
        >
          {remaining === 1
            ? '1 step left before you can sign.'
            : `${remaining} steps left before you can sign.`}
        </p>
      )}
    </form>
  );
}
