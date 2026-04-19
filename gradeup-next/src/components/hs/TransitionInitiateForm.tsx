'use client';

/**
 * TransitionInitiateForm
 *
 * Athlete-facing form to kick off an HS-to-college transition. Collects:
 *   - college name + 2-letter state
 *   - NCAA division (D1/D2/D3/NAIA/JUCO/other)
 *   - matriculation date
 *   - whether they're continuing their sport
 *
 * On success we refresh the page so the server-rendered TransitionStatusCard
 * takes over. The form itself does NOT handle the proof upload — the status
 * card's TransitionProofUpload component handles that in the next step.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const STATES_2: readonly string[] = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

const DIVISIONS = [
  { value: 'D1', label: 'NCAA Division I' },
  { value: 'D2', label: 'NCAA Division II' },
  { value: 'D3', label: 'NCAA Division III' },
  { value: 'NAIA', label: 'NAIA' },
  { value: 'JUCO', label: 'Junior College (JUCO)' },
  { value: 'other', label: 'Other' },
] as const;

export interface TransitionInitiateFormProps {
  /** Optional — if the athlete has a graduation year we'll prefill a sensible default matriculation month. */
  defaultMatriculationYear?: number;
}

export default function TransitionInitiateForm({
  defaultMatriculationYear,
}: TransitionInitiateFormProps) {
  const router = useRouter();

  const [collegeName, setCollegeName] = useState('');
  const [collegeState, setCollegeState] = useState('CA');
  const [ncaaDivision, setNcaaDivision] =
    useState<(typeof DIVISIONS)[number]['value']>('D1');
  const [matriculationDate, setMatriculationDate] = useState<string>(() => {
    const year =
      defaultMatriculationYear ?? new Date().getUTCFullYear();
    return `${year}-08-15`;
  });
  const [sportContinued, setSportContinued] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (collegeName.trim().length < 2) {
      setError('Enter the college or university name.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(matriculationDate)) {
      setError('Pick a matriculation date.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/hs/athlete/transition/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeName: collegeName.trim(),
          collegeState,
          ncaaDivision,
          matriculationDate,
          sportContinued,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Submit failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed.');
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
          Start your transition
        </h2>
        <p className="mt-2 text-sm text-white/70">
          Tell us where you&apos;re headed. After you submit, you&apos;ll upload
          enrollment proof — an enrollment letter, official acceptance letter,
          or a college transcript showing enrolled status.
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
            placeholder="e.g. University of California, Los Angeles"
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
            Athletic division
          </span>
          <select
            value={ncaaDivision}
            onChange={(e) =>
              setNcaaDivision(
                e.target.value as (typeof DIVISIONS)[number]['value']
              )
            }
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
            Matriculation date
          </span>
          <input
            type="date"
            required
            value={matriculationDate}
            onChange={(e) => setMatriculationDate(e.target.value)}
            className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)]"
            disabled={submitting}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="sport-continued"
          type="checkbox"
          checked={sportContinued}
          onChange={(e) => setSportContinued(e.target.checked)}
          className="h-4 w-4 rounded border-white/30 bg-black/40"
          disabled={submitting}
        />
        <label
          htmlFor="sport-continued"
          className="text-sm text-white/80"
        >
          I&apos;m continuing my sport at this college.
        </label>
      </div>

      {error && (
        <p className="rounded-md border border-[var(--color-error,#DA2B57)]/50 bg-[var(--color-error,#DA2B57)]/10 p-3 text-sm text-[var(--color-error,#DA2B57)]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit transition request'}
        </Button>
      </div>

      <p className="text-xs text-white/50">
        After submitting you&apos;ll upload enrollment proof on the next
        screen. An admin reviews the proof and verifies the transition,
        typically within two business days.
      </p>
    </form>
  );
}
