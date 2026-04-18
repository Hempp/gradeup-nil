'use client';

/**
 * Interactive signup landing UI.
 *
 * When `hsEnabled` is false: renders the classic college-only role picker
 * (athlete / brand / director) with zero structural changes. The BracketPicker
 * returns null for this case; the role picker is shown unconditionally. This
 * is the non-regression contract with the existing college signup flow.
 *
 * When `hsEnabled` is true: renders the BracketPicker first. Once the user
 * picks "College / NCAA" we swap to the same legacy role picker. Picking
 * "High School" hard-navigates to /hs/signup. We mirror the choice to
 * `?bracket=college` in the URL so a form-validation bounce back here
 * doesn't force the user to re-pick their bracket.
 */

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProgressStepper, type Step } from '@/components/ui/progress-stepper';
import { BracketPicker } from '@/components/auth/BracketPicker';

const SIGNUP_STEPS: Step[] = [
  { id: 'role', title: 'Role' },
  { id: 'account', title: 'Account' },
  { id: 'verify', title: 'Verify' },
  { id: 'done', title: 'Done' },
];

interface RoleCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function RoleCard({ href, icon, title, description }: RoleCardProps) {
  return (
    <Link href={href} className="block group">
      <Card
        hover
        className="h-full transition-all duration-300 group-hover:border-[var(--primary-500)] group-hover:shadow-md"
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--primary-100)] flex items-center justify-center mb-4 group-hover:bg-[var(--primary-500)] transition-colors duration-300">
            <div className="text-[var(--primary-700)] group-hover:text-white transition-colors duration-300">
              {icon}
            </div>
          </div>

          <h3 className="text-lg font-semibold text-[var(--primary-900)] mb-2">
            {title}
          </h3>

          <p className="text-sm text-[var(--neutral-600)]">
            {description}
          </p>

          <div className="mt-4 text-[var(--primary-500)] opacity-0 transform translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CollegeRolePicker() {
  return (
    <div className="grid gap-4">
      <RoleCard
        href="/signup/athlete"
        icon={
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="5" r="3" />
            <path d="M12 22V8" />
            <path d="m5 12 7-4 7 4" />
            <path d="m5 12 7 4 7-4" />
          </svg>
        }
        title="I'm an Athlete"
        description="Showcase your academic excellence and athletic achievements to connect with brands and sponsors."
      />

      <RoleCard
        href="/signup/brand"
        icon={
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
            <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
            <path d="M12 3v6" />
          </svg>
        }
        title="I'm a Brand"
        description="Find and partner with scholar-athletes who align with your brand values and marketing goals."
      />

      <RoleCard
        href="/signup/director"
        icon={
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
        title="I'm an Athletic Director"
        description="Manage your program's NIL activities, verify athletes, and oversee compliance."
      />
    </div>
  );
}

function SignupClientInner({ hsEnabled }: { hsEnabled: boolean }) {
  const searchParams = useSearchParams();
  const initialBracketParam = searchParams.get('bracket');

  // Role picker visibility:
  // - Flag OFF: always visible (legacy behavior — no bracket concept).
  // - Flag ON:  visible once the user picks "College" (locally) or arrives
  //   here with ?bracket=college (form-bounce, bookmark, shared link).
  const initialShowRolePicker = !hsEnabled || initialBracketParam === 'college';
  const [showRolePicker, setShowRolePicker] = useState(initialShowRolePicker);

  useEffect(() => {
    if (!hsEnabled) return;
    if (initialBracketParam === 'college') {
      setShowRolePicker(true);
    }
  }, [hsEnabled, initialBracketParam]);

  const heading = showRolePicker ? 'Join GradeUp' : 'Welcome to GradeUp';
  const sub = showRolePicker
    ? 'Choose your account type to get started'
    : 'First, tell us which level you play at.';

  return (
    <div className="animate-fade-in">
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <ProgressStepper
            steps={SIGNUP_STEPS}
            currentStep={0}
            size="sm"
            allowStepClick={false}
            className="mb-4"
          />
          <div className="text-center">
            <CardTitle as="h1" className="text-2xl font-bold text-[var(--primary-900)]">
              {heading}
            </CardTitle>
            <CardDescription className="text-[var(--neutral-600)]">
              {sub}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* BracketPicker returns null when hsEnabled is false — zero regression. */}
          {!showRolePicker && (
            <BracketPicker
              hsEnabled={hsEnabled}
              onPickCollege={() => setShowRolePicker(true)}
            />
          )}

          {showRolePicker && <CollegeRolePicker />}

          <p className="text-center text-sm text-[var(--neutral-600)] mt-6">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-[var(--primary-500)] hover:text-[var(--primary-700)] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function SignupClient({ hsEnabled }: { hsEnabled: boolean }) {
  // useSearchParams must live inside a Suspense boundary in Next 15 App Router.
  return (
    <Suspense fallback={null}>
      <SignupClientInner hsEnabled={hsEnabled} />
    </Suspense>
  );
}
