import { MarketingChrome } from '@/components/marketing/MarketingChrome';

/**
 * Public NIL valuation calculator chrome.
 *
 * /hs/valuation is a public, indexable top-of-funnel SEO surface that sits
 * OUTSIDE the (hs) feature-flag gate. It previously rendered without the
 * site header/footer. Its page already carries pt-24/pt-32 top padding to
 * clear the fixed Navbar this layout mounts.
 */
export default function ValuationPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingChrome>{children}</MarketingChrome>;
}
