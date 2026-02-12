import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'GradeUp NIL - Authentication',
  description: 'Sign in or create your GradeUp NIL account',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--surface-50)] flex flex-col">
      {/* Background Pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 108, 181, 0.15), transparent),
            radial-gradient(ellipse 60% 40% at 100% 100%, rgba(245, 158, 11, 0.1), transparent),
            var(--surface-50)
          `,
        }}
      />

      {/* Header with Logo */}
      <header className="relative z-10 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[var(--primary-900)] hover:opacity-80 transition-opacity"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[var(--primary-700)]"
            >
              <path
                d="M16 2L4 8v8c0 7.18 5.12 13.9 12 16 6.88-2.1 12-8.82 12-16V8L16 2z"
                fill="currentColor"
                fillOpacity="0.1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11 16l3 3 7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xl font-bold tracking-tight">
              Grade<span className="text-[var(--secondary-700)]">Up</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-4 text-center">
        <p className="text-sm text-[var(--neutral-600)]">
          &copy; {new Date().getFullYear()} GradeUp NIL. All rights reserved.
        </p>
        <div className="mt-2 flex justify-center gap-4 text-sm">
          <Link
            href="/privacy"
            className="text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
