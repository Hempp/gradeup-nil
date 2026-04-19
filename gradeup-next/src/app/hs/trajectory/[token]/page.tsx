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
 *   Title / description pulled from the identity block. og:image
 *   is TODO — we will plug in a dynamically-rendered card when the
 *   OG generator ships.
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
  const result = await getTrajectoryByPublicToken(token).catch(() => null);
  if (!result) {
    return {
      title: 'Trajectory — GradeUp NIL',
      description: 'This trajectory is no longer available.',
      robots: { index: false, follow: false },
    };
  }
  const { identity } = result.trajectory;
  const title = `${identity.firstName} ${identity.lastInitial}. — Trajectory — GradeUp NIL`;
  const description = [
    `${identity.firstName} ${identity.lastInitial}.`,
    identity.graduationYear ? `Class of ${identity.graduationYear}` : null,
    identity.school,
    identity.sport,
  ]
    .filter(Boolean)
    .join(' • ');

  // TODO(trajectory-og): generate a dynamic OG image once the image
  //   generator ships (Satori/@vercel/og). Use PII-minimized identity
  //   only — same fields we render on the page — and pass /api/og/hs-
  //   trajectory?token={token} here.
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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
