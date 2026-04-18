'use client';

/**
 * BracketPicker
 *
 * Top-level "which audience are you?" selector that sits ABOVE the role picker
 * when the HS_NIL feature flag is on. GradeUp serves both high-school and
 * college scholar-athletes, and the two sides have different rule sets
 * (parental consent, per-state compliance, age gates) — so we branch the
 * signup journey at the bracket level before the role level.
 *
 * Behavior:
 *   - Renders nothing when `hsEnabled` is false. The parent page then falls
 *     through to the classic college-only role picker with zero UI change.
 *     This is the non-regression contract.
 *   - When `hsEnabled` is true and no bracket is chosen yet, renders the two
 *     cards. Clicking "College / NCAA" calls back with 'college' so the
 *     parent can swap to the role picker. Clicking "High School" hard-
 *     navigates to /hs/signup (the HS-side role picker lives on its own
 *     route so HS-specific layout chrome can wrap it).
 *   - Uses next/navigation's router.replace with `?bracket=college` so the
 *     choice survives a page refresh and doesn't nag the user after form
 *     validation errors.
 *
 * This is a Client Component on purpose — the interaction is instant-UI and
 * shouldn't round-trip a Server Action.
 */

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';

interface BracketPickerProps {
  /**
   * Whether HS-NIL is enabled. When false, the component renders null.
   * Parent should gate on `isFeatureEnabled('HS_NIL')`.
   */
  hsEnabled: boolean;
  /**
   * Invoked when the user picks College. Parent should surface the existing
   * college role picker in response. No arg for HS — we hard-navigate.
   */
  onPickCollege: () => void;
}

export function BracketPicker({ hsEnabled, onPickCollege }: BracketPickerProps) {
  const router = useRouter();

  if (!hsEnabled) {
    return null;
  }

  const handleCollege = () => {
    // Remember the choice in the URL so refresh / back-navigation stays on college.
    router.replace('/signup?bracket=college', { scroll: false });
    onPickCollege();
  };

  const handleHighSchool = () => {
    router.push('/hs/signup');
  };

  return (
    <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Choose your level">
      <button
        type="button"
        onClick={handleHighSchool}
        className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] focus-visible:ring-offset-2 rounded-[var(--radius-lg)]"
      >
        <Card
          hover
          className="h-full transition-all duration-300 group-hover:border-[var(--primary-500)] group-hover:shadow-md"
        >
          <CardContent className="p-6 flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-full bg-[var(--primary-100)] flex items-center justify-center mb-3 group-hover:bg-[var(--primary-500)] transition-colors duration-300">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--primary-700)] group-hover:text-white transition-colors duration-300"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--primary-900)]">
              High School
            </h3>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">
              For 9th–12th grade scholar-athletes and the parents who guide them.
              Verified GPA, parental consent, state-compliant.
            </p>
            <span className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--primary-500)]">
              Pilot: CA, FL, GA
            </span>
          </CardContent>
        </Card>
      </button>

      <button
        type="button"
        onClick={handleCollege}
        className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] focus-visible:ring-offset-2 rounded-[var(--radius-lg)]"
      >
        <Card
          hover
          className="h-full transition-all duration-300 group-hover:border-[var(--primary-500)] group-hover:shadow-md"
        >
          <CardContent className="p-6 flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-full bg-[var(--primary-100)] flex items-center justify-center mb-3 group-hover:bg-[var(--primary-500)] transition-colors duration-300">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--primary-700)] group-hover:text-white transition-colors duration-300"
              >
                <circle cx="12" cy="8" r="7" />
                <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--primary-900)]">
              College / NCAA
            </h3>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">
              For NCAA student-athletes, athletic directors, and brand partners.
              The existing GradeUp NIL platform.
            </p>
            <span className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--primary-500)]">
              Open to all 50 states
            </span>
          </CardContent>
        </Card>
      </button>
    </div>
  );
}
