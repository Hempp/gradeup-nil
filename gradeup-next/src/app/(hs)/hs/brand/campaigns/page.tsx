/**
 * /hs/brand/campaigns — brand's campaigns list
 *
 * Server Component. Auth + HS-brand gate matches /hs/brand.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Your campaigns — GradeUp HS',
  description: 'Manage HS NIL campaigns across many athletes at once.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BrandRow {
  id: string;
  company_name: string;
  is_hs_enabled: boolean | null;
}

interface CampaignRow {
  id: string;
  title: string;
  status: string;
  deal_category: string;
  max_athletes: number;
  base_compensation_cents: number;
  target_states: string[] | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default async function HSBrandCampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/hs/brand/campaigns');
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

  const { data: campaigns } = await supabase
    .from('hs_brand_campaigns')
    .select(
      'id, title, status, deal_category, max_athletes, base_compensation_cents, target_states, created_at',
    )
    .eq('brand_id', brand.id)
    .order('created_at', { ascending: false });

  const rows = (campaigns ?? []) as CampaignRow[];

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24">
        <Link
          href="/hs/brand"
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-4xl md:text-5xl">Your campaigns.</h1>
          <Link
            href="/hs/brand/campaigns/new"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black"
          >
            Create a campaign
          </Link>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Deploy one sponsorship brief to many athletes at once. Every
          accepted participant spawns a standard deal row with all HS-NIL
          compliance checks intact.
        </p>

        {rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            <p className="font-semibold text-white">No campaigns yet.</p>
            <p className="mt-1 text-sm text-white/60">
              Create a draft campaign to deploy across multiple athletes.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/hs/brand/campaigns/${r.id}`}
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </p>
                  <p className="mt-1 truncate font-display text-xl text-white">
                    {r.title}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    ${(r.base_compensation_cents / 100).toLocaleString()}{' '}
                    · max {r.max_athletes} athletes
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {r.deal_category} · {(r.target_states ?? []).join(', ')}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
