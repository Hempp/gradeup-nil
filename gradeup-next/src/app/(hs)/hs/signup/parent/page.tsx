'use client';

/**
 * HS Parent / Guardian Signup.
 *
 * Parent is a first-class role because parents manage their athlete's consent,
 * payouts, and deal approvals — not the athlete. The parent account is
 * created first; later in onboarding we link it to an athlete account (either
 * by invite link or by email match against an existing `hs_athlete_profiles`
 * row).
 *
 * Fields: email, password, full name, relationship, athlete name, athlete
 * email (optional — used to link the athlete side later).
 *
 * DB writes:
 *   - auth.users (Supabase signUp) with role='hs_parent' metadata. The
 *     auth-only record is enough for the user to sign in and continue
 *     onboarding.
 *   - hs_parent_profiles (migration 20260418_005): durable row with
 *     full_name + relationship, RLS-locked to the signing user.
 *   - hs_parent_athlete_links (same migration): when an athlete email
 *     is provided, we attempt a pending-verification link. Misses
 *     degrade to 'pending_invitation' — the parent has a profile but
 *     the link waits for a future invite flow.
 *
 * On success we push to /hs/onboarding/parent-next.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  createParentProfile,
  linkAthlete,
} from '@/lib/services/hs-nil/parents';

type Relationship = 'parent' | 'legal_guardian';

interface Form {
  email: string;
  password: string;
  fullName: string;
  relationship: Relationship;
  athleteName: string;
  athleteEmail: string;
}

const INITIAL: Form = {
  email: '',
  password: '',
  fullName: '',
  relationship: 'parent',
  athleteName: '',
  athleteEmail: '',
};

export default function HSParentSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update =
    <K extends keyof Form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value as Form[K];
      setForm((f) => ({ ...f, [key]: value }));
      if (error) setError(null);
    };

  const validate = (): string | null => {
    if (!form.email.trim()) return 'Your email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (!form.fullName.trim() || form.fullName.trim().split(/\s+/).length < 2) {
      return 'Enter your full name (first and last).';
    }
    if (!form.athleteName.trim()) return "Please enter your athlete's name.";
    if (form.athleteEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.athleteEmail.trim())) {
      return "Athlete's email is invalid.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const [firstName, ...rest] = form.fullName.trim().split(/\s+/);
      const lastName = rest.join(' ');

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'hs_parent',
            relationship: form.relationship,
            // Onboarding reads these to bootstrap the athlete-link flow.
            pending_athlete_name: form.athleteName.trim(),
            pending_athlete_email: form.athleteEmail.trim() || null,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        // Edge case: Supabase is configured to require email confirmation
        // and returns no user row until the confirmation clicks through.
        // The parent profile needs an authenticated session, so push them
        // to the next step and let that page finish the profile write
        // once auth state is live.
        router.push('/hs/onboarding/parent-next');
        return;
      }

      // Durable parent-profile row. RLS enforces user_id = auth.uid(),
      // so this only works once the session from signUp is active
      // (Supabase sets the session synchronously when email confirm
      // is disabled, which is the default for the pilot).
      const { id: parentProfileId } = await createParentProfile({
        userId,
        fullName: form.fullName.trim(),
        relationship: form.relationship,
      });

      // Best-effort link to the athlete. Failures here are
      // non-blocking — the parent can still complete onboarding and
      // we surface the pending link from the dashboard.
      const athleteEmail = form.athleteEmail.trim();
      if (athleteEmail) {
        try {
          await linkAthlete({
            parentProfileId,
            athleteEmail,
            relationship: form.relationship,
          });
        } catch (linkErr) {
          // Swallow and log — the profile already exists, and the
          // onboarding flow can retry the link.
          // eslint-disable-next-line no-console
          console.warn('[hs-parent-signup] linkAthlete failed', linkErr);
        }
      }

      router.push('/hs/onboarding/parent-next');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-2xl px-6 pt-16 pb-24">
        <Link
          href="/hs/signup"
          className="inline-flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back
        </Link>

        <h1 className="mt-4 font-display text-4xl md:text-5xl">Parent / guardian signup</h1>
        <p className="mt-3 text-white/70">
          You manage consent, payouts, and oversight for your athlete. We&rsquo;ll
          link your account to theirs in the next step.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8"
          noValidate
        >
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </div>
          )}

          <Field label="Your email" htmlFor="p-email">
            <input
              id="p-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={update('email')}
              className={inputCls}
              placeholder="you@example.com"
            />
          </Field>

          <Field label="Password" htmlFor="p-password" hint="At least 8 characters.">
            <input
              id="p-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
              className={inputCls}
            />
          </Field>

          <Field label="Your full name" htmlFor="p-name">
            <input
              id="p-name"
              autoComplete="name"
              required
              value={form.fullName}
              onChange={update('fullName')}
              className={inputCls}
              placeholder="Alex Carter"
            />
          </Field>

          <Field label="Relationship" htmlFor="p-rel">
            <select
              id="p-rel"
              value={form.relationship}
              onChange={update('relationship')}
              className={inputCls}
            >
              <option value="parent">Parent</option>
              <option value="legal_guardian">Legal guardian</option>
            </select>
          </Field>

          <Field label="Athlete's full name" htmlFor="p-athlete-name">
            <input
              id="p-athlete-name"
              required
              value={form.athleteName}
              onChange={update('athleteName')}
              className={inputCls}
              placeholder="Jordan Carter"
            />
          </Field>

          <Field
            label="Athlete's email"
            htmlFor="p-athlete-email"
            hint="Optional. We use this to link your account to theirs if they sign up separately."
          >
            <input
              id="p-athlete-email"
              type="email"
              value={form.athleteEmail}
              onChange={update('athleteEmail')}
              className={inputCls}
              placeholder="jordan@example.com"
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-[var(--accent-primary)] px-6 py-3 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>

          <p className="mt-4 text-center text-sm text-white/60">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[var(--accent-primary)] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

const inputCls =
  'mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40';

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-white">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </div>
  );
}
