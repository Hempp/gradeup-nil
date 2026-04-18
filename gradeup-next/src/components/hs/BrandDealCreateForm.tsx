'use client';

/**
 * BrandDealCreateForm — Client Component for HS brand deal creation.
 *
 * Fields:
 *   - Athlete lookup by email (NO free browsing — privacy trade-off
 *     explained below).
 *   - Deal title + description.
 *   - Deal category (consent-scope taxonomy — these exact ids are what
 *     deal-validation.ts::mapDealTypeToConsentCategory expects).
 *   - Compensation type (fixed / tiered-hybrid) + amount.
 *   - Start / end dates, deliverables.
 *
 * Preflight:
 *   "Check deal before posting" button calls
 *   POST /api/hs/brand/deals/preflight with the partial payload. The
 *   endpoint runs validateDealCreation() and returns the state_code,
 *   requires_disclosure, and any violations. Brand sees real-time
 *   feedback ("This category is banned in CA") BEFORE committing.
 *
 * Submit:
 *   POST /api/deals with target_bracket='high_school' (forced — the
 *   brand cannot override). On 422 with `violations`, we render them
 *   inline; on any other error we surface a generic message.
 *
 * Athlete picker privacy:
 *   Brands identify athletes by email only. The founder concierge does
 *   the initial matching; once an athlete is identified, the brand uses
 *   that email on this form. We do NOT expose a browsable athlete
 *   directory — HS athletes are minors and the platform commitment is
 *   that their PII is hidden from brands until a deal is in motion.
 *   (The backend find_hs_athlete_by_email RPC is SECURITY DEFINER,
 *   authenticated-only, rate-limited by the route it's called from, and
 *   logs every invocation.)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HS_DEAL_CATEGORIES } from '@/components/hs/BrandHSSignupForm';
import {
  DEFAULT_TEMPLATES,
  SUPPORTED_SHARE_PLATFORMS,
  type SharePlatform,
} from '@/lib/hs-nil/share';

interface Form {
  athleteEmail: string;
  title: string;
  description: string;
  dealCategory: string;
  compensationType: 'fixed' | 'hybrid';
  compensationAmount: string;
  startDate: string;
  endDate: string;
  deliverables: string;
}

const INITIAL: Form = {
  athleteEmail: '',
  title: '',
  description: '',
  dealCategory: '',
  compensationType: 'fixed',
  compensationAmount: '',
  startDate: '',
  endDate: '',
  deliverables: '',
};

// Map the consent-category id → the deal_type enum value the deals POST
// route accepts. The mapper in deal-validation.ts reads deal_type + tags
// and resolves the consent category back; setting BOTH keeps the round-
// trip unambiguous.
const CATEGORY_TO_DEAL_TYPE: Record<string, string> = {
  apparel: 'endorsement',
  food_beverage: 'endorsement',
  local_business: 'appearance',
  training: 'camp',
  autograph: 'autograph',
  social_media_promo: 'social_post',
};

interface PreflightResult {
  ok: boolean;
  violations?: string[];
  requires_disclosure?: boolean;
  state_code?: string | null;
  error?: string;
}

type ShareTemplateDraft = {
  platform: SharePlatform;
  copy: string;
};

const INITIAL_SHARE_TEMPLATES: ShareTemplateDraft[] = SUPPORTED_SHARE_PLATFORMS.map(
  (platform) => ({
    platform,
    copy: DEFAULT_TEMPLATES[platform].copy,
  }),
);

const SHARE_PLATFORM_LABEL: Record<SharePlatform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X',
  tiktok: 'TikTok',
  generic: 'Generic',
};

export interface BrandDealCreateFormProps {
  brandId: string;
  brandCategories: string[];
}

const inputCls =
  'mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 min-h-[44px]';

export default function BrandDealCreateForm({
  brandId,
  brandCategories,
}: BrandDealCreateFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(INITIAL);
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'preflight' | 'submit'>('idle');
  const [shareTemplates, setShareTemplates] = useState<ShareTemplateDraft[]>(
    INITIAL_SHARE_TEMPLATES,
  );
  const [shareOpen, setShareOpen] = useState<boolean>(false);

  const updateShareTemplate = (platform: SharePlatform, copy: string) => {
    setShareTemplates((prev) =>
      prev.map((t) => (t.platform === platform ? { ...t, copy } : t)),
    );
  };

  async function persistShareTemplates(dealId: string) {
    // Fire-and-forget the customized templates. If one fails, log and move
    // on — the celebration page will fall back to defaults for whichever
    // platform didn't make it.
    const customized = shareTemplates.filter((t) => {
      const base = DEFAULT_TEMPLATES[t.platform].copy;
      return t.copy.trim() && t.copy.trim() !== base.trim();
    });
    if (customized.length === 0) return;
    await Promise.all(
      customized.map(async (t) => {
        try {
          await fetch(`/api/hs/deals/${dealId}/share-templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: t.platform,
              copy_template: t.copy,
            }),
          }).catch(() => null);
        } catch {
          // swallow — defaults will be used at render time
        }
      }),
    );
  }

  // Filter the category picker to the ones the brand opted into at
  // signup, falling back to the full list if the brand hasn't locked
  // anything in yet (shouldn't happen; defensive).
  const availableCategories =
    brandCategories.length > 0
      ? HS_DEAL_CATEGORIES.filter((c) => brandCategories.includes(c.id))
      : HS_DEAL_CATEGORIES;

  const update =
    <K extends keyof Form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value as Form[K];
      setForm((f) => ({ ...f, [key]: value }));
      setPreflight(null);
      setSubmitError(null);
    };

  const validateShape = (): string | null => {
    if (!form.athleteEmail.trim()) return 'Enter the athlete\u2019s email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.athleteEmail.trim())) {
      return 'Athlete email is invalid.';
    }
    if (!form.title.trim()) return 'Deal title is required.';
    if (!form.dealCategory) return 'Pick a deal category.';
    if (!CATEGORY_TO_DEAL_TYPE[form.dealCategory]) {
      return 'Unknown deal category.';
    }
    const amt = Number(form.compensationAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return 'Enter a positive compensation amount.';
    }
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      return 'End date must be on or after start date.';
    }
    return null;
  };

  const buildPayload = () => ({
    athlete_email: form.athleteEmail.trim().toLowerCase(),
    brand_id: brandId,
    title: form.title.trim(),
    description: form.description.trim() || null,
    deal_type: CATEGORY_TO_DEAL_TYPE[form.dealCategory],
    tags: [form.dealCategory],
    compensation_type: form.compensationType,
    compensation_amount: Number(form.compensationAmount),
    start_date: form.startDate || null,
    end_date: form.endDate || null,
    deliverables: form.deliverables.trim()
      ? form.deliverables.split('\n').map((l) => l.trim()).filter(Boolean)
      : null,
    target_bracket: 'high_school' as const,
  });

  const handlePreflight = async () => {
    const shape = validateShape();
    if (shape) {
      setPreflight({ ok: false, violations: [shape] });
      return;
    }
    setBusy('preflight');
    setSubmitError(null);
    try {
      const res = await fetch('/api/hs/brand/deals/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = (await res.json().catch(() => ({}))) as PreflightResult & {
        error?: string;
      };
      if (!res.ok) {
        setPreflight({
          ok: false,
          violations: data.violations ?? [data.error ?? 'Preflight failed.'],
        });
        return;
      }
      setPreflight(data);
    } catch {
      setPreflight({
        ok: false,
        violations: ['Preflight request failed. Check your connection.'],
      });
    } finally {
      setBusy('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const shape = validateShape();
    if (shape) {
      setSubmitError(shape);
      return;
    }
    setBusy('submit');
    setSubmitError(null);

    try {
      // 1. Resolve athlete email → athlete_id via preflight RPC.
      const resolveRes = await fetch('/api/hs/brand/deals/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(), resolve_only: true }),
      });
      const resolved = (await resolveRes.json().catch(() => ({}))) as {
        athlete_id?: string;
        error?: string;
        violations?: string[];
      };
      if (!resolveRes.ok || !resolved.athlete_id) {
        setSubmitError(
          resolved.error ??
            resolved.violations?.join(' · ') ??
            'Could not find an HS athlete with that email.'
        );
        return;
      }

      // 2. POST /api/deals with target_bracket forced to 'high_school'.
      const payload = buildPayload();
      const body = {
        athlete_id: resolved.athlete_id,
        brand_id: payload.brand_id,
        title: payload.title,
        description: payload.description,
        deal_type: payload.deal_type,
        compensation_amount: payload.compensation_amount,
        compensation_type: payload.compensation_type,
        start_date: payload.start_date,
        end_date: payload.end_date,
        deliverables: payload.deliverables,
        tags: payload.tags,
        target_bracket: 'high_school',
      };

      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        violations?: string[];
        id?: string;
      };

      if (res.status === 422 && data.violations) {
        setPreflight({ ok: false, violations: data.violations });
        setSubmitError('State-rule violation — see details below.');
        return;
      }
      if (!res.ok) {
        setSubmitError(data.error ?? 'Could not create the deal.');
        return;
      }

      if (data.id) {
        await persistShareTemplates(data.id);
      }

      router.push('/hs/brand?posted=1');
    } catch {
      setSubmitError('Unexpected error posting the deal.');
    } finally {
      setBusy('idle');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8"
      noValidate
    >
      {submitError && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {submitError}
        </div>
      )}

      <Field
        label="Athlete email"
        htmlFor="d-athlete"
        hint="The athlete must already have an HS account. Ask the founder concierge if you\u2019re not sure."
      >
        <input
          id="d-athlete"
          type="email"
          autoComplete="off"
          required
          value={form.athleteEmail}
          onChange={update('athleteEmail')}
          className={inputCls}
          placeholder="jordan@example.com"
        />
      </Field>

      <Field label="Deal title" htmlFor="d-title">
        <input
          id="d-title"
          required
          value={form.title}
          onChange={update('title')}
          className={inputCls}
          placeholder="Back-to-school apparel collab"
        />
      </Field>

      <Field label="Description" htmlFor="d-desc" hint="What the partnership covers. Plain language.">
        <textarea
          id="d-desc"
          rows={3}
          value={form.description}
          onChange={update('description')}
          className={`${inputCls} min-h-[90px] py-2`}
          placeholder="One paragraph the parent can read and understand."
        />
      </Field>

      <Field label="Deal category" htmlFor="d-cat" hint="Must match the consent category the athlete's parent approves.">
        <select
          id="d-cat"
          required
          value={form.dealCategory}
          onChange={update('dealCategory')}
          className={inputCls}
        >
          <option value="">Select a category</option>
          {availableCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Compensation type" htmlFor="d-ctype">
          <select
            id="d-ctype"
            value={form.compensationType}
            onChange={update('compensationType')}
            className={inputCls}
          >
            <option value="fixed">Fixed</option>
            <option value="hybrid">Tiered / hybrid</option>
          </select>
        </Field>

        <Field label="Compensation amount (USD)" htmlFor="d-amt">
          <input
            id="d-amt"
            type="number"
            min="1"
            step="1"
            required
            value={form.compensationAmount}
            onChange={update('compensationAmount')}
            className={inputCls}
            placeholder="500"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Start date" htmlFor="d-start">
          <input
            id="d-start"
            type="date"
            value={form.startDate}
            onChange={update('startDate')}
            className={inputCls}
          />
        </Field>
        <Field label="End date" htmlFor="d-end">
          <input
            id="d-end"
            type="date"
            value={form.endDate}
            onChange={update('endDate')}
            className={inputCls}
          />
        </Field>
      </div>

      <Field
        label="Deliverables"
        htmlFor="d-deliverables"
        hint="One per line. E.g. 'One Instagram post tagging @brand'."
      >
        <textarea
          id="d-deliverables"
          rows={3}
          value={form.deliverables}
          onChange={update('deliverables')}
          className={`${inputCls} min-h-[90px] py-2`}
          placeholder={"One Instagram post\nOne in-store appearance"}
        />
      </Field>

      {/* Share templates (collapsible) */}
      <section className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
        <button
          type="button"
          onClick={() => setShareOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={shareOpen}
          aria-controls="share-templates-body"
        >
          <span>
            <span className="block text-sm font-semibold text-white">
              Share templates (optional)
            </span>
            <span className="mt-1 block text-xs text-white/60">
              Pre-approve the copy the athlete and parent share on signing.
              Placeholders: &#123;athleteFirstName&#125;, &#123;brandName&#125;,
              &#123;schoolName&#125;. Defaults are used if you leave these.
            </span>
          </span>
          <span aria-hidden="true" className="text-white/60">
            {shareOpen ? '\u2212' : '+'}
          </span>
        </button>

        {shareOpen && (
          <div id="share-templates-body" className="mt-4 space-y-4">
            {shareTemplates.map((t) => (
              <div key={t.platform}>
                <label
                  htmlFor={`share-tpl-${t.platform}`}
                  className="block text-xs font-semibold uppercase tracking-widest text-white/50"
                >
                  {SHARE_PLATFORM_LABEL[t.platform]}
                </label>
                <textarea
                  id={`share-tpl-${t.platform}`}
                  rows={3}
                  value={t.copy}
                  onChange={(e) =>
                    updateShareTemplate(t.platform, e.target.value)
                  }
                  className={`${inputCls} min-h-[80px] py-2`}
                  placeholder={DEFAULT_TEMPLATES[t.platform].copy}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Preflight result panel */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="mt-6"
      >
        {preflight && preflight.ok && (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <p className="font-semibold">Preflight passed.</p>
            <p className="mt-1 text-emerald-200/80">
              {preflight.state_code
                ? `State: ${preflight.state_code}. `
                : ''}
              {preflight.requires_disclosure
                ? 'This deal will trigger a compliance disclosure filing.'
                : 'No additional disclosure filing required.'}
            </p>
          </div>
        )}
        {preflight && !preflight.ok && preflight.violations && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <p className="font-semibold">Preflight blocked this deal:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {preflight.violations.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePreflight}
          disabled={busy !== 'idle'}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {busy === 'preflight' ? 'Checking...' : 'Check deal before posting'}
        </button>

        <button
          type="submit"
          disabled={busy !== 'idle' || (preflight !== null && !preflight.ok)}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy === 'submit' ? 'Posting deal...' : 'Post deal'}
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
