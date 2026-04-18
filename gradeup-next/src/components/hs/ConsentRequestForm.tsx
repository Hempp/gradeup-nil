'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Athlete-facing form to request parental consent.
 *
 * Posts to `/api/hs/consent/initiate`, which generates a signing token and
 * emails the parent. On success we redirect to `/hs/consent/manage?initiated=1`
 * so the manage page can surface a success toast.
 *
 * The athlete picks a scope (which categories, max per-deal amount, duration).
 * These defaults err on the conservative side — small dollar, short window —
 * because parents can always approve a fresh, broader consent later, but
 * broad consent signed accidentally is hard to unwind.
 */

interface DealCategory {
  id: string;
  label: string;
  hint: string;
}

// Keep this list stable — the parent sees these exact strings on the signing
// page and they land in parental_consents.scope.dealCategories. If the list
// changes, old consents still reference the old strings, which is fine — the
// UI renders whatever was signed. Do not rename existing IDs without a
// migration plan.
const DEAL_CATEGORIES: DealCategory[] = [
  {
    id: 'apparel',
    label: 'Apparel & merch',
    hint: 'Shoes, jerseys, branded gear, retail endorsements.',
  },
  {
    id: 'food_beverage',
    label: 'Food & beverage',
    hint: 'Non-alcoholic. Restaurants, snacks, drinks, supplements.',
  },
  {
    id: 'local_business',
    label: 'Local business',
    hint: 'Hometown retailers, dealerships, services, appearances.',
  },
  {
    id: 'training',
    label: 'Training & camps',
    hint: 'Clinics, coaching, facilities, instruction partnerships.',
  },
  {
    id: 'autograph',
    label: 'Autograph & memorabilia',
    hint: 'Signing events, card shows, signed-item sales.',
  },
  {
    id: 'social_media_promo',
    label: 'Social media promo',
    hint: 'Posts, stories, creator content for approved brands.',
  },
];

type Relationship = 'parent' | 'legal_guardian';

export default function ConsentRequestForm() {
  const router = useRouter();

  const [parentEmail, setParentEmail] = useState('');
  const [parentFullName, setParentFullName] = useState('');
  const [relationship, setRelationship] = useState<Relationship>('parent');
  const [categories, setCategories] = useState<Set<string>>(
    new Set(['apparel', 'food_beverage', 'local_business', 'social_media_promo'])
  );
  const [maxDealAmount, setMaxDealAmount] = useState<number>(500);
  const [durationMonths, setDurationMonths] = useState<number>(12);

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim());
    if (!emailOk) errs.parentEmail = 'Enter a valid email address.';
    if (parentFullName.trim().length < 2) {
      errs.parentFullName = 'Enter your parent or guardian’s full name.';
    }
    if (categories.size === 0) {
      errs.categories = 'Pick at least one deal category.';
    }
    if (!Number.isFinite(maxDealAmount) || maxDealAmount <= 0) {
      errs.maxDealAmount = 'Enter a maximum per-deal amount greater than $0.';
    }
    if (
      !Number.isFinite(durationMonths) ||
      durationMonths < 1 ||
      durationMonths > 24
    ) {
      errs.durationMonths = 'Duration must be between 1 and 24 months.';
    }
    return errs;
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/hs/consent/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail: parentEmail.trim(),
          parentFullName: parentFullName.trim(),
          scope: {
            dealCategories: Array.from(categories),
            maxDealAmount: Math.round(maxDealAmount),
            durationMonths: Math.round(durationMonths),
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
      };
      if (!res.ok || !data.ok) {
        // Suppress the `relationship` field — we collect it for the athlete's
        // records (matches UI language on the sign page), but the initiate
        // endpoint doesn't persist it. Field-level errors would be confusing.
        void relationship;
        throw new Error(data.error ?? 'Could not send the consent request.');
      }
      router.push('/hs/consent/manage?initiated=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleCategory(id: string) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setFieldErrors((prev) => ({ ...prev, categories: '' }));
  }

  return (
    <form onSubmit={handleReview} className="space-y-8" noValidate>
      {/* Parent contact */}
      <fieldset className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
        <legend className="px-2 font-display text-lg">Parent or guardian</legend>

        <div>
          <label
            htmlFor="parentFullName"
            className="block text-sm font-medium text-white/80"
          >
            Full legal name
          </label>
          <input
            id="parentFullName"
            type="text"
            autoComplete="name"
            required
            value={parentFullName}
            onChange={(e) => {
              setParentFullName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, parentFullName: '' }));
            }}
            aria-invalid={Boolean(fieldErrors.parentFullName) || undefined}
            aria-describedby={
              fieldErrors.parentFullName ? 'parentFullName-error' : undefined
            }
            className="mt-2 min-h-[44px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
          />
          {fieldErrors.parentFullName && (
            <p
              id="parentFullName-error"
              className="mt-1 text-xs text-red-300"
              role="alert"
            >
              {fieldErrors.parentFullName}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="parentEmail"
            className="block text-sm font-medium text-white/80"
          >
            Email address
          </label>
          <input
            id="parentEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={parentEmail}
            onChange={(e) => {
              setParentEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, parentEmail: '' }));
            }}
            aria-invalid={Boolean(fieldErrors.parentEmail) || undefined}
            aria-describedby={
              fieldErrors.parentEmail ? 'parentEmail-error' : undefined
            }
            className="mt-2 min-h-[44px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
          />
          {fieldErrors.parentEmail && (
            <p
              id="parentEmail-error"
              className="mt-1 text-xs text-red-300"
              role="alert"
            >
              {fieldErrors.parentEmail}
            </p>
          )}
          <p className="mt-2 text-xs text-white/50">
            We&rsquo;ll send a secure signing link to this address. Use an inbox
            they actually check.
          </p>
        </div>

        <div>
          <label
            htmlFor="relationship"
            className="block text-sm font-medium text-white/80"
          >
            Their relationship to you
          </label>
          <select
            id="relationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as Relationship)}
            className="mt-2 min-h-[44px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
          >
            <option value="parent">Parent</option>
            <option value="legal_guardian">Legal guardian</option>
          </select>
          <p className="mt-2 text-xs text-white/50">
            They&rsquo;ll confirm this on their end before signing.
          </p>
        </div>
      </fieldset>

      {/* Scope */}
      <fieldset className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
        <legend className="px-2 font-display text-lg">Deal scope</legend>

        <div>
          <p className="text-sm font-medium text-white/80">
            Deal categories allowed
          </p>
          <p className="mt-1 text-xs text-white/50">
            Pick what you want to be cleared for. You can request a broader
            consent later if something new comes up.
          </p>

          <div
            className="mt-3 grid gap-2 sm:grid-cols-2"
            role="group"
            aria-label="Deal categories"
            aria-describedby={
              fieldErrors.categories ? 'categories-error' : undefined
            }
          >
            {DEAL_CATEGORIES.map((c) => {
              const checked = categories.has(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm transition ${
                    checked
                      ? 'border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/10 text-white'
                      : 'border-white/10 bg-black/20 text-white/70 hover:border-white/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={() => toggleCategory(c.id)}
                  />
                  <span>
                    <span className="block font-medium">{c.label}</span>
                    <span className="mt-0.5 block text-xs text-white/60">
                      {c.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {fieldErrors.categories && (
            <p
              id="categories-error"
              className="mt-2 text-xs text-red-300"
              role="alert"
            >
              {fieldErrors.categories}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="maxDealAmount"
              className="block text-sm font-medium text-white/80"
            >
              Max per-deal amount (USD)
            </label>
            <input
              id="maxDealAmount"
              type="number"
              min={1}
              max={1_000_000}
              step={50}
              required
              value={maxDealAmount}
              onChange={(e) => {
                setMaxDealAmount(Number(e.target.value));
                setFieldErrors((prev) => ({ ...prev, maxDealAmount: '' }));
              }}
              aria-invalid={Boolean(fieldErrors.maxDealAmount) || undefined}
              aria-describedby={
                fieldErrors.maxDealAmount ? 'maxDealAmount-error' : undefined
              }
              className="mt-2 min-h-[44px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
            />
            {fieldErrors.maxDealAmount && (
              <p
                id="maxDealAmount-error"
                className="mt-1 text-xs text-red-300"
                role="alert"
              >
                {fieldErrors.maxDealAmount}
              </p>
            )}
            <p className="mt-2 text-xs text-white/50">
              Any deal above this cap needs fresh parental approval.
            </p>
          </div>

          <div>
            <label
              htmlFor="durationMonths"
              className="block text-sm font-medium text-white/80"
            >
              Duration (months)
            </label>
            <input
              id="durationMonths"
              type="number"
              min={1}
              max={24}
              step={1}
              required
              value={durationMonths}
              onChange={(e) => {
                setDurationMonths(Number(e.target.value));
                setFieldErrors((prev) => ({ ...prev, durationMonths: '' }));
              }}
              aria-invalid={Boolean(fieldErrors.durationMonths) || undefined}
              aria-describedby={
                fieldErrors.durationMonths ? 'durationMonths-error' : undefined
              }
              className="mt-2 min-h-[44px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
            />
            {fieldErrors.durationMonths && (
              <p
                id="durationMonths-error"
                className="mt-1 text-xs text-red-300"
                role="alert"
              >
                {fieldErrors.durationMonths}
              </p>
            )}
            <p className="mt-2 text-xs text-white/50">
              1–24 months. Consent expires automatically.
            </p>
          </div>
        </div>
      </fieldset>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-6 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Review and send
        </button>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--marketing-gray-900,#0a0a0a)] p-6 text-white shadow-xl">
            <h2 id="confirm-title" className="font-display text-2xl">
              Send the request?
            </h2>
            <p className="mt-3 text-sm text-white/80">
              We&rsquo;ll email <strong>{parentEmail.trim()}</strong> with a
              secure signing link. The link expires in 7 days.
            </p>
            <p className="mt-3 text-xs text-white/60">
              Scope: {Array.from(categories).length}{' '}
              {Array.from(categories).length === 1 ? 'category' : 'categories'},
              up to ${Math.round(maxDealAmount).toLocaleString()} per deal, for{' '}
              {Math.round(durationMonths)} months.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="min-h-[44px] rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="min-h-[44px] rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Confirm and send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
