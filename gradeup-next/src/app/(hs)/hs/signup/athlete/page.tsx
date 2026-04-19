'use client';

/**
 * HS Athlete Signup.
 *
 * Lean form — we capture the minimum required to stand up a user + HS athlete
 * profile, then push the user into onboarding where we collect the richer
 * data (parental consent linkage, verification tier, sport-specific stats).
 *
 * Fields: email, password, full name, DOB (age gate), school, state (PILOT
 * states only), sport, graduation year, self-reported GPA (optional).
 *
 * Age handling:
 *   - Under 13: blocked outright (COPPA — we do not want accounts for kids
 *     under 13 on any surface).
 *   - 13–17: account is created with `requires_parental_consent=true` on
 *     auth user metadata; not blocked here, because the parent-consent flow
 *     runs as an onboarding step. The DB also enforces consent presence
 *     before any deal can be signed.
 *   - 18+: adult, no consent flag.
 *
 * DB writes:
 *   - auth.users (via Supabase signUp) with role='hs_athlete' metadata.
 *   - hs_athlete_profiles row (migration 20260418_002 already defines it).
 *
 * On success we push to /hs/onboarding/next-steps — that page is a TODO, but
 * the redirect is wired so flipping the flag later is a UI-only change.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PILOT_STATES, type USPSStateCode } from '@/lib/hs-nil/state-rules';
import { getSupabaseClient } from '@/lib/supabase/client';

const STATE_LABELS: Record<USPSStateCode, string> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
} as Record<USPSStateCode, string>;

const SPORTS = [
  'Football',
  'Basketball',
  'Baseball',
  'Soccer',
  'Track & Field',
  'Swimming',
  'Volleyball',
  'Tennis',
  'Golf',
  'Wrestling',
  'Softball',
  'Lacrosse',
  'Hockey',
  'Other',
];

interface Form {
  email: string;
  password: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  schoolName: string;
  stateCode: string;
  sport: string;
  gradYear: string;
  gpa: string; // optional
}

const INITIAL: Form = {
  email: '',
  password: '',
  fullName: '',
  dob: '',
  schoolName: '',
  stateCode: '',
  sport: '',
  gradYear: '',
  gpa: '',
};

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function HSAthleteSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const age = useMemo(() => calcAge(form.dob), [form.dob]);
  const isMinor = age !== null && age < 18;

  const update =
    <K extends keyof Form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (error) setError(null);
    };

  const validate = (): string | null => {
    if (!form.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (!form.fullName.trim() || form.fullName.trim().split(/\s+/).length < 2) {
      return 'Enter your full name (first and last).';
    }
    if (!form.dob) return 'Date of birth is required.';
    if (age === null) return 'Date of birth is invalid.';
    if (age < 13) return 'You must be at least 13 to create an account. Ask a parent to sign up on your behalf.';
    if (!form.schoolName.trim()) return 'School name is required.';
    if (!form.stateCode) return 'Please choose your state.';
    if (!PILOT_STATES.includes(form.stateCode as USPSStateCode)) {
      return 'GradeUp HS is only open in CA, FL, and GA right now.';
    }
    if (!form.sport) return 'Please pick your sport.';
    const gy = Number(form.gradYear);
    if (!Number.isInteger(gy) || gy < 2026 || gy > 2035) {
      return 'Graduation year must be between 2026 and 2035.';
    }
    if (form.gpa.trim()) {
      const g = Number(form.gpa);
      if (!Number.isFinite(g) || g < 0 || g > 5) return 'GPA must be between 0.0 and 5.0.';
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
            role: 'hs_athlete',
            // Flag — onboarding reads this to decide whether to launch the
            // parental-consent flow. Do not gate signup itself on this.
            requires_parental_consent: isMinor,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from('hs_athlete_profiles').insert({
          user_id: authData.user.id,
          state_code: form.stateCode,
          date_of_birth: form.dob,
          graduation_year: Number(form.gradYear),
          school_name: form.schoolName.trim(),
          sport: form.sport,
          gpa: form.gpa.trim() ? Number(form.gpa) : null,
          gpa_verification_tier: 'self_reported',
        });

        if (profileError) {
          setError('Account created, but we could not save your profile. Please contact support.');
          return;
        }

        // Make this HS user a first-class athlete row so they can be
        // party to deals. The call is best-effort — if it fails we log
        // a warn and continue. The 20260418_008 backfill migration is
        // the safety net for any misses.
        try {
          const res = await fetch('/api/hs/signup/ensure-athlete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName }),
          });
          if (!res.ok) {
            // eslint-disable-next-line no-console
            console.warn(
              '[hs-athlete-signup] ensure-athlete returned non-OK',
              res.status
            );
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[hs-athlete-signup] ensure-athlete call failed', err);
        }

        // Waitlist activation reconciliation — best-effort, never
        // blocks onboarding. If this user came in via /hs/invite/[token]
        // the server side has a cookie; reconcile flips the waitlist
        // row to 'converted' and clears the cookie.
        try {
          await fetch('/api/hs/invite/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'athlete' }),
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[hs-athlete-signup] waitlist reconcile failed', err);
        }

        // Parent-to-parent referral attribution — reads the hs_ref
        // cookie (set by RefCapture on /hs?ref=CODE), ties this new
        // user to the referring parent/athlete, writes the
        // signup_completed funnel event, and emails the referrer.
        // Best-effort — referral plumbing must not block signup.
        try {
          await fetch('/api/hs/referrals/attribute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'hs_athlete' }),
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[hs-athlete-signup] referral attribute failed', err);
        }
      }

      // TODO: /hs/onboarding/next-steps does not yet exist. Landing the
      // redirect wiring now so flipping the onboarding flag is UI-only.
      router.push('/hs/onboarding/next-steps');
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

        <h1 className="mt-4 font-display text-4xl md:text-5xl">Create your athlete account</h1>
        <p className="mt-3 text-white/70">
          Basic info now. We&rsquo;ll walk you through verification and parental
          consent in the next step.
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

          <Field label="Email" htmlFor="hs-email">
            <input
              id="hs-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={update('email')}
              className={inputCls}
              placeholder="you@example.com"
            />
          </Field>

          <Field label="Password" htmlFor="hs-password" hint="At least 8 characters.">
            <input
              id="hs-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
              className={inputCls}
            />
          </Field>

          <Field label="Full name" htmlFor="hs-name">
            <input
              id="hs-name"
              autoComplete="name"
              required
              value={form.fullName}
              onChange={update('fullName')}
              className={inputCls}
              placeholder="Jordan Carter"
            />
          </Field>

          <Field
            label="Date of birth"
            htmlFor="hs-dob"
            hint={
              isMinor
                ? 'You are under 18. We will ask your parent or guardian to sign consent before any deals go live.'
                : undefined
            }
          >
            <input
              id="hs-dob"
              type="date"
              autoComplete="bday"
              required
              value={form.dob}
              onChange={update('dob')}
              className={inputCls}
            />
          </Field>

          <Field label="School name" htmlFor="hs-school">
            <input
              id="hs-school"
              required
              value={form.schoolName}
              onChange={update('schoolName')}
              className={inputCls}
              placeholder="Lincoln High School"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="State" htmlFor="hs-state">
              <select
                id="hs-state"
                required
                value={form.stateCode}
                onChange={update('stateCode')}
                className={inputCls}
              >
                <option value="">Select state</option>
                {PILOT_STATES.map((code) => (
                  <option key={code} value={code}>
                    {STATE_LABELS[code] ?? code}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Sport" htmlFor="hs-sport">
              <select
                id="hs-sport"
                required
                value={form.sport}
                onChange={update('sport')}
                className={inputCls}
              >
                <option value="">Select sport</option>
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Graduation year" htmlFor="hs-gy">
              <input
                id="hs-gy"
                type="number"
                inputMode="numeric"
                min={2026}
                max={2035}
                required
                value={form.gradYear}
                onChange={update('gradYear')}
                className={inputCls}
                placeholder="2028"
              />
            </Field>

            <Field
              label="GPA"
              htmlFor="hs-gpa"
              hint="Optional. Self-reported now; we verify later."
            >
              <input
                id="hs-gpa"
                type="number"
                inputMode="decimal"
                min={0}
                max={5}
                step={0.01}
                value={form.gpa}
                onChange={update('gpa')}
                className={inputCls}
                placeholder="3.8"
              />
            </Field>
          </div>

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
