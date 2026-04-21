/**
 * HS Deal Detail — /hs/deals/[id]
 *
 * Server Component. Renders one of two variants depending on server-side
 * scope evaluation:
 *   - ConsentScopeGap when a minor's active consent doesn't cover the deal.
 *   - DealAcceptPanel otherwise (includes 18+ athletes and covered minors).
 *
 * Auth gate: /login?next=/hs/deals/[id].
 * 404 behavior: notFound() when the deal doesn't exist OR when the signed-in
 * user is not the athlete on it. We deliberately don't distinguish the two
 * — a brand-side peek at a deal they don't own shouldn't leak deal data.
 *
 * The detail copy (brand, title, description, comp, deliverables, timeline,
 * state rules summary) is rendered server-side; only the accept/decline/
 * consent-gap actions are interactive.
 */
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  checkConsentScope,
  computeDurationMonths,
  mapDealTypeToConsentCategory,
} from '@/lib/hs-nil/deal-validation';
import {
  STATE_RULES,
  type USPSStateCode,
} from '@/lib/hs-nil/state-rules';
import { DealAcceptPanel } from '@/components/hs/DealAcceptPanel';
import { ConsentScopeGap } from '@/components/hs/ConsentScopeGap';
import {
  getLatestSubmission,
  summarizeSubmission,
} from '@/lib/hs-nil/deliverables';

export const metadata: Metadata = {
  title: 'Deal details — GradeUp HS',
  description: 'Review a deal offer, check the fine print, accept, or decline.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DealDetail {
  id: string;
  title: string;
  description: string | null;
  deal_type: string;
  status: string;
  compensation_amount: number;
  compensation_type: string;
  start_date: string | null;
  end_date: string | null;
  deliverables: string | null;
  target_bracket: string | null;
  state_code: string | null;
  requires_disclosure: boolean | null;
  parental_consent_id: string | null;
  brand: {
    id: string;
    company_name: string;
    logo_url: string | null;
  } | null;
  athlete: {
    id: string;
    profile_id: string;
  } | null;
}

interface ActiveConsentRow {
  id: string;
  parent_full_name: string;
  scope: unknown;
  expires_at: string;
}

interface HsProfileRow {
  state_code: string;
  date_of_birth: string;
}

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function formatCurrency(n: number): string {
  // Round to whole dollars when the amount is whole; keep two decimals
  // otherwise. Parents notice pennies — don't hide $125.50 as $126.
  const isWhole = Math.abs(n - Math.round(n)) < 0.005;
  return isWhole
    ? `$${Math.round(n).toLocaleString()}`
    : `$${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function summarizeActiveScope(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as {
    dealCategories?: unknown;
    maxDealAmount?: unknown;
    durationMonths?: unknown;
  };
  const cats = Array.isArray(s.dealCategories)
    ? (s.dealCategories.filter((c): c is string => typeof c === 'string'))
    : [];
  const max = typeof s.maxDealAmount === 'number' ? s.maxDealAmount : null;
  const months =
    typeof s.durationMonths === 'number' ? s.durationMonths : null;

  const parts: string[] = [];
  if (cats.length) parts.push(cats.join(', '));
  if (max) parts.push(`up to ${formatCurrency(max)}`);
  if (months)
    parts.push(`for ${months} ${months === 1 ? 'month' : 'months'}`);
  return parts.length ? parts.join(' ') : null;
}

function parseDeliverables(raw: string | null): string[] {
  if (!raw) return [];
  // The column can be either plain text or a JSON array (both have shipped
  // at different points in the API's life). Try JSON first, fall back to
  // newline split.
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === 'string');
    }
  } catch {
    // not JSON — fall through
  }
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function HSDealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/hs/deals/${id}`);
  }

  const { data: deal, error } = await supabase
    .from('deals')
    .select(
      `id, title, description, deal_type, status, compensation_amount,
       compensation_type, start_date, end_date, deliverables,
       target_bracket, state_code, requires_disclosure, parental_consent_id,
       brand:brands(id, company_name, logo_url),
       athlete:athletes(id, profile_id)`,
    )
    .eq('id', id)
    .maybeSingle<DealDetail>();

  if (error) {
    console.error('[hs/deals/:id] deal fetch failed', error);
  }

  // Authorization: athlete on this deal only. Brand and anonymous users
  // bounce to 404 (we don't want to leak deal existence).
  if (!deal || !deal.athlete || deal.athlete.profile_id !== user.id) {
    notFound();
  }

  // HS profile → age + state code. We prefer the deal.state_code (authoritative
  // — stamped at creation by VALIDATION-GATE) but fall back to the profile
  // row when the column is missing, so old deals keep rendering.
  const { data: profile } = await supabase
    .from('hs_athlete_profiles')
    .select('state_code, date_of_birth')
    .eq('user_id', user.id)
    .maybeSingle<HsProfileRow>();

  const age = profile ? calcAge(profile.date_of_birth) : null;
  const isMinor = age === null ? true : age < 18;
  const stateCode = (deal.state_code ||
    profile?.state_code ||
    'CA') as USPSStateCode;
  const rules = STATE_RULES[stateCode] ?? null;

  // Compute scope coverage once — the same check the API will re-run at accept
  // time. For adults or already-consented deals we skip it.
  const consentCategory = mapDealTypeToConsentCategory(deal.deal_type, null);
  const durationMonths = computeDurationMonths(deal.start_date, deal.end_date);

  let scopeStatus:
    | { covered: true; consentId: string }
    | {
        covered: false;
        reason:
          | 'no_active_consent'
          | 'category_not_covered'
          | 'amount_exceeds_scope'
          | 'duration_exceeds_scope'
          | 'consent_expires_before_deal_end';
      }
    | { covered: 'skipped' } = { covered: 'skipped' };

  const isPendingDecision =
    deal.status === 'pending' || deal.status === 'negotiating';

  if (isMinor && isPendingDecision && !deal.parental_consent_id) {
    if (!consentCategory) {
      // No mapping → err on the side of prompting for consent (the API will
      // do the same on the strict side).
      scopeStatus = { covered: false, reason: 'no_active_consent' };
    } else {
      scopeStatus = await checkConsentScope({
        athleteUserId: user.id,
        category: consentCategory,
        amount: deal.compensation_amount,
        durationMonths,
        supabase,
      });
    }
  }

  // Active consent summary for the gap card ("what you have").
  let existingScopeSummary: string | null = null;
  if (scopeStatus !== undefined && 'reason' in scopeStatus) {
    const { data: activeConsent } = await supabase
      .from('parental_consents')
      .select('id, parent_full_name, scope, expires_at')
      .eq('athlete_user_id', user.id)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle<ActiveConsentRow>();
    if (activeConsent) {
      existingScopeSummary = summarizeActiveScope(activeConsent.scope);
    }
  }

  const brandName = deal.brand?.company_name ?? 'A brand';
  const deliverableLines = parseDeliverables(deal.deliverables);

  // Phase 7: post-signing deliverable surfaces. Branch on the deal's
  // new lifecycle values (fully_signed / in_delivery / in_review) so
  // the athlete gets a direct path into the submit page from here.
  const isPostSigning =
    deal.status === 'fully_signed' ||
    deal.status === 'in_delivery' ||
    deal.status === 'in_review';
  const latestSubmission = isPostSigning
    ? await getLatestSubmission(deal.id).catch(() => null)
    : null;

  const disclosureRecipient = rules?.disclosureRecipient ?? null;
  const disclosureWindow = rules?.disclosureWindowHours ?? null;

  const showAcceptPanel =
    isPendingDecision &&
    ('covered' in scopeStatus &&
      (scopeStatus.covered === true || scopeStatus.covered === 'skipped'));

  const showScopeGap =
    isPendingDecision &&
    'reason' in scopeStatus &&
    scopeStatus.covered === false;

  // Phase 7: subtle "Report a problem" footer link. Only visible when the
  // deal is signed or further along — disputes should be a last resort,
  // not the first click on a brand-new offer.
  const DISPUTE_VISIBLE_STATUSES = new Set([
    'accepted',
    'active',
    'in_progress',
    'fully_signed',
    'in_delivery',
    'in_review',
    'completed',
  ]);
  const showDisputeLink = DISPUTE_VISIBLE_STATUSES.has(deal.status);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-6">
        <Link
          href="/hs/deals"
          className="inline-flex min-h-[44px] items-center text-sm text-white/70 hover:text-white"
        >
          ← Back to all deals
        </Link>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Deal offer
        </p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">{deal.title}</h1>
        <p className="mt-3 text-sm text-white/70 md:text-base">
          From <span className="font-semibold text-white">{brandName}</span>
        </p>
      </section>

      <section className="mx-auto grid max-w-4xl gap-6 px-6 pb-10 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Compensation
          </p>
          <p className="mt-2 font-display text-5xl text-white">
            {formatCurrency(deal.compensation_amount)}
          </p>
          <p className="mt-2 text-sm text-white/60">
            {deal.compensation_type.replace(/_/g, ' ')}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Timeline
          </p>
          <dl className="mt-2 space-y-1 text-sm text-white">
            <div className="flex justify-between gap-3">
              <dt className="text-white/60">Starts</dt>
              <dd className="font-medium">{formatDate(deal.start_date)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-white/60">Ends</dt>
              <dd className="font-medium">{formatDate(deal.end_date)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {deal.description && (
        <section className="mx-auto max-w-4xl px-6 pb-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
              What the brand is asking for
            </p>
            <p className="mt-3 whitespace-pre-line text-sm text-white/80 md:text-base">
              {deal.description}
            </p>

            {deliverableLines.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                  Deliverables
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
                  {deliverableLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-6 pb-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            State compliance — {stateCode}
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>
              <span className="text-white/60">Disclosure window: </span>
              {disclosureWindow
                ? `${disclosureWindow} hour${disclosureWindow === 1 ? '' : 's'} after the deal goes active`
                : 'Not required'}
            </li>
            <li>
              <span className="text-white/60">Filed with: </span>
              {disclosureRecipient === 'school'
                ? 'your school'
                : disclosureRecipient === 'state_athletic_association'
                  ? 'your state athletic association'
                  : disclosureRecipient === 'both'
                    ? 'your school and your state athletic association'
                    : 'no disclosure filing required'}
            </li>
            <li>
              <span className="text-white/60">Parental consent: </span>
              {isMinor ? 'Required (you are under 18)' : 'Not required'}
            </li>
          </ul>
        </div>
      </section>

      {isPostSigning && (
        <section className="mx-auto max-w-4xl px-6 pb-10">
          <div className="rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-6 backdrop-blur-sm md:p-8">
            {deal.status === 'in_review' ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-yellow-400/30 bg-yellow-400/15 px-2.5 py-1 text-xs font-medium text-yellow-200">
                    Awaiting brand review
                  </span>
                </div>
                <h2 className="mt-3 font-display text-2xl text-white">
                  Your submission is with the brand
                </h2>
                {latestSubmission ? (
                  <p className="mt-2 text-sm text-white/80">
                    Most recent: {summarizeSubmission(latestSubmission)}.
                    The brand will review and release payout or send notes.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-white/80">
                    The brand will review your submission and release payout
                    or send notes.
                  </p>
                )}
                <div className="mt-5">
                  <Link
                    href={`/hs/deals/${deal.id}/deliver`}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Add another submission
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                  Ready to deliver
                </p>
                <h2 className="mt-2 font-display text-2xl text-white">
                  Post, perform, or submit the proof
                </h2>
                <p className="mt-2 text-sm text-white/80">
                  The contract is fully signed. When you finish the
                  deliverable — posting, appearing, signing memorabilia —
                  upload the proof and the brand can release payout.
                </p>
                <div className="mt-5">
                  <Link
                    href={`/hs/deals/${deal.id}/deliver`}
                    className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--accent-primary)] px-6 text-sm font-semibold text-black hover:opacity-90"
                  >
                    Submit deliverables
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-6 pb-24">
        {showScopeGap && 'reason' in scopeStatus ? (
          <ConsentScopeGap
            reason={scopeStatus.reason}
            existingScopeSummary={existingScopeSummary}
            suggestedCategory={consentCategory}
            suggestedMaxAmount={deal.compensation_amount}
            suggestedDurationMonths={durationMonths}
            dealId={deal.id}
          />
        ) : showAcceptPanel ? (
          <DealAcceptPanel
            dealId={deal.id}
            brandName={brandName}
            dealTitle={deal.title}
            compensationAmount={deal.compensation_amount}
            startDate={deal.start_date}
            endDate={deal.end_date}
            disclosureWindowHours={disclosureWindow}
            disclosureRecipient={disclosureRecipient}
            consentCategory={consentCategory}
            isMinor={isMinor}
            // Phase 4 scaffolds the parent payout flow but Stripe Connect is
            // not yet wired. Assume not ready for minors until explicit wiring
            // lands; adults accept without a payout gate for now.
            payoutsReady={!isMinor}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
            <p className="text-sm text-white/70">
              {deal.status === 'accepted' || deal.status === 'active'
                ? "You've accepted this deal. It's in progress."
                : deal.status === 'completed'
                  ? 'This deal has been completed.'
                  : deal.status === 'rejected' || deal.status === 'cancelled'
                    ? 'This deal is no longer active.'
                    : 'This deal is not currently waiting on your action.'}
            </p>
          </div>
        )}

        {showDisputeLink && (
          <p className="mt-8 text-center text-xs text-white/40">
            Something wrong with this deal?{' '}
            <Link
              href={`/hs/deals/${deal.id}/dispute`}
              className="underline decoration-white/30 underline-offset-2 hover:text-white/70"
            >
              Report a problem
            </Link>
            . Disputes pause the deal while a GradeUp admin reviews both sides.
          </p>
        )}
      </section>
    </main>
  );
}
