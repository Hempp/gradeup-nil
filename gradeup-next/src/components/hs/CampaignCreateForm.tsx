'use client';

/**
 * CampaignCreateForm — brand-side form for creating a multi-athlete
 * HS campaign. Distinct from the single-athlete deal form at
 * /hs/brand/deals/new. Shares the validation plumbing through POST
 * /api/hs/brand/campaigns (which runs createCampaign() + state-rule
 * pre-evaluation on the server).
 *
 * The brand picks one deal category per campaign (aligned with the
 * ConsentScope vocabulary). State-rule pre-evaluation runs against
 * the MOST RESTRICTIVE state in target_states so a TX-inclusive
 * campaign with training/autograph-type categories is flagged at
 * creation if TX's minimumAge=17 would block the target cohort.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PILOT_STATES } from '@/lib/hs-nil/state-rules';
import type { CampaignTemplateClone } from '@/lib/hs-nil/campaign-templates';

const CATEGORY_OPTIONS: ReadonlyArray<{
  id:
    | 'apparel'
    | 'food_beverage'
    | 'local_business'
    | 'training'
    | 'autograph'
    | 'social_media_promo';
  label: string;
}> = [
  { id: 'apparel', label: 'Apparel' },
  { id: 'food_beverage', label: 'Food & beverage' },
  { id: 'local_business', label: 'Local business' },
  { id: 'training', label: 'Training / camps' },
  { id: 'autograph', label: 'Autograph' },
  { id: 'social_media_promo', label: 'Social-media promo' },
];

const COMPENSATION_OPTIONS: ReadonlyArray<{
  id: 'fixed_per_deliverable' | 'per_conversion' | 'tiered';
  label: string;
}> = [
  { id: 'fixed_per_deliverable', label: 'Fixed per deliverable' },
  { id: 'per_conversion', label: 'Per conversion' },
  { id: 'tiered', label: 'Tiered' },
];

const SELECTION_OPTIONS: ReadonlyArray<{
  id: 'open_to_apply' | 'invited_only' | 'hybrid';
  label: string;
  hint: string;
}> = [
  {
    id: 'open_to_apply',
    label: 'Open to apply',
    hint: 'Any eligible athlete in your target states can apply.',
  },
  {
    id: 'invited_only',
    label: 'Invited only',
    hint: 'Only athletes you invite see the campaign.',
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    hint: 'Pre-invite a short list AND accept open applications.',
  },
];

interface FormState {
  title: string;
  description: string;
  dealCategory: string;
  compensationType: 'fixed_per_deliverable' | 'per_conversion' | 'tiered';
  baseCompensationDollars: string;
  maxAthletes: string;
  targetStates: string[];
  athleteSelection: 'open_to_apply' | 'invited_only' | 'hybrid';
  deliverablesTemplate: string;
  timelineStart: string;
  timelineEnd: string;
}

const INITIAL: FormState = {
  title: '',
  description: '',
  dealCategory: '',
  compensationType: 'fixed_per_deliverable',
  baseCompensationDollars: '',
  maxAthletes: '10',
  targetStates: [],
  athleteSelection: 'open_to_apply',
  deliverablesTemplate: '',
  timelineStart: '',
  timelineEnd: '',
};

export interface CampaignCreateFormProps {
  brandOperatingStates: string[];
  /**
   * When present, the form seeds from a cloned campaign template. The
   * brand still has to submit — createCampaign() runs state-rule
   * pre-evaluation and consent-scope mapping on save. Default behavior
   * (blank form) is unchanged when this prop is absent.
   */
  initialTemplate?: CampaignTemplateClone | null;
}

const inputCls =
  'mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 min-h-[44px]';

export default function CampaignCreateForm({
  brandOperatingStates,
  initialTemplate,
}: CampaignCreateFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    ...(initialTemplate
      ? {
          title: initialTemplate.title,
          description: initialTemplate.description,
          dealCategory: initialTemplate.dealCategory,
          baseCompensationDollars: initialTemplate.suggestedCompensationDollars,
          deliverablesTemplate: initialTemplate.deliverablesTemplate,
          timelineStart: initialTemplate.timelineStart,
          timelineEnd: initialTemplate.timelineEnd,
        }
      : {}),
    targetStates:
      brandOperatingStates.filter((s) =>
        (PILOT_STATES as readonly string[]).includes(s),
      ) || [],
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState<boolean>(false);

  const availableStates = (PILOT_STATES as readonly string[]).filter((s) =>
    brandOperatingStates.length === 0 ? true : brandOperatingStates.includes(s),
  );

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors([]);
  }

  function toggleState(state: string): void {
    setForm((f) => ({
      ...f,
      targetStates: f.targetStates.includes(state)
        ? f.targetStates.filter((s) => s !== state)
        : [...f.targetStates, state],
    }));
    setErrors([]);
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (form.title.trim().length < 2) errs.push('Title is required.');
    if (!form.dealCategory) errs.push('Pick a deal category.');
    const amt = Number(form.baseCompensationDollars);
    if (!Number.isFinite(amt) || amt < 0) {
      errs.push('Base compensation must be a non-negative number.');
    }
    const maxAth = Number(form.maxAthletes);
    if (!Number.isInteger(maxAth) || maxAth < 1 || maxAth > 500) {
      errs.push('Max athletes must be between 1 and 500.');
    }
    if (form.targetStates.length === 0) {
      errs.push('Pick at least one target state.');
    }
    if (
      form.timelineStart &&
      form.timelineEnd &&
      form.timelineStart > form.timelineEnd
    ) {
      errs.push('End date must be on or after start date.');
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const vs = validate();
    if (vs.length > 0) {
      setErrors(vs);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/hs/brand/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          deal_category: form.dealCategory,
          compensation_type: form.compensationType,
          base_compensation_cents: Math.round(
            Number(form.baseCompensationDollars) * 100,
          ),
          max_athletes: Number(form.maxAthletes),
          target_states: form.targetStates,
          athlete_selection: form.athleteSelection,
          deliverables_template: form.deliverablesTemplate.trim() || null,
          timeline_start: form.timelineStart || null,
          timeline_end: form.timelineEnd || null,
          template_slug: initialTemplate?.templateSlug ?? null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        campaign?: { id: string };
        error?: string;
        violations?: string[];
      };
      if (!res.ok) {
        setErrors(
          data.violations && data.violations.length > 0
            ? data.violations
            : [data.error ?? 'Could not create campaign.'],
        );
        return;
      }
      if (data.campaign?.id) {
        router.push(`/hs/brand/campaigns/${data.campaign.id}`);
      } else {
        router.push('/hs/brand/campaigns');
      }
    } catch {
      setErrors(['Unexpected error creating the campaign.']);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8"
      noValidate
    >
      {initialTemplate && (
        <div
          role="status"
          className="mb-6 rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-4 py-3 text-sm text-white/90"
        >
          <p className="font-semibold text-white">
            Seeded from template: {initialTemplate.templateTitle}
          </p>
          <p className="mt-1 text-xs text-white/70">
            National baseline compensation pre-filled. CA / NY / TX typically
            run 20-30% higher — adjust before saving.
          </p>
        </div>
      )}

      {errors.length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <p className="font-semibold">We could not create that campaign:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <Field label="Campaign title" htmlFor="c-title">
        <input
          id="c-title"
          required
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          className={inputCls}
          placeholder="Spring training creator drop"
        />
      </Field>

      <Field label="Description" htmlFor="c-desc" hint="What the campaign covers — plain language.">
        <textarea
          id="c-desc"
          rows={3}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          className={`${inputCls} min-h-[90px] py-2`}
        />
      </Field>

      <Field
        label="Deal category"
        htmlFor="c-cat"
        hint="Single category per campaign. Must match a parental-consent category."
      >
        <select
          id="c-cat"
          required
          value={form.dealCategory}
          onChange={(e) => update('dealCategory', e.target.value)}
          className={inputCls}
        >
          <option value="">Select a category</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Compensation type" htmlFor="c-ctype">
          <select
            id="c-ctype"
            value={form.compensationType}
            onChange={(e) =>
              update(
                'compensationType',
                e.target.value as FormState['compensationType'],
              )
            }
            className={inputCls}
          >
            {COMPENSATION_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Base compensation (USD per athlete)" htmlFor="c-comp">
          <input
            id="c-comp"
            type="number"
            min="0"
            step="1"
            required
            value={form.baseCompensationDollars}
            onChange={(e) => update('baseCompensationDollars', e.target.value)}
            className={inputCls}
            placeholder="250"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Max athletes" htmlFor="c-max">
          <input
            id="c-max"
            type="number"
            min="1"
            max="500"
            required
            value={form.maxAthletes}
            onChange={(e) => update('maxAthletes', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Athlete selection" htmlFor="c-sel">
          <select
            id="c-sel"
            value={form.athleteSelection}
            onChange={(e) =>
              update(
                'athleteSelection',
                e.target.value as FormState['athleteSelection'],
              )
            }
            className={inputCls}
          >
            {SELECTION_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p className="mt-1 text-xs text-white/50">
        {
          SELECTION_OPTIONS.find((o) => o.id === form.athleteSelection)?.hint
        }
      </p>

      <Field
        label="Target states"
        htmlFor="c-states"
        hint="The state-rule engine evaluates against the most restrictive state you pick. TX requires athletes to be 17+ at deal time."
      >
        <div id="c-states" className="mt-2 flex flex-wrap gap-2">
          {availableStates.map((s) => {
            const selected = form.targetStates.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleState(s)}
                aria-pressed={selected}
                className={`inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-sm transition-colors ${
                  selected
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'border-white/20 text-white/70 hover:border-white/40'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="Deliverables template"
        htmlFor="c-deliv"
        hint="One per line. The same deliverable list is applied to every spawned deal."
      >
        <textarea
          id="c-deliv"
          rows={3}
          value={form.deliverablesTemplate}
          onChange={(e) => update('deliverablesTemplate', e.target.value)}
          className={`${inputCls} min-h-[90px] py-2`}
          placeholder={'One Instagram post\nOne in-store visit'}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Timeline start" htmlFor="c-start">
          <input
            id="c-start"
            type="date"
            value={form.timelineStart}
            onChange={(e) => update('timelineStart', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Timeline end" htmlFor="c-end">
          <input
            id="c-end"
            type="date"
            value={form.timelineEnd}
            onChange={(e) => update('timelineEnd', e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Creating...' : 'Save as draft'}
        </button>
      </div>
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
