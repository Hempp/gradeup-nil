import type { Metadata } from 'next';
import Link from 'next/link';
import BrandHSSignupForm from '@/components/hs/BrandHSSignupForm';

/**
 * HS Brand Signup — /hs/signup/brand
 *
 * Entry point for local brands in the pilot states (CA / FL / GA) to
 * self-serve onto the HS-NIL supply side. Lives inside the (hs) route
 * group, so the HSLayout feature-flag gate already 404s non-flagged
 * users — no extra check needed here.
 *
 * Mirrors the athlete / parent HS signup visual language (dark marketing
 * palette, rounded form card, min 44px touch targets). The actual form
 * logic is a Client Component (BrandHSSignupForm) because Supabase auth
 * signUp needs the browser client to attach the session.
 *
 * Data flow on submit (inside BrandHSSignupForm):
 *   1. supabase.auth.signUp → creates auth.users row with role='brand'.
 *   2. upsert into profiles with role='brand'.
 *   3. INSERT into brands with is_hs_enabled=true + hs_target_states +
 *      hs_deal_categories (new columns from migration
 *      20260418_010_hs_brand_extension).
 *   4. router.push('/hs/brand') on success.
 */

export const metadata: Metadata = {
  title: 'Sponsor HS scholar-athletes — GradeUp HS',
  description:
    'Create a brand account to post NIL deals for high-school scholar-athletes in California, Florida, and Georgia.',
};

export default function HSBrandSignupPage() {
  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-2xl px-6 pt-16 pb-24">
        <Link
          href="/hs/signup"
          className="inline-flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Local brand signup
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">
          Sponsor the next generation of scholar-athletes.
        </h1>
        <p className="mt-3 max-w-xl text-white/70">
          Pick the states you operate in and the kinds of deals you want to
          post. We&rsquo;ll only match you with cleared HS athletes whose
          parents have signed the appropriate consent.
        </p>

        <BrandHSSignupForm />
      </section>
    </main>
  );
}
