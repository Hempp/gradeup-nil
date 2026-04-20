/**
 * HS Brand Dashboard — /hs/brand
 *
 * Server Component. Route-group feature-flag gate is already enforced by
 * (hs)/layout.tsx, so anonymous / non-HS users 404 before hitting this
 * page.
 *
 * Auth + role gating:
 *   - Unauthenticated → /login?next=/hs/brand
 *   - Authenticated but no brands row → /hs/signup/brand?notice=convert
 *   - Authenticated with brand row but is_hs_enabled=false →
 *     /brand/dashboard (they're college-only; send them to the college
 *     surface rather than denying access).
 *
 * Panels:
 *   1. Active / pending HS deals — deals.brand_id = current AND
 *      target_bracket IN ('high_school', 'both'). Grouped by
 *      pending / active / completed / declined.
 *   2. Available HS athletes — aggregate count in brand's operating
 *      states. No PII — brands do not browse athletes directly; the
 *      founder concierge does matching (or the brand uses email lookup
 *      on the deal creation page).
 *   3. Onboarding checklist — four items with state derived from the
 *      brand row and deal list.
 *
 * Graceful degradation: Any Supabase error is logged server-side and
 * the surface falls back to its empty variant (zero deals / zero
 * matches) so a transient hiccup never 500s the page.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BrandDashboardShell from '@/components/hs/BrandDashboardShell';
import { getNewMatchesForBrand } from '@/lib/hs-nil/matching';
import {
  listPendingReviewsForBrand,
  type PendingReviewRow,
} from '@/lib/hs-nil/approvals';
import { BrandDashboardPerformanceCard } from '@/components/hs/BrandDashboardPerformanceCard';
import { getBrandPerformanceSummary } from '@/lib/hs-nil/earnings';

export const metadata: Metadata = {
  title: 'Brand dashboard — GradeUp HS',
  description:
    'Manage your HS NIL deals, see matched scholar-athletes, and post new offers.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BrandRow {
  id: string;
  company_name: string;
  contact_name: string;
  is_hs_enabled: boolean | null;
  hs_target_states: string[] | null;
  hs_deal_categories: string[] | null;
  last_match_alert_sent_at: string | null;
}

interface DealRow {
  id: string;
  title: string;
  status: string;
  compensation_amount: number;
  target_bracket: string | null;
  created_at: string;
}

const PENDING_STATUSES = new Set(['pending', 'negotiating', 'draft']);
const ACTIVE_STATUSES = new Set(['accepted', 'active', 'in_progress']);
const COMPLETED_STATUSES = new Set(['completed']);
const DECLINED_STATUSES = new Set(['rejected', 'cancelled', 'expired', 'disputed']);

export default async function HSBrandDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/brand');
  }

  // Brand row. profile_id == auth.users.id for brand users.
  let brand: BrandRow | null = null;
  try {
    const { data } = await supabase
      .from('brands')
      .select(
        'id, company_name, contact_name, is_hs_enabled, hs_target_states, hs_deal_categories, last_match_alert_sent_at'
      )
      .eq('profile_id', user.id)
      .maybeSingle();
    brand = (data as BrandRow | null) ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-brand-dashboard] brand lookup failed', err);
  }

  if (!brand) {
    redirect('/hs/signup/brand?notice=convert');
  }

  if (brand.is_hs_enabled !== true) {
    // College-only brand landed here. Bounce to the college surface.
    redirect('/brand/dashboard');
  }

  const operatingStates = brand.hs_target_states ?? [];
  const dealCategories = brand.hs_deal_categories ?? [];

  // HS deals for this brand (pending/active/completed/declined).
  let deals: DealRow[] = [];
  try {
    const { data, error } = await supabase
      .from('deals')
      .select('id, title, status, compensation_amount, target_bracket, created_at')
      .eq('brand_id', brand.id)
      .in('target_bracket', ['high_school', 'both'])
      .order('created_at', { ascending: false });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[hs-brand-dashboard] deals fetch failed', error.message);
    } else {
      deals = (data ?? []) as DealRow[];
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-brand-dashboard] deals fetch threw', err);
  }

  const pending = deals.filter((d) => PENDING_STATUSES.has(d.status));
  const active = deals.filter((d) => ACTIVE_STATUSES.has(d.status));
  const completed = deals.filter((d) => COMPLETED_STATUSES.has(d.status));
  const declined = deals.filter((d) => DECLINED_STATUSES.has(d.status));

  // Aggregate count of HS athletes in the brand's operating states. Count
  // only — no PII. RLS will only let us count rows public-side, so this
  // is a best-effort signal; if the query fails we show a dash.
  let availableAthleteCount: number | null = null;
  if (operatingStates.length > 0) {
    try {
      const { count, error } = await supabase
        .from('hs_athlete_profiles')
        .select('user_id', { count: 'exact', head: true })
        .in('state_code', operatingStates);
      if (!error) {
        availableAthleteCount = count ?? 0;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[hs-brand-dashboard] athlete count failed', err);
    }
  }

  // Suggested-athletes preview. We fetch the ranked list once to get a
  // quick total + "new since last alert" count for the nav card. The
  // full grid renders on /hs/brand/suggested. Any failure here just
  // hides the count — the nav card still links out.
  let suggestedTotal: number | null = null;
  let suggestedNew: number | null = null;
  try {
    const sinceTs = brand.last_match_alert_sent_at
      ? new Date(brand.last_match_alert_sent_at)
      : null;
    const res = await getNewMatchesForBrand(supabase, brand.id, sinceTs, {
      minGpa: 3.0,
      limit: 25,
    });
    suggestedTotal = res.total;
    suggestedNew = res.newSince;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-brand-dashboard] suggested preview failed', err);
  }

  // Deals awaiting this brand's review (status='in_review'). Phase 7
  // BRAND-REVIEW surface — shows above the existing sections so it's
  // the first thing the brand sees when they sign in with a deal
  // queued on them. Best-effort; any failure degrades to an empty
  // array and the section renders its empty state.
  let pendingReviews: PendingReviewRow[] = [];
  try {
    pendingReviews = await listPendingReviewsForBrand(supabase, brand.id, 5);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-brand-dashboard] pending reviews fetch failed', err);
  }

  // Performance summary for the compact dashboard card. Best-effort; the
  // card itself degrades gracefully to its zero-state.
  const performanceSummary = await getBrandPerformanceSummary(
    supabase,
    brand.id,
  ).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[hs-brand-dashboard] performance summary failed', err);
    return {
      totalSpendCents: 0,
      totalDeals: 0,
      averageCompletionDays: null,
      totalShareEvents: 0,
      avgSharesPerDeal: 0,
      firstDealAt: null,
      mostRecentDealAt: null,
    };
  });

  // Campaigns summary — count of non-draft-cancelled campaigns for the
  // "Your campaigns" dashboard section. Best-effort.
  let campaignCount = 0;
  let openCampaignCount = 0;
  try {
    const { data: campaignRows } = await supabase
      .from('hs_brand_campaigns')
      .select('id, status')
      .eq('brand_id', brand.id);
    const rows = (campaignRows ?? []) as Array<{ id: string; status: string }>;
    campaignCount = rows.length;
    openCampaignCount = rows.filter((r) => r.status === 'open').length;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-brand-dashboard] campaign count failed', err);
  }

  // Onboarding checklist state.
  const hasCategories = dealCategories.length > 0;
  const hasDeal = deals.length > 0;
  // Brand payments is a future work item (different from parent payouts).
  const paymentsConnected = false;

  const firstNameMeta = (user.user_metadata as { first_name?: string } | null)
    ?.first_name;

  return (
    <BrandDashboardShell
      brandName={brand.company_name}
      firstName={firstNameMeta ?? brand.contact_name?.split(/\s+/)[0] ?? null}
      operatingStates={operatingStates}
      dealCategories={dealCategories}
    >
      {/* Deals awaiting this brand's review (Phase 7 BRAND-REVIEW) */}
      <PendingReviewsSection reviews={pendingReviews} />

      {/* Aggregate signal */}
      <section aria-labelledby="match-heading" className="mt-10">
        <h2 id="match-heading" className="font-display text-2xl md:text-3xl">
          Athletes in your footprint.
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Athletes in your states"
            value={
              availableAthleteCount === null
                ? '—'
                : availableAthleteCount.toLocaleString()
            }
            hint="Aggregate only. Use a deal to reach a specific athlete."
          />
          <StatCard
            label="Pending deals"
            value={pending.length.toString()}
            hint="Waiting on the athlete, their parent, or your approval."
          />
          <StatCard
            label="Active deals"
            value={active.length.toString()}
            hint="Accepted and in progress."
          />
        </div>
      </section>

      {/* Performance summary card (links to /hs/brand/performance) */}
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <BrandDashboardPerformanceCard summary={performanceSummary} />
      </div>

      {/* Your campaigns section */}
      <section aria-labelledby="campaigns-nav-heading" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
              Multi-athlete
            </p>
            <h2
              id="campaigns-nav-heading"
              className="mt-1 font-display text-xl md:text-2xl"
            >
              Your campaigns.
            </h2>
            <p className="mt-1 text-sm text-white/70">
              {campaignCount === 0
                ? 'Deploy one brief across many athletes.'
                : `${campaignCount} campaign${campaignCount === 1 ? '' : 's'} · ${openCampaignCount} open.`}
            </p>
          </div>
          <Link
            href="/hs/brand/campaigns"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-transparent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Manage campaigns →
          </Link>
        </div>
      </section>

      {/* Suggested athletes nav */}
      <section aria-labelledby="suggested-nav-heading" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-5 md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
              New tool
            </p>
            <h2
              id="suggested-nav-heading"
              className="mt-1 font-display text-xl md:text-2xl"
            >
              Suggested athletes for your brand.
            </h2>
            <p className="mt-1 text-sm text-white/70">
              {suggestedTotal !== null
                ? suggestedTotal === 0
                  ? 'No matches yet — try broadening your filters.'
                  : suggestedNew && suggestedNew > 0
                    ? `${suggestedTotal} match${suggestedTotal === 1 ? '' : 'es'}, including ${suggestedNew} new since your last alert.`
                    : `${suggestedTotal} match${suggestedTotal === 1 ? '' : 'es'} ranked by fit.`
                : 'Browse ranked matches by GPA, state, and category fit.'}
            </p>
          </div>
          <Link
            href="/hs/brand/suggested"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--accent-primary)] bg-transparent px-5 py-3 text-sm font-semibold text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)] hover:text-black"
          >
            View suggested athletes →
          </Link>
        </div>
      </section>

      {/* Deals list */}
      <section aria-labelledby="deals-heading" className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 id="deals-heading" className="font-display text-2xl md:text-3xl">
            Your HS deals.
          </h2>
          <Link
            href="/hs/brand/deals/new"
            className="text-sm font-semibold text-[var(--accent-primary)] hover:underline"
          >
            Post a new deal →
          </Link>
        </div>

        {deals.length === 0 ? (
          <EmptyDealsCard />
        ) : (
          <div className="mt-6 space-y-8">
            <DealGroup title="Pending" deals={pending} emptyCopy="Nothing pending." />
            <DealGroup title="Active" deals={active} emptyCopy="No active deals yet." />
            <DealGroup title="Completed" deals={completed} emptyCopy={null} />
            <DealGroup title="Declined or expired" deals={declined} emptyCopy={null} />
          </div>
        )}
      </section>

      {/* Onboarding checklist */}
      <section
        aria-labelledby="checklist-heading"
        className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
      >
        <h2
          id="checklist-heading"
          className="font-display text-2xl text-white/80"
        >
          Finish setting up.
        </h2>
        <ul className="mt-4 space-y-3 text-sm">
          <ChecklistItem
            done
            title="Brand profile"
            hint="Created at signup. You can add a logo from settings."
          />
          <ChecklistItem
            done={hasCategories}
            title="Deal categories chosen"
            hint="Pick the categories that match the consent parents are signing."
          />
          <ChecklistItem
            done={hasDeal}
            title="Post your first deal"
            hint={
              hasDeal
                ? 'Nice. Keep matching with athletes in your state(s).'
                : 'Target a specific athlete by email — the founder will do the initial match if you need help.'
            }
            cta={!hasDeal ? { label: 'Post a deal', href: '/hs/brand/deals/new' } : undefined}
          />
          <ChecklistItem
            done={paymentsConnected}
            title="Set up payments"
            hint="Brand payments coming soon — parent-custodial payouts ship first."
          />
        </ul>
      </section>
    </BrandDashboardShell>
  );
}

function PendingReviewsSection({ reviews }: { reviews: PendingReviewRow[] }) {
  return (
    <section aria-labelledby="pending-review-heading" className="mt-2">
      <div className="flex items-baseline justify-between">
        <h2
          id="pending-review-heading"
          className="font-display text-2xl md:text-3xl"
        >
          Deals awaiting your review.
        </h2>
        {reviews.length > 0 && (
          /* TODO: build /hs/brand/deals/review index page */
          <Link
            href="/hs/brand/deals/review"
            className="text-sm font-semibold text-[var(--accent-primary)] hover:underline"
          >
            See all →
          </Link>
        )}
      </div>
      {reviews.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm font-medium text-white">
            No deals awaiting review.
          </p>
          <p className="mt-1 text-sm text-white/60">
            Post a new deal to keep your pipeline active.
          </p>
          <Link
            href="/hs/brand/deals/new"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Post a new deal
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => {
            const name =
              [r.athlete_first_name, r.athlete_last_name]
                .filter(Boolean)
                .join(' ') || 'An athlete';
            return (
              <li key={r.id}>
                <Link
                  href={`/hs/brand/deals/${r.id}`}
                  className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-5 transition hover:border-[var(--accent-primary)]/60 hover:bg-[var(--accent-primary)]/10"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                      Awaiting your review
                    </p>
                    <p className="mt-1 truncate font-display text-xl text-white">
                      {r.title}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-white/70">
                      {name} · ${Math.round(r.compensation_amount).toLocaleString()}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-lg text-[var(--accent-primary)]"
                  >
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="mt-2 font-display text-4xl text-white">{value}</p>
      <p className="mt-2 text-xs text-white/50">{hint}</p>
    </div>
  );
}

function DealGroup({
  title,
  deals,
  emptyCopy,
}: {
  title: string;
  deals: DealRow[];
  emptyCopy: string | null;
}) {
  if (deals.length === 0 && emptyCopy === null) return null;
  return (
    <div>
      <h3 className="font-display text-xl text-white/90">{title}</h3>
      {deals.length === 0 ? (
        <p className="mt-2 text-sm text-white/50">{emptyCopy}</p>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {deals.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="text-xs uppercase tracking-wider text-white/40">
                {d.status}
              </p>
              <p className="mt-1 font-semibold text-white">{d.title}</p>
              <p className="mt-1 text-sm text-white/60">
                ${d.compensation_amount.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyDealsCard() {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
      <p className="text-sm font-semibold text-white">No HS deals yet.</p>
      <p className="mt-1 text-sm text-white/60">
        Post your first deal and we&rsquo;ll route it into the parent-consent
        flow. If you need help identifying the right athlete, the founder
        concierge is a note away.
      </p>
      <Link
        href="/hs/brand/deals/new"
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
      >
        Post a new deal
      </Link>
    </div>
  );
}

function ChecklistItem({
  done,
  title,
  hint,
  cta,
}: {
  done: boolean;
  title: string;
  hint: string;
  cta?: { label: string; href: string };
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
          done
            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-black'
            : 'border-white/25 text-white/40'
        }`}
      >
        {done ? '✓' : ''}
      </span>
      <div className="flex-1">
        <p
          className={`font-medium ${done ? 'text-white' : 'text-white/90'}`}
        >
          {title}
        </p>
        <p className="mt-0.5 text-xs text-white/50">{hint}</p>
        {cta && (
          <Link
            href={cta.href}
            className="mt-1 inline-block text-xs font-semibold text-[var(--accent-primary)] hover:underline"
          >
            {cta.label} →
          </Link>
        )}
      </div>
    </li>
  );
}
