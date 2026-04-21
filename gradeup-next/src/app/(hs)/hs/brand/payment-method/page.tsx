/**
 * Brand Payment-Method Setup — /hs/brand/payment-method
 *
 * Server component. Loads the brand row for the authenticated user and
 * hydrates <PaymentMethodSetupCard /> with the current default payment
 * method id (if any) so the client can show "Change card" rather than
 * "Add card" on repeat visits.
 *
 * Auth + role:
 *   - Unauthenticated → /login?next=/hs/brand/payment-method
 *   - No brand row → /hs/signup/brand
 *   - is_hs_enabled=false → /brand/dashboard (college-only accounts)
 *
 * This page is feature-flag-gated by the (hs)/layout.tsx group.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { PaymentMethodSetupCard } from '@/components/hs/PaymentMethodSetupCard';

export const metadata: Metadata = {
  title: 'Payment method — GradeUp HS',
  description:
    'Attach a payment method to your HS NIL brand account. Charges are held in escrow until you approve each deliverable.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BrandPaymentMethodPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/brand/payment-method');
  }

  const { data: brand } = await supabase
    .from('brands')
    .select(
      'id, company_name, contact_email, contact_name, is_hs_enabled, default_payment_method_id',
    )
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!brand) {
    redirect('/hs/signup/brand?notice=convert');
  }

  if (!brand.is_hs_enabled) {
    redirect('/brand/dashboard');
  }

  const defaultPm = (brand.default_payment_method_id as string | null) ?? null;
  const contactEmail = (brand.contact_email as string | null) ?? null;

  return (
    <main
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '48px 24px',
      }}
    >
      <nav
        style={{ fontSize: 13, marginBottom: 24, color: '#52525B' }}
        aria-label="Breadcrumb"
      >
        <Link href="/hs/brand" style={{ color: '#0070F3', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>Payment method</span>
      </nav>

      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>
        Payment method
      </h1>
      <p
        style={{
          fontSize: 15,
          color: '#52525B',
          margin: '0 0 24px',
          lineHeight: 1.6,
        }}
      >
        {brand.company_name} authorizes a charge the moment a contract is
        fully signed. Funds are held in escrow and released to the parent
        custodian account when you approve the deliverable — if anything
        falls apart in between, we refund in full.
      </p>

      <PaymentMethodSetupCard
        existingPaymentMethodId={defaultPm}
        contactEmail={contactEmail}
      />

      <section
        style={{
          marginTop: 40,
          padding: 20,
          background: '#F9FAFB',
          border: '1px solid #E4E4E7',
          borderRadius: 12,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
          How escrow works
        </h2>
        <ol
          style={{
            fontSize: 14,
            color: '#18181B',
            margin: 0,
            paddingLeft: 20,
            lineHeight: 1.7,
          }}
        >
          <li>
            Contract is signed by brand, athlete, and (when required) their
            parent.
          </li>
          <li>
            We authorize this card for the deal amount. Money sits in escrow,
            not yet released.
          </li>
          <li>Athlete delivers the work and submits it for review.</li>
          <li>
            Brand approves the deliverable — we release from escrow to the
            parent custodian account within 1–2 business days.
          </li>
          <li>
            If the deal is cancelled or disputed in the brand&apos;s favor, the
            charge is refunded in full.
          </li>
        </ol>
      </section>
    </main>
  );
}
