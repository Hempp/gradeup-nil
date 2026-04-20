/**
 * /hs/brand/campaigns/templates — Brand-facing template browser.
 *
 * Cards per template. Clicking "Clone this template" routes to
 * /hs/brand/campaigns/new?template=SLUG; the server-side page there
 * calls cloneTemplate() and seeds CampaignCreateForm.
 *
 * Server Component. Auth + HS-brand gate mirrors /new.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CampaignTemplateCard from '@/components/hs/CampaignTemplateCard';
import { listTemplates } from '@/lib/hs-nil/campaign-templates';

export const metadata: Metadata = {
  title: 'Campaign templates — GradeUp HS',
  description:
    'Start from a proven NIL campaign template. Clone, customize, post — in about two minutes.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BrandRow {
  id: string;
  company_name: string;
  is_hs_enabled: boolean | null;
}

export default async function HSBrandCampaignTemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/hs/brand/campaigns/templates');
  }
  const { data: brandData } = await supabase
    .from('brands')
    .select('id, company_name, is_hs_enabled')
    .eq('profile_id', user.id)
    .maybeSingle();
  const brand = (brandData as BrandRow | null) ?? null;
  if (!brand) {
    redirect('/hs/signup/brand?notice=convert');
  }
  if (brand.is_hs_enabled !== true) {
    redirect('/brand/dashboard');
  }

  const templates = await listTemplates({ limit: 50 });

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
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
          Start from a proven template.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70">
          Each template pre-fills title, description, compensation, timeline,
          and deliverables. Clone, edit what you want to change, and post.
          The state-rule pre-evaluation still runs on save.
        </p>
        <div className="mt-4">
          <Link
            href="/hs/brand/campaigns/new"
            className="text-xs text-white/50 underline-offset-2 hover:text-white hover:underline"
          >
            Prefer a blank canvas? Start a custom campaign →
          </Link>
        </div>

        {templates.length === 0 ? (
          <p className="mt-16 text-sm text-white/60">
            No templates published yet. Check back soon.
          </p>
        ) : (
          <ul
            role="list"
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {templates.map((t) => (
              <li key={t.id} className="h-full">
                <CampaignTemplateCard
                  template={t}
                  ctaHref={`/hs/brand/campaigns/new?template=${encodeURIComponent(t.slug)}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
