import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { HSAnnouncementBanner } from '@/components/marketing/HSAnnouncementBanner';

/**
 * MarketingChrome — shared public-site chrome for top-level public routes
 * that live OUTSIDE the (marketing) route group (e.g. /athletes, /brands,
 * /schools, /hs/valuation).
 *
 * The (marketing) and /es group layouts render their own <main> landmark
 * around page content. These top-level public pages, by contrast, already
 * ship their OWN <main> element, so this wrapper deliberately does NOT add
 * a second one — nesting <main> is a WCAG 1.3.1 / 4.1.2 landmark violation.
 * The pages carry `id="main-content"` on their own <main> so the skip link
 * below still resolves.
 *
 * It applies the `.marketing-dark` wrapper (the cream editorial token scope
 * — see globals.css) so these routes inherit the same cream/navy/cobalt
 * system, the HS announcement banner, the primary Navbar, and the Footer —
 * giving every public page one consistent header + footer.
 */
export function MarketingChrome({
  children,
  lang,
  skipLinkLabel = 'Skip to main content',
}: {
  children: React.ReactNode;
  /** Locale override for the wrapper (e.g. "es"). Defaults to inherit. */
  lang?: string;
  /** Localized skip-link copy. */
  skipLinkLabel?: string;
}) {
  return (
    <div className="marketing-dark min-h-screen" lang={lang}>
      {/* Skip Link for Accessibility — WCAG 2.4.1. Targets the page's own
          <main id="main-content">. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent-primary)] focus:text-[#FBF9F2] focus:rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
      >
        {skipLinkLabel}
      </a>
      <HSAnnouncementBanner />
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
