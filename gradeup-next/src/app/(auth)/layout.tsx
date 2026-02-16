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
    <div className="auth-theme min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Skip Link for Accessibility - WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--marketing-cyan)] focus:text-black focus:rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--marketing-cyan)]"
      >
        Skip to main content
      </a>
      {/* Background Effects - Matching Landing Page */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle, var(--marketing-cyan) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'marketing-float 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, var(--marketing-magenta) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'marketing-float 8s ease-in-out infinite',
            animationDelay: '-4s',
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
      </div>

      {/* Header with Logo */}
      <header className="relative z-10 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {/* Shield + Arrow Logo */}
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-9 w-9"
            >
              <defs>
                <linearGradient id="auth-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="100%" stopColor="#adff2f" />
                </linearGradient>
              </defs>
              {/* Shield outline */}
              <path
                d="M16 2L28 6V15C28 22.5 22.5 28.5 16 30C9.5 28.5 4 22.5 4 15V6L16 2Z"
                fill="#0a0a0a"
                stroke="url(#auth-gradient)"
                strokeWidth="1.5"
              />
              {/* Upward arrow */}
              <path
                d="M16 8L22 15H19V24H13V15H10L16 8Z"
                fill="url(#auth-gradient)"
              />
            </svg>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-[#00f0ff] to-[#adff2f] bg-clip-text text-transparent">
              GradeUp
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 focus:outline-none">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-4 text-center">
        <p className="text-sm text-white/40">
          &copy; {new Date().getFullYear()} GradeUp NIL. All rights reserved.
        </p>
        <div className="mt-2 flex justify-center gap-4 text-sm">
          <Link
            href="/privacy"
            className="text-white/40 hover:text-[var(--marketing-cyan)] transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-white/40 hover:text-[var(--marketing-cyan)] transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
