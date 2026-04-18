/**
 * HS Brand — New Deal — /hs/brand/deals/new
 *
 * Server Component wrapper. Loads the signed-in brand's id and the
 * deal categories they opted into at signup, then renders the
 * BrandDealCreateForm (Client Component) with those props.
 *
 * Auth + role gates match /hs/brand.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BrandDealCreateForm from '@/components/hs/BrandDealCreateForm';

export const metadata: Metadata = {
  title: 'Post a new HS deal — GradeUp HS',
  description:
    'Create a new NIL deal for a high-school scholar-athlete. State-rule preflight checks run before you commit.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BrandRow {
  id: string;
  company_name: string;
  is_hs_enabled: boolean | null;
  hs_deal_categories: string[] | null;
}

export default async function HSBrandNewDealPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/brand/deals/new');
  }

  let brand: BrandRow | null = null;
  try {
    const { data } = await supabase
      .from('brands')
      .select('id, company_name, is_hs_enabled, hs_deal_categories')
      .eq('profile_id', user.id)
      .maybeSingle();
    brand = (data as BrandRow | null) ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-brand-new-deal] brand lookup failed', err);
  }

  if (!brand) {
    redirect('/hs/signup/brand?notice=convert');
  }
  if (brand.is_hs_enabled !== true) {
    redirect('/brand/dashboard');
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-2xl px-6 pt-16 pb-24">
        <Link
          href="/hs/brand"
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
          Back to dashboard
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          {brand.company_name}
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">
          Post a new HS deal.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/70 md:text-base">
          Target a specific athlete by email. Run the preflight check to see
          if your state&rsquo;s rules allow this offer BEFORE you commit.
        </p>

        <BrandDealCreateForm
          brandId={brand.id}
          brandCategories={brand.hs_deal_categories ?? []}
        />
      </section>
    </main>
  );
}
