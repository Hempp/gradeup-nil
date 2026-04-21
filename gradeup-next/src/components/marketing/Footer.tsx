import Link from 'next/link';
import { Logo } from '@/components/brand';

export function Footer() {
  return (
    <footer className="bg-[var(--marketing-gray-950)] border-t border-[var(--marketing-gray-800)] text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <Logo size="md" variant="gradient" />
            </div>
            <p className="text-[var(--marketing-gray-400)] text-sm">
              The NIL platform where your GPA unlocks better deals.
            </p>
          </div>

          {/* For Athletes */}
          <div>
            <h3 className="font-semibold mb-4 text-[var(--accent-primary)]">For Athletes</h3>
            <ul className="space-y-2 text-sm text-[var(--marketing-gray-400)]">
              <li>
                <Link href="/signup/athlete" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-sm transition-colors">
                  Join as Athlete
                </Link>
              </li>
              <li>
                <Link href="/solutions/athletes" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-sm transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/opportunities" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-sm transition-colors">
                  Browse Opportunities
                </Link>
              </li>
            </ul>
          </div>

          {/* For Brands */}
          <div>
            <h3 className="font-semibold mb-4 text-[var(--accent-gold)]">For Brands</h3>
            <ul className="space-y-2 text-sm text-[var(--marketing-gray-400)]">
              <li>
                <Link href="/signup/brand" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-sm transition-colors">
                  Partner With Us
                </Link>
              </li>
              <li>
                <Link href="/athletes" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-sm transition-colors">
                  Browse Athletes
                </Link>
              </li>
              <li>
                <Link href="/solutions/brands" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-sm transition-colors">
                  Why GradeUp
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-[var(--marketing-gray-400)]">
              <li>
                <Link href="/solutions" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--marketing-gray-800)] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--marketing-gray-500)]">
            © {new Date().getFullYear()} GradeUp NIL. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--accent-success)] px-3 py-1 rounded-full border border-[var(--accent-success)]/30 bg-[var(--accent-success)]/10">
              NCAA Compliant
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
