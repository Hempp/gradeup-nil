import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import ConsentList, {
  type ActiveConsent,
  type HistoricalConsent,
  type PendingConsent,
} from '@/components/hs/ConsentList';
import InitiatedToast from './InitiatedToast';

/**
 * Athlete-facing consent management surface.
 *
 * Server Component. Fetches three cohorts for the signed-in user:
 *   - Pending: rows in pending_consents that are neither consumed nor expired.
 *   - Active: rows in parental_consents with revoked_at IS NULL AND
 *             expires_at > now().
 *   - Historical: everything else (revoked or expired) from parental_consents.
 *
 * RLS gates visibility: both tables ship with `auth.uid() = athlete_user_id`
 * SELECT policies, so the anon-key session client naturally returns only the
 * caller's rows.
 */

export const metadata: Metadata = {
  title: 'Manage Parental Consent — GradeUp HS',
  description:
    'See pending, active, and past parental consents. Revoke or request new consent.',
};

// Every request: consent status is fast-moving and user-specific.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RawScope {
  dealCategories?: unknown;
  deal_categories?: unknown;
  maxDealAmount?: unknown;
  max_deal_amount?: unknown;
  durationMonths?: unknown;
  duration_months?: unknown;
}

/**
 * Defensive: the scope column is jsonb and historically may have been written
 * with either camelCase (current provider) or snake_case (legacy seed/test
 * data). Normalize both so the UI never crashes on an odd row.
 */
function normalizeScope(raw: unknown): {
  dealCategories: string[];
  maxDealAmount: number;
  durationMonths: number;
} {
  const s = (raw ?? {}) as RawScope;
  const cats = (s.dealCategories ?? s.deal_categories) as unknown;
  const max = (s.maxDealAmount ?? s.max_deal_amount) as unknown;
  const dur = (s.durationMonths ?? s.duration_months) as unknown;
  return {
    dealCategories: Array.isArray(cats)
      ? cats.filter((c): c is string => typeof c === 'string')
      : [],
    maxDealAmount: typeof max === 'number' ? max : 0,
    durationMonths: typeof dur === 'number' ? dur : 0,
  };
}

export default async function ConsentManagePage({
  searchParams,
}: {
  searchParams: Promise<{ initiated?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/hs/consent/manage');
  }

  const nowIso = new Date().toISOString();

  const [pendingRes, activeRes, historicalRes] = await Promise.all([
    supabase
      .from('pending_consents')
      .select(
        'id, parent_email, parent_full_name, scope, expires_at, created_at, consumed_at'
      )
      .eq('athlete_user_id', user.id)
      .is('consumed_at', null)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false }),

    supabase
      .from('parental_consents')
      .select(
        'id, parent_email, parent_full_name, relationship, scope, signed_at, expires_at, revoked_at'
      )
      .eq('athlete_user_id', user.id)
      .is('revoked_at', null)
      .gt('expires_at', nowIso)
      .order('signed_at', { ascending: false }),

    // Historical: anything revoked OR expired. We intentionally over-fetch
    // revoked-and-still-in-window rows here too, so we never double-count
    // with the active query.
    supabase
      .from('parental_consents')
      .select(
        'id, parent_email, parent_full_name, scope, signed_at, expires_at, revoked_at'
      )
      .eq('athlete_user_id', user.id)
      .or(`revoked_at.not.is.null,expires_at.lte.${nowIso}`)
      .order('signed_at', { ascending: false })
      .limit(50),
  ]);

  const pending: PendingConsent[] = (pendingRes.data ?? []).map((r) => ({
    id: r.id as string,
    parentEmail: r.parent_email as string,
    parentFullName: (r.parent_full_name as string | null) ?? null,
    scope: normalizeScope(r.scope),
    expiresAt: r.expires_at as string,
    createdAt: r.created_at as string,
  }));

  const active: ActiveConsent[] = (activeRes.data ?? []).map((r) => ({
    id: r.id as string,
    parentEmail: r.parent_email as string,
    parentFullName: r.parent_full_name as string,
    relationship: r.relationship as 'parent' | 'legal_guardian',
    scope: normalizeScope(r.scope),
    signedAt: r.signed_at as string,
    expiresAt: r.expires_at as string,
  }));

  const historical: HistoricalConsent[] = (historicalRes.data ?? []).map(
    (r) => ({
      id: r.id as string,
      parentEmail: r.parent_email as string,
      parentFullName: r.parent_full_name as string,
      scope: normalizeScope(r.scope),
      signedAt: r.signed_at as string,
      expiresAt: r.expires_at as string,
      revokedAt: (r.revoked_at as string | null) ?? null,
    })
  );

  const { initiated } = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
              Parental Consent
            </p>
            <h1 className="mt-3 font-display text-4xl md:text-5xl">
              Your consents.
            </h1>
            <p className="mt-3 max-w-xl text-white/70">
              Track consents from a parent or legal guardian. You need at least
              one active consent on file to accept NIL deals.
            </p>
          </div>

          <Link
            href="/hs/consent/request"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent-primary)] px-5 py-3 font-semibold text-black transition hover:opacity-90"
          >
            Request new consent
          </Link>
        </header>

        <Suspense fallback={null}>
          <InitiatedToast initiated={initiated === '1'} />
        </Suspense>

        <section className="mt-10">
          <ConsentList
            pending={pending}
            active={active}
            historical={historical}
          />
        </section>
      </div>
    </main>
  );
}
