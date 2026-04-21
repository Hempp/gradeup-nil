'use client';

/**
 * PaymentMethodSetupCard
 * ----------------------------------------------------------------------------
 * Client-side card for attaching a payment method to a brand's Stripe
 * Customer. The platform does NOT include @stripe/stripe-js as a dep, so we
 * implement this as a plain HTML card-details form that calls our
 * /api/hs/brand/payment-method/setup to get a SetupIntent, then confirms
 * via a Stripe.js script loaded from CDN (lazy) at interaction time.
 *
 * Design choice:
 *   - For the MVP we keep the UI minimal: the server returns a SetupIntent
 *     client_secret. In dev (no Stripe key) we short-circuit and write a
 *     `pm_stub_*` id via /confirm. In production, the client uses the Stripe.js
 *     global loaded on demand to confirm a card SetupIntent and returns the
 *     resulting payment_method.id to /confirm.
 *
 * Accessibility:
 *   - Native form controls with labels, errors announced via aria-live.
 *   - Touch targets >= 44px. Focus ring preserved on all controls.
 *
 * Security:
 *   - Card PAN is NEVER posted to our server. In production it only ever
 *     touches Stripe.js in the user's browser.
 *   - The API secret key never enters the client bundle — all server
 *     interactions go through our /api/hs/brand/payment-method routes.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
  /** Current default payment method id, if any. Renders a "change card" CTA. */
  existingPaymentMethodId?: string | null;
  /** Brand contact email — prefilled for Stripe's receipt. */
  contactEmail?: string | null;
}

type Phase = 'idle' | 'requesting' | 'collecting' | 'confirming' | 'done' | 'error';

interface StripeGlobal {
  confirmCardSetup: (
    clientSecret: string,
    data: { payment_method: { card: unknown; billing_details?: { email?: string } } },
  ) => Promise<{
    setupIntent?: { payment_method?: string | { id: string }; status: string };
    error?: { message: string };
  }>;
  elements: () => {
    create: (
      type: string,
      options?: Record<string, unknown>,
    ) => {
      mount: (selector: string | HTMLElement) => void;
      on: (event: string, cb: (e: unknown) => void) => void;
      unmount: () => void;
    };
  };
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeGlobal;
  }
}

export function PaymentMethodSetupCard({
  existingPaymentMethodId = null,
  contactEmail = null,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [showForm, setShowForm] = useState(!existingPaymentMethodId);

  const publishableKey = useMemo(
    () => process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
    [],
  );

  const loadStripeJs = useCallback((): Promise<StripeGlobal | null> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(null);
      if (window.Stripe) {
        return resolve(window.Stripe(publishableKey));
      }
      const existing = document.querySelector(
        'script[data-stripe-js="true"]',
      ) as HTMLScriptElement | null;
      const finish = () => {
        if (window.Stripe) resolve(window.Stripe(publishableKey));
        else resolve(null);
      };
      if (existing) {
        existing.addEventListener('load', finish, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.dataset.stripeJs = 'true';
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => resolve(null), { once: true });
      document.head.appendChild(script);
    });
  }, [publishableKey]);

  // Kick off the SetupIntent when the form becomes visible.
  useEffect(() => {
    if (!showForm || clientSecret) return;
    let cancelled = false;

    const run = async () => {
      setPhase('requesting');
      setError(null);
      try {
        const res = await fetch('/api/hs/brand/payment-method/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error ?? `Setup failed (${res.status})`);
        }
        if (cancelled) return;
        setClientSecret(json.clientSecret as string);
        setDevMode(Boolean(json.dev));
        setPhase('collecting');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Setup failed');
        setPhase('error');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [showForm, clientSecret]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!clientSecret) return;
      setPhase('confirming');
      setError(null);

      try {
        let paymentMethodId: string;

        if (devMode || !publishableKey) {
          // Dev/stub — server accepts any pm_* id.
          paymentMethodId = `pm_stub_${Math.random().toString(36).slice(2, 10)}`;
        } else {
          const stripe = await loadStripeJs();
          if (!stripe) throw new Error('Could not load Stripe.js');
          const form = e.currentTarget;
          const cardNumber = (form.elements.namedItem('cardNumber') as HTMLInputElement)
            .value;
          const expiry = (form.elements.namedItem('cardExpiry') as HTMLInputElement)
            .value;
          const cvc = (form.elements.namedItem('cardCvc') as HTMLInputElement).value;
          const [expMonth, expYear] = expiry.split('/').map((s) => s.trim());

          const { setupIntent, error: confirmErr } = await stripe.confirmCardSetup(
            clientSecret,
            {
              payment_method: {
                card: {
                  number: cardNumber.replace(/\s+/g, ''),
                  exp_month: Number(expMonth),
                  exp_year:
                    expYear.length === 2 ? 2000 + Number(expYear) : Number(expYear),
                  cvc,
                },
                billing_details: { email: contactEmail ?? undefined },
              },
            },
          );
          if (confirmErr) throw new Error(confirmErr.message);
          if (!setupIntent || !setupIntent.payment_method) {
            throw new Error('Stripe did not return a payment method.');
          }
          paymentMethodId =
            typeof setupIntent.payment_method === 'string'
              ? setupIntent.payment_method
              : setupIntent.payment_method.id;
        }

        const res = await fetch('/api/hs/brand/payment-method/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethodId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error ?? `Save failed (${res.status})`);
        }

        setPhase('done');
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Confirmation failed');
        setPhase('error');
      }
    },
    [clientSecret, contactEmail, devMode, loadStripeJs, publishableKey],
  );

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  if (!showForm && existingPaymentMethodId) {
    return (
      <div
        data-testid="payment-method-existing"
        style={{
          border: '1px solid #E4E4E7',
          borderRadius: 12,
          padding: 24,
          background: '#FFFFFF',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Payment method on file
        </div>
        <div style={{ fontSize: 14, color: '#52525B', marginBottom: 16 }}>
          A card is saved for future deal charges. Updating the card re-runs
          a zero-dollar authorization.
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setClientSecret(null);
            setPhase('idle');
          }}
          style={{
            minHeight: 44,
            padding: '10px 20px',
            borderRadius: 8,
            border: '1px solid #0070F3',
            color: '#0070F3',
            background: '#FFFFFF',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Change card
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div
        data-testid="payment-method-saved"
        style={{
          border: '1px solid #0B875E',
          borderRadius: 12,
          padding: 24,
          background: '#F0FDF4',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0B875E' }}>
          Payment method saved.
        </div>
        <p style={{ fontSize: 14, color: '#166534', margin: '8px 0 0' }}>
          We&apos;ll use this card to authorize each deal you sign. Charges are
          held in escrow and released when you approve the deliverable.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="payment-method-form"
      style={{
        border: '1px solid #E4E4E7',
        borderRadius: 12,
        padding: 24,
        background: '#FFFFFF',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        Add a payment method
      </div>
      <div style={{ fontSize: 14, color: '#52525B', marginBottom: 20 }}>
        Authorized when a contract is fully signed. Held in escrow until you
        approve the deliverable.
      </div>

      {phase === 'requesting' && (
        <div
          aria-live="polite"
          style={{ fontSize: 14, color: '#52525B', marginBottom: 12 }}
        >
          Preparing setup&hellip;
        </div>
      )}

      {devMode && (
        <div
          style={{
            fontSize: 12,
            color: '#7C2D12',
            background: '#FEF3C7',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          Dev mode — no real card will be charged. Submit to stamp a stub pm_*
          id.
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="cardNumber"
          style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}
        >
          Card number
        </label>
        <input
          id="cardNumber"
          name="cardNumber"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4242 4242 4242 4242"
          disabled={phase === 'confirming' || phase === 'requesting'}
          style={{
            width: '100%',
            minHeight: 44,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #E4E4E7',
            fontSize: 15,
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label
            htmlFor="cardExpiry"
            style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}
          >
            Expiry (MM/YY)
          </label>
          <input
            id="cardExpiry"
            name="cardExpiry"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            disabled={phase === 'confirming' || phase === 'requesting'}
            style={{
              width: '100%',
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #E4E4E7',
              fontSize: 15,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label
            htmlFor="cardCvc"
            style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}
          >
            CVC
          </label>
          <input
            id="cardCvc"
            name="cardCvc"
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            disabled={phase === 'confirming' || phase === 'requesting'}
            style={{
              width: '100%',
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #E4E4E7',
              fontSize: 15,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            marginTop: 16,
            padding: '10px 14px',
            background: '#FEF2F2',
            color: '#991B1B',
            borderRadius: 8,
            fontSize: 14,
            border: '1px solid #FECACA',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="submit"
          disabled={
            phase === 'requesting' || phase === 'confirming' || !clientSecret
          }
          style={{
            minHeight: 44,
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background:
              phase === 'confirming' || !clientSecret ? '#93C5FD' : '#0070F3',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 15,
            cursor:
              phase === 'confirming' || !clientSecret ? 'default' : 'pointer',
          }}
        >
          {phase === 'confirming' ? 'Saving…' : 'Save payment method'}
        </button>
        {existingPaymentMethodId && (
          <button
            type="button"
            onClick={() => setShowForm(false)}
            disabled={phase === 'confirming'}
            style={{
              minHeight: 44,
              padding: '12px 20px',
              borderRadius: 8,
              border: '1px solid #E4E4E7',
              background: '#FFFFFF',
              color: '#18181B',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#52525B', marginTop: 16 }}>
        Card details are submitted to Stripe directly. GradeUp NIL never stores
        your full card number.
      </p>
    </form>
  );
}
