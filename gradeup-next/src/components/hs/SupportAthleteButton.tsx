'use client';

/**
 * SupportAthleteButton — renders a CTA on the public athlete profile that
 * opens a modal for a fan to send the athlete a small NIL payment in
 * exchange for a shoutout or personalized message.
 *
 * Positioning is non-negotiable:
 *   - This is an NIL payment, not a donation.
 *   - It is NOT tax-deductible.
 *   - The supporter receives a deliverable (shoutout / message / content)
 *     from the athlete, so the transaction has an in-kind return.
 *
 * Those claims are load-bearing under IRS AM-2023-004 — the copy below
 * must NOT be softened to 'donate' / 'tip' / 'gift' language.
 */

import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';

const PRESETS = [
  { cents: 500,  label: '$5'  },
  { cents: 1000, label: '$10' },
  { cents: 2500, label: '$25' },
  { cents: 5000, label: '$50' },
] as const;

const MAX_CUSTOM_CENTS = 50_000; // $500

export function SupportAthleteButton({
  username,
  athleteDisplayName,
}: {
  username: string;
  athleteDisplayName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
      >
        <Heart className="h-4 w-4" aria-hidden="true" />
        Send a supporter payment
      </button>

      {open && (
        <SupportModal
          onClose={() => setOpen(false)}
          username={username}
          athleteDisplayName={athleteDisplayName}
        />
      )}
    </>
  );
}

function SupportModal({
  onClose,
  username,
  athleteDisplayName,
}: {
  onClose: () => void;
  username: string;
  athleteDisplayName: string;
}) {
  const [selected, setSelected] = useState<number>(PRESETS[1].cents);
  const [customDollars, setCustomDollars] = useState<string>('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resolveCents(): number | null {
    if (customDollars.trim()) {
      const n = parseFloat(customDollars);
      if (!Number.isFinite(n) || n <= 0) return null;
      const cents = Math.round(n * 100);
      if (cents < 100 || cents > MAX_CUSTOM_CENTS) return null;
      return cents;
    }
    return selected;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountCents = resolveCents();
    if (amountCents == null) {
      setError('Enter an amount between $1 and $500.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email so Stripe can send you a receipt.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/athletes/${encodeURIComponent(username)}/support/checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountCents,
            supporterEmail: email.trim(),
            supporterName: name.trim() || undefined,
            supporterMessage: message.trim() || undefined,
          }),
        },
      );

      const json = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !json.url) {
        setError(json.error ?? 'Could not start checkout. Try again.');
        return;
      }

      // Stripe-hosted checkout.
      window.location.href = json.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--marketing-gray-900)] p-6 text-white">
        <h2 id="support-modal-title" className="font-display text-2xl">
          Send {athleteDisplayName} a supporter payment
        </h2>
        <p className="mt-2 text-sm text-white/60">
          In exchange, the athlete will send you a personalized shoutout or
          thank-you message.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <fieldset>
            <legend className="block text-sm font-medium text-white/80 mb-2">
              Amount
            </legend>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.cents}
                  type="button"
                  onClick={() => {
                    setSelected(p.cents);
                    setCustomDollars('');
                  }}
                  className={`rounded-lg border py-2 text-sm font-semibold transition ${
                    !customDollars && selected === p.cents
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'border-white/15 text-white/70 hover:border-white/30'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="number"
                inputMode="decimal"
                min={1}
                max={500}
                step="0.01"
                placeholder="Or enter a custom amount ($1 – $500)"
                value={customDollars}
                onChange={(e) => setCustomDollars(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-white/30"
              />
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="supporter-email"
              className="block text-sm font-medium text-white/80 mb-1.5"
            >
              Your email <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id="supporter-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label
              htmlFor="supporter-name"
              className="block text-sm font-medium text-white/80 mb-1.5"
            >
              Your name (optional)
            </label>
            <input
              id="supporter-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How should they address you?"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label
              htmlFor="supporter-message"
              className="block text-sm font-medium text-white/80 mb-1.5"
            >
              Message to the athlete (optional)
            </label>
            <textarea
              id="supporter-message"
              maxLength={500}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Go Warriors! Can I get a shoutout for my nephew?"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-white/30 resize-none"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-error)]"
            >
              {error}
            </div>
          )}

          <p className="rounded-md border border-white/10 bg-black/30 p-3 text-xs text-white/50 leading-relaxed">
            <strong className="text-white/70">Important:</strong> This is an
            NIL payment to a student-athlete in exchange for a shoutout or
            personalized message. It is <strong>not a donation</strong> and
            is <strong>not tax-deductible</strong>. The athlete reports this
            amount as NIL income.
          </p>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue to checkout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
