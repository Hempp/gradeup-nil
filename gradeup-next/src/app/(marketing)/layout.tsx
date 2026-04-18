import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { HSAnnouncementBanner } from '@/components/marketing/HSAnnouncementBanner';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-dark min-h-screen">
      {/* Skip Link for Accessibility - WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent-primary)] focus:text-black focus:rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
      >
        Skip to main content
      </a>
      {/* HS expansion announcement: null when FEATURE_HS_NIL is off */}
      <HSAnnouncementBanner />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
