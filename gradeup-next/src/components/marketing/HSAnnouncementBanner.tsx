import { isFeatureEnabled } from '@/lib/feature-flags';
import { HSAnnouncementBannerInner } from './HSAnnouncementBannerInner';

/**
 * Thin top-of-page announcement for the HS-NIL expansion.
 *
 * Server-gated on FEATURE_HS_NIL. When the flag is off this renders null and
 * the marketing landing looks exactly as it did before the HS work started.
 * When on, the inner client component owns dismissal state so the banner can
 * be hidden per-browser without a backend.
 */
export function HSAnnouncementBanner() {
  if (!isFeatureEnabled('HS_NIL')) {
    return null;
  }
  return <HSAnnouncementBannerInner />;
}
