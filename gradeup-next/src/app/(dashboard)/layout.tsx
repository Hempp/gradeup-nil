import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | GradeUp NIL",
  },
  robots: {
    index: false, // Dashboard pages should not be indexed
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Skip Link for Dashboard — WCAG 2.4.1 */}
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded-md focus:outline-none"
      >
        Skip to dashboard content
      </a>
      <main id="dashboard-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
    </div>
  );
}
