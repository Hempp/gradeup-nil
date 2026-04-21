'use client';

/**
 * BrandHSSignupForm — Client Component for HS brand self-serve signup.
 *
 * Dark marketing palette matching the athlete / parent HS signups.
 *
 * DB writes on submit:
 *   - auth.users (via Supabase signUp) with role='brand' + hs_role='hs_brand'
 *     metadata. We intentionally keep role='brand' in the user_role enum so
 *     existing `brands.profile_id` constraints, RLS policies, and brand
 *     dashboards continue to work. The HS affiliation is carried on
 *     `brands.is_hs_enabled = true` plus the metadata flag for debugging.
 *   - profiles row (created server-side by a DB trigger OR by brand-signup
 *     client-side insert — we match the college brand signup pattern).
 *   - brands row with is_hs_enabled=true, hs_target_states, hs_deal_categories,
 *     company_name, contact_name, contact_email, industry (business_type).
 *
 * The deal-category vocabulary is the consent-scope taxonomy
 * (apparel / food_beverage / local_business / training / autograph /
 * social_media_promo) so the validator and the mapper both accept it.
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

// Matches ConsentRequestForm.DEAL_CATEGORIES + the mapper in
// src/lib/hs-nil/deal-validation.ts. Keep these ids in lockstep.
export const HS_DEAL_CATEGORIES: ReadonlyArray<{
  id: string;
  label: string;
  description: string;
}> = [
  {
    id: 'apparel',
    label: 'Apparel',
    description: 'Merchandise, branded gear, athletic wear.',
  },
  {
    id: 'food_beverage',
    label: 'Food & beverage',
    description: 'Local restaurants, non-alcoholic drinks, nutrition.',
  },
  {
    id: 'local_business',
    label: 'Local business',
    description: 'Appearances, in-store events, community partnerships.',
  },
  {
    id: 'training',
    label: 'Training & camps',
    description: 'Skills camps, clinics, private training services.',
  },
  {
    id: 'autograph',
    label: 'Autograph',
    description: 'Card / memorabilia signings.',
  },
  {
    id: 'social_media_promo',
    label: 'Social media promos',
    description: 'Sponsored posts, branded content on athlete channels.',
  },
];

const BUSINESS_TYPES = [
  'Gym / fitness',
  'Food & beverage',
  'Training / sports services',
  'Local retail',
  'Apparel',
  'Health & wellness',
  'Entertainment',
  'Education',
  'Other',
];

interface Form {
  email: string;
  password: string;
  brandName: string;
  contactName: string;
  businessType: string;
  targetStates: string[];
  dealCategories: string[];
}

const INITIAL: Form = {
  email: '',
  password: '',
  brandName: '',
  contactName: '',
  businessType: '',
  targetStates: [],
  dealCategories: [],
};

const inputCls =
  'mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 min-h-[44px]';

export default function BrandHSSignupForm() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateText =
    <K extends keyof Form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value as Form[K];
      setForm((f) => ({ ...f, [key]: value }));
      if (error) setError(null);
    };

  const toggleArray =
    (key: 'targetStates' | 'dealCategories', value: string) =>
    () => {
      setForm((f) => {
        const current = f[key];
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...f, [key]: next };
      });
      if (error) setError(null);
    };

  const validate = (): string | null => {
    if (!form.email.trim()) return 'Your work email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return 'Enter a valid email.';
    }
    if (form.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (!form.brandName.trim()) return 'Brand / business name is required.';
    if (!form.contactName.trim() || form.contactName.trim().split(/\s+/).length < 2) {
      return 'Enter your full name (first and last).';
    }
    if (!form.businessType) return 'Please select a business type.';
    if (form.targetStates.length === 0) {
      return 'Pick at least one state you operate in.';
    }
    for (const s of form.targetStates) {
      if (!PILOT_STATES.includes(s as USPSStateCode)) {
        return 'GradeUp HS is only open in CA, FL, and GA right now.';
      }
    }
    if (form.dealCategories.length === 0) {
      return 'Pick at least one deal category you are interested in.';
    }
    return null;
  };

  const disabled = useMemo(() => submitting, [submitting]);

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
      const [firstName, ...rest] = form.contactName.trim().split(/\s+/);
      const lastName = rest.join(' ');

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: form.contactName.trim(),
            company_name: form.brandName.trim(),
            role: 'brand',
            hs_role: 'hs_brand',
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const user = authData.user;
      if (!user) {
        // Email confirmation required path — push to the login redirect
        // so they can finish once the session is live.
        router.push('/login?next=/hs/brand');
        return;
      }

      // Profiles row. RLS may auto-create via trigger; if not, we insert
      // here matching the college brand pattern.
      const { error: profileErr } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: form.email.trim(),
          role: 'brand',
          first_name: firstName,
          last_name: lastName,
        },
        { onConflict: 'id' }
      );
      if (profileErr) {
        // eslint-disable-next-line no-console
        console.warn('[hs-brand-signup] profiles upsert warn', profileErr);
      }

      const { error: brandErr } = await supabase.from('brands').insert({
        profile_id: user.id,
        company_name: form.brandName.trim(),
        industry: form.businessType,
        contact_name: form.contactName.trim(),
        contact_email: form.email.trim(),
        is_hs_enabled: true,
        hs_target_states: form.targetStates,
        hs_deal_categories: form.dealCategories,
      });

      if (brandErr) {
        setError(
          'Account created, but we could not save your brand profile. Please contact support.'
        );
        return;
      }

      // Waitlist activation reconciliation — best-effort. If this
      // brand joined via a /hs/invite/[token] click-through, the
      // matching waitlist row flips to 'converted'.
      try {
        await fetch('/api/hs/invite/reconcile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'brand' }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[hs-brand-signup] waitlist reconcile failed', err);
      }

      // Parent-to-parent referral attribution — a parent's invite link
      // may also resolve to a brand signup (local business owner who
      // heard about GradeUp from a parent). Best-effort; must not
      // block signup.
      try {
        await fetch('/api/hs/referrals/attribute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'hs_brand' }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[hs-brand-signup] referral attribute failed', err);
      }

      router.push('/hs/brand');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8"
      noValidate
      aria-describedby={error ? 'hs-brand-signup-error' : undefined}
    >
      {error && (
        <div
          id="hs-brand-signup-error"
          role="alert"
          aria-live="polite"
          className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <Field label="Work email" htmlFor="hs-b-email">
        <input
          id="hs-b-email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={updateText('email')}
          className={inputCls}
          placeholder="you@localbusiness.com"
          disabled={disabled}
        />
      </Field>

      <Field label="Password" htmlFor="hs-b-password" hint="At least 8 characters.">
        <div className="relative">
          <input
            id="hs-b-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={updateText('password')}
            className={`${inputCls} pr-16`}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold text-white/60 transition-colors hover:text-white"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </Field>

      <Field label="Brand / business name" htmlFor="hs-b-brand">
        <input
          id="hs-b-brand"
          autoComplete="organization"
          required
          value={form.brandName}
          onChange={updateText('brandName')}
          className={inputCls}
          placeholder="Sunnyvale Training Co."
          disabled={disabled}
        />
      </Field>

      <Field label="Your full name" htmlFor="hs-b-contact">
        <input
          id="hs-b-contact"
          autoComplete="name"
          required
          value={form.contactName}
          onChange={updateText('contactName')}
          className={inputCls}
          placeholder="Alex Rivera"
          disabled={disabled}
        />
      </Field>

      <Field label="Business type" htmlFor="hs-b-type">
        <select
          id="hs-b-type"
          required
          value={form.businessType}
          onChange={updateText('businessType')}
          className={inputCls}
          disabled={disabled}
        >
          <option value="">Select a business type</option>
          {BUSINESS_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="mt-6">
        <legend className="block text-sm font-medium text-white">
          States you operate in
        </legend>
        <p className="mt-1 text-xs text-white/50">
          Pick every pilot state you want to post HS deals in.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {PILOT_STATES.map((code) => {
            const checked = form.targetStates.includes(code);
            return (
              <label
                key={code}
                className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  checked
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-white'
                    : 'border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/5'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={toggleArray('targetStates', code)}
                  disabled={disabled}
                  className="h-4 w-4 accent-[var(--accent-primary)]"
                />
                <span>
                  {STATE_LABELS[code] ?? code}{' '}
                  <span className="text-white/40">({code})</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="block text-sm font-medium text-white">
          Deal categories you want to post
        </legend>
        <p className="mt-1 text-xs text-white/50">
          These match the consent-scope categories parents approve.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {HS_DEAL_CATEGORIES.map((cat) => {
            const checked = form.dealCategories.includes(cat.id);
            return (
              <label
                key={cat.id}
                className={`flex min-h-[44px] cursor-pointer gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  checked
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-white'
                    : 'border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/5'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={toggleArray('dealCategories', cat.id)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4 accent-[var(--accent-primary)]"
                />
                <span className="flex-1">
                  <span className="block font-medium">{cat.label}</span>
                  <span className="block text-xs text-white/50">
                    {cat.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={disabled}
        className="mt-8 inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-3 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting && (
          <svg
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.25"
            />
            <path
              d="M22 12a10 10 0 0 1-10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        )}
        {submitting ? 'Creating brand account…' : 'Create brand account'}
      </button>

      <p className="mt-4 text-center text-sm text-white/60">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[var(--accent-primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

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
