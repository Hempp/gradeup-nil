/**
 * HS Deal Celebration — /hs/deals/[id]/celebrate
 *
 * Server Component. The viral-amplifier landing page. Lives at the end of
 * the sign flow: after the last signature lands, the sign handler returns
 * the path and the client navigates here.
 *
 * Access rules:
 *   - Auth-gated. Must be the athlete or a verified linked parent on the
 *     deal. Brands and strangers 404.
 *   - Only accessible when the deal's contract is fully_signed. Anything
 *     earlier redirects back to the deal detail page — sharing a deal
 *     that isn't actually signed is an obvious footgun.
 *
 * Rendering strategy:
 *   - Templates pulled via `getShareTemplatesForDeal`. When the brand hasn't
 *     authored a template for a platform, we generate a default at render
 *     time. Defaults are NEVER persisted.
 *   - Placeholder substitution uses the curly-brace form (`{athleteFirstName}`,
 *     `{brandName}`, `{schoolName}`) which is safe under String.replace. We
 *     deliberately avoid dollar-brace so JS template literals can't
 *     accidentally interpolate the stored string.
 */

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  getShareTemplatesForDeal,
  SUPPORTED_SHARE_PLATFORMS,
  type SharePlatform,
} from '@/lib/hs-nil/share';
import { CelebrationHero } from '@/components/hs/CelebrationHero';
import { ShareCopyCard } from '@/components/hs/ShareCopyCard';

export const metadata: Metadata = {
  title: 'Share the win — GradeUp HS',
  description:
    'You signed your deal. Share the story in your own voice and let the next scholar-athlete see what is possible.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DealRow {
  id: string;
  title: string;
  compensation_amount: number;
  status: string;
  target_bracket: string | null;
  brand: { id: string; company_name: string } | null;
  athlete: {
    id: string;
    profile_id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface ContractStatusRow {
  status: string;
}

function firstNameFrom(
  first: string | null | undefined,
  fallback: string | null | undefined,
): string {
  const trimmed = (first ?? '').trim();
  if (trimmed) return trimmed;
  const fb = (fallback ?? '').trim();
  return fb || 'Our athlete';
}

export default async function HSDealCelebratePage({
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
    redirect(`/login?next=/hs/deals/${id}/celebrate`);
  }

  const { data: deal } = await supabase
    .from('deals')
    .select(
      `id, title, compensation_amount, status, target_bracket,
       brand:brands(id, company_name),
       athlete:athletes(id, profile_id, first_name, last_name)`,
    )
    .eq('id', id)
    .maybeSingle<DealRow>();

  if (!deal || !deal.athlete) {
    notFound();
  }

  // Access: athlete on the deal, or a verified linked parent of that athlete.
  let isAuthorized = false;
  if (deal.athlete.profile_id === user.id) {
    isAuthorized = true;
  } else {
    const { data: link } = await supabase
      .from('hs_parent_athlete_links')
      .select(
        'id, parent_profile_id, verified_at, hs_parent_profiles!inner(user_id)',
      )
      .eq('athlete_user_id', deal.athlete.profile_id)
      .not('verified_at', 'is', null)
      .maybeSingle();

    if (link) {
      const joined = link as unknown as {
        hs_parent_profiles: { user_id: string } | { user_id: string }[];
      };
      const parentUser = Array.isArray(joined.hs_parent_profiles)
        ? joined.hs_parent_profiles[0]
        : joined.hs_parent_profiles;
      if (parentUser?.user_id === user.id) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    notFound();
  }

  // Contract must be fully signed. If the deal isn't there yet, send the
  // user back to the deal detail — sharing an unsigned deal is nonsensical.
  const { data: contract } = await supabase
    .from('contracts')
    .select('status')
    .eq('deal_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<ContractStatusRow>();

  if (!contract || contract.status !== 'fully_signed') {
    redirect(`/hs/deals/${id}`);
  }

  // Fetch the athlete's school via hs_athlete_profiles for the placeholder.
  const { data: hsProfile } = await supabase
    .from('hs_athlete_profiles')
    .select('school_name')
    .eq('user_id', deal.athlete.profile_id)
    .maybeSingle<{ school_name: string | null }>();

  const brandName = deal.brand?.company_name ?? 'our brand partner';
  const athleteFirstName = firstNameFrom(
    deal.athlete.first_name,
    deal.athlete.last_name,
  );
  const schoolName = (hsProfile?.school_name ?? '').trim() || 'their high school';

  const ctx = {
    athleteFirstName,
    brandName,
    schoolName,
  };

  const templates = await getShareTemplatesForDeal(supabase, id, ctx);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';
  const shareUrl = `${appUrl}/hs/deals/${id}`;

  // Stable render order matches SUPPORTED_SHARE_PLATFORMS.
  const orderedTemplates = [...templates].sort(
    (a, b) =>
      SUPPORTED_SHARE_PLATFORMS.indexOf(a.platform as SharePlatform) -
      SUPPORTED_SHARE_PLATFORMS.indexOf(b.platform as SharePlatform),
  );

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-8">
        <Link
          href={`/hs/deals/${id}`}
          className="inline-flex min-h-[44px] items-center text-sm text-white/70 hover:text-white"
        >
          ← Back to deal
        </Link>
      </section>

      <CelebrationHero
        athleteFirstName={athleteFirstName}
        brandName={brandName}
        amount={deal.compensation_amount}
        schoolName={hsProfile?.school_name ?? null}
      />

      <section className="mx-auto max-w-4xl px-6 pb-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            Share the win
          </h2>
          <p className="mt-2 text-sm text-white/70 md:text-base">
            We drafted a starting point for each platform. Rewrite anything.
            Your voice is the point.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {orderedTemplates.map((t) => (
            <ShareCopyCard
              key={t.platform}
              dealId={deal.id}
              platform={t.platform as SharePlatform}
              templateId={t.id}
              initialCopy={t.renderedCopy}
              shareUrl={shareUrl}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <p className="mx-auto max-w-2xl text-center text-sm text-white/60">
          Your story inspires the next scholar-athlete. Share it in your own
          voice.
        </p>
      </section>
    </main>
  );
}
