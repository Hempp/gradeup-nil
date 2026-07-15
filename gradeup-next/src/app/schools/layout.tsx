import { MarketingChrome } from '@/components/marketing/MarketingChrome';

/**
 * Public schools directory chrome. /schools is a public, indexable page
 * that previously rendered without the site header/footer.
 */
export default function SchoolsPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingChrome>{children}</MarketingChrome>;
}
