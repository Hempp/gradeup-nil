/**
 * /hs/brand/campaigns/new — create a multi-athlete HS campaign
 *
 * Server Component wrapper. Auth + HS-brand gate, then renders
 * CampaignCreateForm (Client) with the brand's target states preset
 * so the state-picker shows the pilot states they've opted into.
 *
 * Optional ?template=SLUG query: when present, we call cloneTemplate
 * server-side and hand the prefilled draft to CampaignCreateForm as
 * `initialTemplate`. Clone is logged in campaign_template_uses; the
 * campaign-create POST back-fills the conversion link when the brand
 * eventually submits. Missing / invalid / unpublished slugs fall back
 * silently to the blank form.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CampaignCreateForm from '@/components/hs/CampaignCreateForm';
import StartFromTemplatePanel from '@/components/hs/StartFromTemplatePanel';
import {
  cloneTemplate,
  type CampaignTemplateClone,
} from '@/lib/hs-nil/campaign-templates';

export const metadata: Metadata = {
  title: 'Create a campaign — GradeUp HS',
  description:
    'Create a multi-athlete HS NIL campaign. State-rule pre-evaluation runs against the most restrictive target state.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BrandRow {
  id: string;
  company_name: string;
  is_hs_enabled: boolean | null;
  hs_target_states: string[] | null;
}

export default async function HSBrandCampaignCreatePage({
  searchParams,
}: {
  searchParams?: Promise<{ template?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/hs/brand/campaigns/new');
  }

  const { data: brandData } = await supabase
    .from('brands')
    .select('id, company_name, is_hs_enabled, hs_target_states')
    .eq('profile_id', user.id)
    .maybeSingle();
  const brand = (brandData as BrandRow | null) ?? null;
  if (!brand) {
    redirect('/hs/signup/brand?notice=convert');
  }
  if (brand.is_hs_enabled !== true) {
    redirect('/brand/dashboard');
  }

  // Resolve optional ?template=SLUG. Clone is logged server-side.
  const params = searchParams ? await searchParams : undefined;
  const templateSlug = params?.template;
  let initialTemplate: CampaignTemplateClone | null = null;
  if (templateSlug) {
    try {
      const cloneResult = await cloneTemplate({
        templateSlug,
        brandId: brand.id,
      });
      if (cloneResult.ok) {
        initialTemplate = cloneResult.clone;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[campaigns/new] cloneTemplate failed', err);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-2xl px-6 pt-16 pb-24">
        <Link
          href="/hs/brand/campaigns"
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          ← Back to campaigns
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          {brand.company_name}
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">
          Create a campaign.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/70">
          One brief, many athletes. State-rule pre-evaluation runs against
          the most restrictive pilot state in your target list before the
          draft saves.
        </p>

        {!initialTemplate && (
          <>
            <p className="mt-4 text-xs text-white/60">
              <Link
                href="/hs/brand/campaigns/templates"
                className="font-semibold text-[var(--accent-primary)] underline-offset-2 hover:underline"
              >
                Start from a template instead?
              </Link>{' '}
              Pre-filled briefs you can clone and customize in about two
              minutes.
            </p>
            <StartFromTemplatePanel />
          </>
        )}

        <CampaignCreateForm
          brandOperatingStates={brand.hs_target_states ?? []}
          initialTemplate={initialTemplate}
        />
      </section>
    </main>
  );
}
