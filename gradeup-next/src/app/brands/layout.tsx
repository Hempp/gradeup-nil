import { MarketingChrome } from '@/components/marketing/MarketingChrome';

/**
 * Public brand directory + profile chrome.
 *
 * /brands and /brands/[slug] are public, indexable, shareable pages that
 * previously rendered without the site header/footer. Wrapping them here
 * gives every brand page the same Navbar + Footer as the rest of the site.
 */
export default function BrandsPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingChrome>{children}</MarketingChrome>;
}
