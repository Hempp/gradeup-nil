/**
 * Public Trajectory — /hs/trajectory/[token]
 *
 * UNAUTHENTICATED public page. Sits OUTSIDE the (hs) layout group
 * because that layout gates on FEATURE_HS_NIL and requires the
 * user to be signed in elsewhere in the flow. Public trajectory
 * links must resolve regardless of flag state (the token itself
 * is the access control) so an HS athlete can paste the URL into
 * a bio and have it work for anyone.
 *
 * Service-role lookup: getTrajectoryByPublicToken resolves the
 * token, confirms it's live (not revoked, not expired), and
 * increments view_count. Returns null on miss → we render a
 * friendly "no longer available" page with a 404-style tone.
 *
 * PII minimization:
 *   The Trajectory object returned from the service only carries
 *   identity fields we are willing to render publicly (first name,
 *   last initial, school, sport, state, graduation year, GPA series,
 *   completed deal brand+amount+approximate date). Nothing else is
 *   joined in.
 *
 * Open Graph:
 *   Title / description pulled from the identity block. og:image is
 *   rendered by /api/og/trajectory/[token] (next/og ImageResponse,
 *   edge runtime). Expired / revoked tokens still emit an image
 *   (neutral fallback card) so social unfurls stay intact, but the
 *   page is noindex'd.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { getTrajectoryByPublicToken } from '@/lib/hs-nil/trajectory';
import { PublicTrajectoryView } from '@/components/hs/PublicTrajectoryView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const { token } = await params;
  const ogImageUrl = `/api/og/trajectory/${token}`;
  const result = await getTrajectoryByPublicToken(token).catch(() => null);
  if (!result) {
    // Expired / revoked / invalid: still surface an OG image (the route
    // renders a neutral fallback card) so the unfurl isn't broken, but
    // keep the page noindex'd so crawlers don't surface dead links.
    return {
      title: 'Trajectory — GradeUp NIL',
      description: 'This trajectory is no longer available.',
      robots: { index: false, follow: false },
      openGraph: {
        title: 'Shareable Scholar-Athlete Trajectory — GradeUp HS',
        description:
          'A verified academic and athletic trajectory, shared by a GradeUp HS scholar-athlete.',
        type: 'website',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: 'GradeUp HS — Shareable Scholar-Athlete Trajectory',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Shareable Scholar-Athlete Trajectory — GradeUp HS',
        description:
          'A verified academic and athletic trajectory, shared by a GradeUp HS scholar-athlete.',
        images: [ogImageUrl],
      },
    };
  }
  const { identity } = result.trajectory;
  const gpaLabel =
    identity.currentGpa !== null && Number.isFinite(identity.currentGpa)
      ? ` — ${identity.currentGpa!.toFixed(2)} GPA`
      : '';
  const title = `${identity.firstName} ${identity.lastInitial}. — Trajectory — GradeUp NIL`;
  const description = [
    `${identity.firstName} ${identity.lastInitial}.${gpaLabel}`,
    identity.graduationYear ? `Class of ${identity.graduationYear}` : null,
    identity.school,
    identity.sport,
  ]
    .filter(Boolean)
    .join(' • ');
  const imageAlt = [
    `${identity.firstName} ${identity.lastInitial}.`,
    identity.sport,
    'GradeUp HS verified scholar-athlete trajectory',
  ]
    .filter(Boolean)
    .join(' — ');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicTrajectoryPage({ params }: PageProps) {
  const { token } = await params;
  const result = await getTrajectoryByPublicToken(token).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[hs-nil public trajectory] lookup failed', {
      tokenLen: token.length,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  });

  if (!result) {
    return (
      <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
        <section className="mx-auto max-w-2xl px-6 pt-24 pb-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            GradeUp NIL
          </p>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">
            This trajectory is no longer available.
          </h1>
          <p className="mt-4 text-sm text-white/70">
            The athlete may have revoked this link, or it may have expired.
            Ask them for an updated link.
          </p>
          <Link
            href="/hs"
            className="mt-8 inline-flex min-h-[44px] items-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Visit GradeUp HS
          </Link>
        </section>
      </main>
    );
  }

  return <PublicTrajectoryView trajectory={result.trajectory} showBranding />;
}
