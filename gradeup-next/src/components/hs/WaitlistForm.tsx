'use client';

/**
 * HS-NIL Waitlist Form
 *
 * Public, unauthenticated form rendered on the HS landing page. Captures
 * demand-signal from four audience types (athlete / parent / coach / brand)
 * across the three pilot states (CA, FL, GA).
 *
 * Draft is persisted to localStorage via useAutoSave so a user who abandons
 * partway through can resume — this is a known lift on consumer-funnel
 * completion.
 */

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, type SelectOption } from '@/components/ui/select';
import { useAutoSave, useDraft } from '@/lib/hooks/use-auto-save';
import { PILOT_STATES, type USPSStateCode } from '@/lib/hs-nil/state-rules';

const DRAFT_KEY = 'hs-waitlist-draft-v1';
const UNLISTED_STATE_SENTINEL = '__unlisted__';

type Role = 'athlete' | 'parent' | 'coach' | 'brand';

interface WaitlistDraft {
  email: string;
  role: Role;
  stateChoice: string; // USPSStateCode or UNLISTED_STATE_SENTINEL or ''
  gradYear: string;
  sport: string;
  schoolName: string;
  referredBy: string;
}

const INITIAL_DRAFT: WaitlistDraft = {
  email: '',
  role: 'athlete',
  stateChoice: '',
  gradYear: '',
  sport: '',
  schoolName: '',
  referredBy: '',
};

const STATE_LABELS: Record<USPSStateCode, string> = {
  CA: 'California',
  FL: 'Florida',
  GA: 'Georgia',
} as Record<USPSStateCode, string>;

const stateOptions: SelectOption[] = [
  ...PILOT_STATES.map((code) => ({
    value: code,
    label: STATE_LABELS[code] ?? code,
  })),
  {
    value: UNLISTED_STATE_SENTINEL,
    label: "My state isn't listed yet",
    description: "We'll notify you when we expand to your area.",
  },
];

const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: 'athlete', label: 'Athlete', hint: 'I compete in high-school sports.' },
  { value: 'parent', label: 'Parent', hint: 'My child is a high-school athlete.' },
  { value: 'coach', label: 'Coach', hint: 'I coach HS athletes.' },
  { value: 'brand', label: 'Local Brand', hint: 'I want to sponsor HS athletes.' },
];

type SubmitStatus = 'idle' | 'submitting' | 'error';

export function WaitlistForm() {
  const router = useRouter();
  const headingId = useId();
  const emailId = useId();
  const roleGroupId = useId();
  const stateId = useId();
  const gradYearId = useId();
  const sportId = useId();
  const schoolId = useId();
  const emailErrorId = useId();
  const generalErrorId = useId();

  const [form, setForm] = useState<WaitlistDraft>(INITIAL_DRAFT);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});

  // Draft restore on mount (no confirm — this is a low-stakes waitlist form,
  // silently resuming is the right call).
  const { draft, hasDraft, clearDraft } = useDraft<WaitlistDraft>(DRAFT_KEY);
  useEffect(() => {
    if (hasDraft && draft) {
      setForm((prev) => ({ ...prev, ...draft }));
    }
  }, [hasDraft, draft]);

  // Persist each keystroke to localStorage.
  const { save } = useAutoSave<WaitlistDraft>({
    storageKey: DRAFT_KEY,
    debounceMs: 400,
    showErrorToast: false,
  });

  const updateField = <K extends keyof WaitlistDraft>(
    key: K,
    value: WaitlistDraft[K]
  ) => {
    const next = { ...form, [key]: value };
    setForm(next);
    save(next);
    if (key === 'email' && fieldErrors.email) {
      setFieldErrors({});
    }
  };

  const isUnlistedState = form.stateChoice === UNLISTED_STATE_SENTINEL;
  const isPilotState =
    form.stateChoice !== '' && !isUnlistedState;
  const canSubmit =
    form.email.trim().length > 0 &&
    form.role &&
    isPilotState &&
    (form.role !== 'athlete' || form.gradYear.trim().length > 0);

  const validateClientSide = (): string | null => {
    if (!form.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFieldErrors({ email: 'Enter a valid email address.' });
      return 'Enter a valid email address.';
    }
    if (!isPilotState) {
      return 'Please choose one of the pilot states to join the waitlist.';
    }
    if (form.role === 'athlete') {
      const gy = Number(form.gradYear);
      if (!Number.isFinite(gy) || gy < 2026 || gy > 2035) {
        return 'Graduation year must be between 2026 and 2035.';
      }
    }
    return null;
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;

    const clientError = validateClientSide();
    if (clientError) {
      setError(clientError);
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        email: form.email.trim(),
        role: form.role,
        state_code: form.stateChoice,
      };
      if (form.role === 'athlete' && form.gradYear.trim()) {
        payload.grad_year = Number(form.gradYear);
      }
      if (form.sport.trim()) payload.sport = form.sport.trim();
      if (form.schoolName.trim()) payload.school_name = form.schoolName.trim();
      if (form.referredBy.trim()) payload.referred_by = form.referredBy.trim();

      const res = await fetch('/api/hs/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        const message =
          body?.error ??
          (res.status === 429
            ? 'Too many signups from your network — please try again in a minute.'
            : 'Could not join the waitlist. Please try again.');
        setError(message);
        setStatus('error');
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        position?: number | null;
      };

      clearDraft();
      const qs = data.position ? `?position=${data.position}` : '';
      router.push(`/hs/thanks${qs}`);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={headingId}
      className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8"
      noValidate
    >
      <h2
        id={headingId}
        className="font-display text-2xl text-white md:text-3xl"
      >
        Get early access
      </h2>
      <p className="mt-2 text-sm text-white/70">
        Tell us who you are. We&rsquo;ll invite you when your state goes live.
      </p>

      {/* Role (radio group) */}
      <fieldset className="mt-6">
        <legend
          id={roleGroupId}
          className="text-sm font-medium text-white"
        >
          I&rsquo;m a&hellip;
        </legend>
        <div
          role="radiogroup"
          aria-labelledby={roleGroupId}
          className="mt-2 grid gap-2 sm:grid-cols-2"
        >
          {ROLE_OPTIONS.map((opt) => {
            const selected = form.role === opt.value;
            return (
              <label
                key={opt.value}
                className={[
                  'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                  selected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-white/10 hover:border-white/30',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={selected}
                  onChange={() => updateField('role', opt.value)}
                  className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-white">
                    {opt.label}
                  </span>
                  <span className="text-xs text-white/60">{opt.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Email */}
      <div className="mt-6">
        <label
          htmlFor={emailId}
          className="block text-sm font-medium text-white"
        >
          Email
        </label>
        <div className="mt-1.5">
          <Input
            id={emailId}
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            error={Boolean(fieldErrors.email)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? emailErrorId : undefined}
          />
        </div>
        {fieldErrors.email && (
          <p
            id={emailErrorId}
            role="alert"
            className="mt-1.5 text-sm text-[var(--color-error)]"
          >
            {fieldErrors.email}
          </p>
        )}
      </div>

      {/* State */}
      <div className="mt-6">
        <label
          htmlFor={stateId}
          className="block text-sm font-medium text-white"
        >
          State
        </label>
        <div className="mt-1.5">
          <Select
            options={stateOptions}
            value={form.stateChoice}
            onChange={(v) => updateField('stateChoice', v)}
            placeholder="Choose your state"
            name="state_code"
          />
        </div>
        {isUnlistedState && (
          <p className="mt-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/70">
            Your state isn&rsquo;t in our pilot yet. Drop your email above and
            we&rsquo;ll notify you the moment we expand. (The first three
            states we&rsquo;re opening are California, Florida, and Georgia.)
          </p>
        )}
      </div>

      {/* Athlete-only: graduation year */}
      {form.role === 'athlete' && (
        <div className="mt-6">
          <label
            htmlFor={gradYearId}
            className="block text-sm font-medium text-white"
          >
            Graduation year
          </label>
          <div className="mt-1.5">
            <Input
              id={gradYearId}
              type="number"
              inputMode="numeric"
              min={2026}
              max={2035}
              placeholder="2028"
              value={form.gradYear}
              onChange={(e) => updateField('gradYear', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Optional: sport */}
      <div className="mt-6">
        <label
          htmlFor={sportId}
          className="block text-sm font-medium text-white"
        >
          Sport <span className="text-white/50">(optional)</span>
        </label>
        <div className="mt-1.5">
          <Input
            id={sportId}
            type="text"
            autoComplete="off"
            placeholder="Football, soccer, track&hellip;"
            value={form.sport}
            onChange={(e) => updateField('sport', e.target.value)}
          />
        </div>
      </div>

      {/* Optional: school */}
      <div className="mt-6">
        <label
          htmlFor={schoolId}
          className="block text-sm font-medium text-white"
        >
          School <span className="text-white/50">(optional)</span>
        </label>
        <div className="mt-1.5">
          <Input
            id={schoolId}
            type="text"
            autoComplete="organization"
            placeholder="e.g. Mater Dei High School"
            value={form.schoolName}
            onChange={(e) => updateField('schoolName', e.target.value)}
          />
        </div>
      </div>

      {/* General error */}
      {status === 'error' && error && (
        <p
          id={generalErrorId}
          role="alert"
          className="mt-6 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]"
        >
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="mt-6">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={status === 'submitting'}
          disabled={status === 'submitting' || !canSubmit}
          aria-describedby={status === 'error' ? generalErrorId : undefined}
        >
          {status === 'submitting' ? 'Joining…' : 'Join the waitlist'}
        </Button>
        <p className="mt-3 text-xs text-white/50">
          We&rsquo;ll only email you about GradeUp HS. Unsubscribe any time.
        </p>
      </div>
    </form>
  );
}

export default WaitlistForm;
