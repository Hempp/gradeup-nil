/**
 * Spanish-locale layout.
 *
 * Mirrors (marketing)/layout.tsx but sets html[lang] via the `lang`
 * attribute on the inner wrapper div and embeds the Spanish-specific
 * skip-link copy. The root layout still renders <html lang="en"> by
 * default — Spanish subpages correct this locally.
 *
 * Keeping these routes under the same root marketing chrome (Navbar,
 * Footer, HSAnnouncementBanner) means the switcher, nav, and cross-page
 * UX remain consistent. The Navbar labels themselves will remain in
 * English for v1; translating the nav would be the next pass.
 */
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { HSAnnouncementBanner } from '@/components/marketing/HSAnnouncementBanner';

export default function SpanishMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-dark min-h-screen" lang="es">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent-primary)] focus:text-black focus:rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
      >
        Saltar al contenido principal
      </a>
      <HSAnnouncementBanner />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
