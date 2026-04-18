/**
 * HS Deals List — /hs/deals
 *
 * Athlete-facing list of every deal targeted at them. Server Component:
 *   - Auth gate → /login?next=/hs/deals on anonymous access.
 *   - Loads the athlete row for the signed-in user (athletes.profile_id = auth.uid()).
 *   - Fetches every deal for that athlete where target_bracket is HS-facing
 *     (`high_school` or `both`).
 *   - Also loads active parental consents so we can tag deals as
 *     "Waiting on parent" when scope coverage fails.
 *   - Groups into four visual sections and renders HSDealCard rows.
 *
 * The server-side consent-scope check here is a presentational hint: the
 * authoritative gate is on PATCH /api/deals/[id] (VALIDATION-GATE's scope).
 * Worst case: we show "Waiting on you" and the athlete gets a consent_required
 * response on accept — DealAcceptPanel handles that gracefully.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HSDealCard, type DealCardStatus } from '@/components/hs/HSDealCard';
import { OnboardingCard } from '@/components/hs/OnboardingCard';
import {
  checkConsentScope,
  computeDurationMonths,
  mapDealTypeToConsentCategory,
} from '@/lib/hs-nil/deal-validation';

export const metadata: Metadata = {
  title: 'Your deals — GradeUp HS',
  description:
    'Every NIL deal offered to you. Accept, decline, or check what your parent still needs to sign.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * DB → UI status mapping. Anything not listed here is ignored (draft deals
 * never get shown to athletes; expired deals are treated as declined-ish).
 */
const ATHLETE_VISIBLE_STATUSES = [
  'pending',
  'negotiating',
  'accepted',
  'active',
  'completed',
  'rejected',
  'cancelled',
  'expired',
] as const;

const AWAITING_YOU_STATUSES = new Set(['pending', 'negotiating']);
const IN_PROGRESS_STATUSES = new Set(['accepted', 'active']);
const COMPLETED_STATUSES = new Set(['completed']);
const DECLINED_STATUSES = new Set(['rejected', 'cancelled', 'expired']);

const DEAL_TYPE_LABEL: Record<string, string> = {
  social_post: 'Social post',
  appearance: 'Appearance',
  endorsement: 'Endorsement',
  licensing: 'Licensing',
  autograph: 'Autograph',
  camp: 'Camp',
  speaking: 'Speaking',
  merchandise: 'Merchandise',
  other: 'NIL deal',
};

interface DealRow {
  id: string;
  title: string;
  deal_type: string;
  status: string;
  compensation_amount: number;
  start_date: string | null;
  end_date: string | null;
  target_bracket: string | null;
  parental_consent_id: string | null;
  brand: { id: string; company_name: string; logo_url: string | null } | null;
}

interface GroupedDeal {
  id: string;
  title: string;
  brandName: string;
  brandLogoUrl: string | null;
  compensationAmount: number;
  eyebrow: string;
  cardStatus: DealCardStatus;
}

export default async function HSDealsListPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/deals');
  }

  // athletes.profile_id === auth.users.id for HS athletes (backfilled in
  // migration 20260418_008). If the row is missing we still render the empty
  // state rather than 500 — a brand-new HS user with zero deals shouldn't
  // depend on the backfill running.
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle<{ id: string }>();

  let deals: DealRow[] = [];
  if (athlete?.id) {
    const { data, error } = await supabase
      .from('deals')
      .select(
        `id, title, deal_type, status, compensation_amount, start_date, end_date,
         target_bracket, parental_consent_id,
         brand:brands(id, company_name, logo_url)`,
      )
      .eq('athlete_id', athlete.id)
      .in('target_bracket', ['high_school', 'both'])
      .in('status', ATHLETE_VISIBLE_STATUSES as unknown as string[])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[hs/deals] fetch failed', error);
    } else {
      deals = (data ?? []) as unknown as DealRow[];
    }
  }

  // Pre-compute scope coverage for pending deals so we can split "Awaiting
  // your decision" from "Awaiting parental consent". This is a UI hint only.
  const awaitingYou: GroupedDeal[] = [];
  const awaitingConsent: GroupedDeal[] = [];
  const inProgress: GroupedDeal[] = [];
  const completed: GroupedDeal[] = [];
  const declined: GroupedDeal[] = [];

  for (const deal of deals) {
    const brandName = deal.brand?.company_name ?? 'Unknown brand';
    const brandLogoUrl = deal.brand?.logo_url ?? null;
    const eyebrow = DEAL_TYPE_LABEL[deal.deal_type] ?? 'NIL deal';

    if (AWAITING_YOU_STATUSES.has(deal.status)) {
      // Only run the scope check when no consent has been stamped yet — once
      // deal.parental_consent_id is populated, consent has already been
      // validated by the server at accept time.
      let cardStatus: DealCardStatus = 'awaiting_you';
      if (!deal.parental_consent_id) {
        const category = mapDealTypeToConsentCategory(deal.deal_type, null);
        if (category) {
          const scope = await checkConsentScope({
            athleteUserId: user.id,
            category,
            amount: deal.compensation_amount,
            durationMonths: computeDurationMonths(
              deal.start_date,
              deal.end_date,
            ),
            supabase,
          });
          if (!scope.covered) {
            cardStatus = 'awaiting_consent';
          }
        }
      }

      const grouped: GroupedDeal = {
        id: deal.id,
        title: deal.title,
        brandName,
        brandLogoUrl,
        compensationAmount: deal.compensation_amount,
        eyebrow,
        cardStatus,
      };
      if (cardStatus === 'awaiting_consent') awaitingConsent.push(grouped);
      else awaitingYou.push(grouped);
    } else if (IN_PROGRESS_STATUSES.has(deal.status)) {
      inProgress.push({
        id: deal.id,
        title: deal.title,
        brandName,
        brandLogoUrl,
        compensationAmount: deal.compensation_amount,
        eyebrow,
        cardStatus: 'in_progress',
      });
    } else if (COMPLETED_STATUSES.has(deal.status)) {
      completed.push({
        id: deal.id,
        title: deal.title,
        brandName,
        brandLogoUrl,
        compensationAmount: deal.compensation_amount,
        eyebrow,
        cardStatus: 'completed',
      });
    } else if (DECLINED_STATUSES.has(deal.status)) {
      declined.push({
        id: deal.id,
        title: deal.title,
        brandName,
        brandLogoUrl,
        compensationAmount: deal.compensation_amount,
        eyebrow,
        cardStatus: 'declined',
      });
    }
  }

  const hasAny =
    awaitingYou.length +
      awaitingConsent.length +
      inProgress.length +
      completed.length +
      declined.length >
    0;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Your deals
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">
          Every offer in one place.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
          Review offers, check what&rsquo;s still waiting on your parent, and
          keep tabs on deals in progress.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        {!hasAny ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            <Group
              title="Awaiting your decision"
              empty="Nothing to act on right now."
              deals={awaitingYou}
            />
            <Group
              title="Awaiting parental consent"
              empty="No deals are blocked on consent."
              deals={awaitingConsent}
            />
            <Group
              title="In progress"
              empty="No active deals yet."
              deals={inProgress}
            />
            <Group title="Completed" empty={null} deals={completed} />
            <Group title="Declined or expired" empty={null} deals={declined} />
          </div>
        )}
      </section>
    </main>
  );
}

function Group({
  title,
  empty,
  deals,
}: {
  title: string;
  empty: string | null;
  deals: GroupedDeal[];
}) {
  if (deals.length === 0 && empty === null) return null;
  return (
    <div>
      <h2 className="font-display text-2xl text-white md:text-3xl">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {deals.length === 0 ? (
          <p className="col-span-full text-sm text-white/50">{empty}</p>
        ) : (
          deals.map((d) => (
            <HSDealCard
              key={d.id}
              id={d.id}
              brandName={d.brandName}
              brandLogoUrl={d.brandLogoUrl}
              title={d.title}
              compensationAmount={d.compensationAmount}
              status={d.cardStatus}
              eyebrow={d.eyebrow}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <OnboardingCard
      eyebrow="No deals yet"
      title="When a brand partnership is ready, it'll show up here."
      description="Until then, the best thing you can do is finish your profile and make sure your parent has a consent on file — brands reach out to cleared athletes first."
    >
      <div className="mt-2 flex flex-wrap gap-3">
        <Link
          href="/hs/athlete"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Go to your dashboard
        </Link>
        <Link
          href="/hs/consent/manage"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Check consent status
        </Link>
      </div>
    </OnboardingCard>
  );
}
