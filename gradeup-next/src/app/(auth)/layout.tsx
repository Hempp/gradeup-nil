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
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
            >
              <rect width="32" height="32" rx="6" fill="url(#auth-gradient)" />
              <text
                x="16"
                y="22"
                textAnchor="middle"
                fill="white"
                fontSize="16"
                fontWeight="bold"
                fontFamily="system-ui"
              >
                G
              </text>
              <defs>
                <linearGradient id="auth-gradient" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#00f0ff" />
                  <stop offset="1" stopColor="#adff2f" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-xl font-bold tracking-tight text-white">
              Grade<span className="text-[var(--marketing-cyan)]">Up</span>
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
