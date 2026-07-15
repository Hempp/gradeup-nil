import { MarketingChrome } from '@/components/marketing/MarketingChrome';

/**
 * Public scholar-athlete directory + profile chrome.
 *
 * /athletes, /athletes/[username], and /athletes/[username]/support/thanks
 * are public, indexable, shareable pages that were previously rendering
 * WITHOUT the site header/footer. Wrapping them here gives every athlete
 * page the same Navbar + Footer as the rest of the public site.
 */
export default function AthletesPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingChrome>{children}</MarketingChrome>;
}
