import Link from 'next/link';
import { Logo } from '@/components/brand';

export function Footer() {
  return (
    <footer className="bg-[var(--cream-section)] border-t border-[var(--hairline)] text-[var(--ink)] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <Logo size="md" variant="gradient" />
            </div>
            <p className="text-[var(--ink-meta)] text-sm">
              The verified-GPA scholar-athlete layer of StatStaq. Keep your
              grades up, and their team runs your NIL.
            </p>
          </div>

          {/* For Athletes */}
          <div>
            <h3 className="font-display uppercase tracking-wide mb-4 text-[var(--ink)]">For Athletes</h3>
            <ul className="space-y-2 text-sm text-[var(--ink-muted)] font-[family-name:var(--font-inter)]">
              <li>
                <Link href="/signup/athlete" className="text-[var(--ink-muted)] hover:text-[var(--cobalt)] focus:text-[var(--cobalt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-sm transition-colors">
                  Join as Athlete
                </Link>
              </li>
              <li>
                <Link href="/solutions/athletes" className="text-[var(--ink-muted)] hover:text-[var(--cobalt)] focus:text-[var(--cobalt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-sm transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/opportunities" className="text-[var(--ink-muted)] hover:text-[var(--cobalt)] focus:text-[var(--cobalt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-sm transition-colors">
                  Browse Opportunities
                </Link>
              </li>
            </ul>
          </div>

          {/* For Brands */}
          <div>
            <h3 className="font-display uppercase tracking-wide mb-4 text-[var(--ink)]">For Brands</h3>
            <ul className="space-y-2 text-sm text-[var(--ink-muted)] font-[family-name:var(--font-inter)]">
              <li>
                <Link href="/signup/brand" className="text-[var(--ink-muted)] hover:text-[var(--cobalt)] focus:text-[var(--cobalt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-sm transition-colors">
                  Partner With Us
                </Link>
              </li>
              <li>
                <Link href="/athletes" className="text-[var(--ink-muted)] hover:text-[var(--cobalt)] focus:text-[var(--cobalt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-sm transition-colors">
                  Browse Athletes
                </Link>
              </li>
              <li>
                <Link href="/solutions/brands" className="text-[var(--ink-muted)] hover:text-[var(--cobalt)] focus:text-[var(--cobalt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-sm transition-colors">
                  Why GradeUp
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-display uppercase tracking-wide mb-4 text-[var(--ink)]">Company</h3>
            <ul className="space-y-2 text-sm text-[var(--ink-muted)] font-[family-name:var(--font-inter)]">
              <li>
                <Link href="/about" className="text-[var(--ink-muted)] hover:text-[var(--cobalt)] focus:text-[var(--cobalt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-sm transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-[var(--ink-muted)] hover:text-[var(--cobalt)] focus:text-[var(--cobalt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-sm transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-[var(--ink-muted)] hover:text-[var(--cobalt)] focus:text-[var(--cobalt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[var(--ink-muted)] hover:text-[var(--cobalt)] focus:text-[var(--cobalt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--hairline)] flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <p className="text-sm text-[var(--ink-meta)]">
              © {new Date().getFullYear()} GradeUp NIL. All rights reserved.
            </p>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ink-meta)]">
              part of StatStaq
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--cobalt)] px-3 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)]">
              NCAA Compliant
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
