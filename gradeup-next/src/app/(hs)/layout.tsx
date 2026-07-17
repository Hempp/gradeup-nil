import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { RefCapture } from '@/components/hs/RefCapture';

// The /hs subtree is the logged-in HS portal (feature-gated; 404s while
// FEATURE_HS_NIL is off). Keep it out of search either way.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * HS Layout.
 *
 * Feature-gates the entire /hs subtree behind FEATURE_HS_NIL, and mounts
 * the RefCapture client component so `?ref=CODE` is captured on ANY
 * landing page under /hs (not just the marketing root). RefCapture
 * fires a POST to /api/hs/referrals/click which writes the hs_ref
 * cookie server-side and logs the code_clicked funnel event.
 */
export default function HSLayout({ children }: { children: React.ReactNode }) {
  if (!isFeatureEnabled('HS_NIL')) {
    notFound();
  }
  return (
    <>
      <RefCapture />
      {children}
    </>
  );
}
