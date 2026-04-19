'use client';

/**
 * MentorOnboardingForm — alumni-facing.
 *
 * Creates an alumni_mentor_profiles row for the caller. Only shown on
 * /hs/alumni/setup after the server has confirmed the user is transition-
 * verified. A second write (PATCH) supports edits from the same form
 * when initialProfile is provided.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type {
  MentorProfile,
  NcaaDivision,
  MentorAvailability,
} from '@/lib/hs-nil/mentors';

const STATES_2: readonly string[] = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

const DIVISIONS: Array<{ value: NcaaDivision; label: string }> = [
  { value: 'D1', label: 'NCAA Division I' },
  { value: 'D2', label: 'NCAA Division II' },
  { value: 'D3', label: 'NCAA Division III' },
  { value: 'NAIA', label: 'NAIA' },
  { value: 'JUCO', label: 'Junior College (JUCO)' },
  { value: 'other', label: 'Other' },
];

const AVAILABILITIES: Array<{ value: MentorAvailability; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every other week' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'paused', label: 'Paused' },
];

export interface MentorOnboardingFormProps {
  initialProfile?: MentorProfile | null;
}

export default function MentorOnboardingForm({
  initialProfile,
}: MentorOnboardingFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialProfile);

  const [collegeName, setCollegeName] = useState(
    initialProfile?.collegeName ?? ''
  );
  const [collegeState, setCollegeState] = useState(
    initialProfile?.collegeState ?? 'CA'
  );
  const [ncaaDivision, setNcaaDivision] = useState<NcaaDivision>(
    initialProfile?.ncaaDivision ?? 'D1'
  );
  const [currentSport, setCurrentSport] = useState(
    initialProfile?.currentSport ?? ''
  );
  const [bio, setBio] = useState(initialProfile?.bio ?? '');
  const [availability, setAvailability] = useState<MentorAvailability>(
    initialProfile?.availability ?? 'monthly'
  );
  const [specialtiesRaw, setSpecialtiesRaw] = useState(
    (initialProfile?.specialties ?? []).join(', ')
  );
  const [acceptsMessageOnly, setAcceptsMessageOnly] = useState(
    initialProfile?.acceptsMessageOnly ?? true
  );
  const [acceptsVideoCall, setAcceptsVideoCall] = useState(
    initialProfile?.acceptsVideoCall ?? false
  );
  const [hourlyRate, setHourlyRate] = useState<string>(
    initialProfile?.hourlyRateCents === null ||
      initialProfile?.hourlyRateCents === undefined
      ? ''
      : String((initialProfile.hourlyRateCents ?? 0) / 100)
  );
  const [visibleToHs, setVisibleToHs] = useState(
    initialProfile?.visibleToHs ?? true
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (collegeName.trim().length < 2) {
      setError('Enter your college name.');
      return;
    }
    if (currentSport.trim().length < 1) {
      setError('Enter the sport you play.');
      return;
    }
    if (bio.trim().length < 1) {
      setError('Write a short bio — this is what HS athletes see first.');
      return;
    }

    const parsedRate = hourlyRate.trim();
    let hourlyRateCents: number | null = null;
    if (parsedRate.length > 0) {
      const num = Number(parsedRate);
      if (!Number.isFinite(num) || num < 0) {
        setError('Hourly rate must be a non-negative number or blank for pro-bono.');
        return;
      }
      hourlyRateCents = Math.round(num * 100);
    }

    const specialties = specialtiesRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 12);

    const payload = {
      collegeName: collegeName.trim(),
      collegeState,
      ncaaDivision,
      currentSport: currentSport.trim(),
      bio: bio.trim(),
      availability,
      specialties,
      acceptsMessageOnly,
      acceptsVideoCall,
      hourlyRateCents,
      visibleToHs,
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/hs/mentors/profile', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Save failed (${res.status})`);
      }
      router.push('/hs/alumni/sessions');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-xl border border-white/10 bg-white/5 p-6"
    >
      <div>
        <h2 className="font-display text-2xl text-white md:text-3xl">
          {isEditing ? 'Update your mentor profile' : 'Become a mentor'}
        </h2>
        <p className="mt-2 text-sm text-white/70">
          HS athletes see this profile when they browse mentors. Be specific —
          the best mentor cards mention what you wish someone had told you.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/60">
            College / university
          </span>
          <input
            type="text"
            required
            maxLength={200}
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
            disabled={submitting}
          />
        </label>

        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/60">
            State
          </span>
          <select
            value={collegeState}
            onChange={(e) => setCollegeState(e.target.value)}
            className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)]"
            disabled={submitting}
          >
            {STATES_2.map((s) => (
              <option key={s} value={s} className="bg-black">
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/60">
            Division
          </span>
          <select
            value={ncaaDivision}
            onChange={(e) => setNcaaDivision(e.target.value as NcaaDivision)}
            className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)]"
            disabled={submitting}
          >
            {DIVISIONS.map((d) => (
              <option key={d.value} value={d.value} className="bg-black">
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/60">
            Current sport
          </span>
          <input
            type="text"
            required
            maxLength={80}
            value={currentSport}
            onChange={(e) => setCurrentSport(e.target.value)}
            placeholder="e.g. Soccer"
            className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
            disabled={submitting}
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-xs font-semibold uppercase tracking-widest text-white/60">
          Bio (visible to HS athletes, max 2000 chars)
        </span>
        <textarea
          required
          maxLength={2000}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Two or three sentences on your path and what you can help with."
          rows={5}
          className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
          disabled={submitting}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/60">
            Availability
          </span>
          <select
            value={availability}
            onChange={(e) =>
              setAvailability(e.target.value as MentorAvailability)
            }
            className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)]"
            disabled={submitting}
          >
            {AVAILABILITIES.map((a) => (
              <option key={a.value} value={a.value} className="bg-black">
                {a.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/60">
            Hourly rate (USD — blank for pro bono)
          </span>
          <input
            type="number"
            min={0}
            step="1"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="Leave blank for pro bono"
            className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
            disabled={submitting}
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-xs font-semibold uppercase tracking-widest text-white/60">
          Specialties (comma separated, up to 12)
        </span>
        <input
          type="text"
          maxLength={500}
          value={specialtiesRaw}
          onChange={(e) => setSpecialtiesRaw(e.target.value)}
          placeholder="recruiting, academic_planning, nil_deals"
          className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
          disabled={submitting}
        />
      </label>

      <div className="space-y-3 rounded-md border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
          How HS athletes can reach you
        </p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={acceptsMessageOnly}
            onChange={(e) => setAcceptsMessageOnly(e.target.checked)}
            className="h-4 w-4 rounded border-white/30 bg-black/40"
            disabled={submitting}
          />
          <span className="text-sm text-white/80">Async messages</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={acceptsVideoCall}
            onChange={(e) => setAcceptsVideoCall(e.target.checked)}
            className="h-4 w-4 rounded border-white/30 bg-black/40"
            disabled={submitting}
          />
          <span className="text-sm text-white/80">
            Video calls (scheduled in-thread for now)
          </span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={visibleToHs}
            onChange={(e) => setVisibleToHs(e.target.checked)}
            className="h-4 w-4 rounded border-white/30 bg-black/40"
            disabled={submitting}
          />
          <span className="text-sm text-white/80">
            Show my profile to HS athletes
          </span>
        </label>
      </div>

      {error && (
        <p className="rounded-md border border-[var(--color-error,#DA2B57)]/50 bg-[var(--color-error,#DA2B57)]/10 p-3 text-sm text-[var(--color-error,#DA2B57)]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <Button type="submit" variant="primary" size="lg" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : isEditing
              ? 'Save changes'
              : 'Create mentor profile'}
        </Button>
      </div>
    </form>
  );
}
