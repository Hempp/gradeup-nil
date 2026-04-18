'use client';

/**
 * DisputeResolutionPanel — admin mediation UI.
 *
 * Renders the dispute + deal context and four decision buttons:
 *   - In favor of athlete   → deal transitions back to in_review
 *   - In favor of brand     → deal transitions to cancelled
 *   - Split decision        → deal status left as-is; admin acts follow-up
 *   - Withdraw              → restores pre-dispute deal status
 *
 * The admin must supply a summary rationale (min 30 chars) and pick an
 * action preset. Presets map to a structured JSON payload stored in
 * deal_disputes.resolution_action for audit purposes.
 */

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Outcome = 'athlete' | 'brand' | 'split' | 'withdraw';

interface ActionPreset {
  id: string;
  label: string;
  json: Record<string, unknown>;
  appliesTo: Outcome[];
}

const ACTION_PRESETS: ActionPreset[] = [
  {
    id: 'refund_athlete',
    label: 'Refund athlete (full)',
    json: { refund: true, payout_release: false, magnitude: 'full' },
    appliesTo: ['athlete', 'split'],
  },
  {
    id: 'release_payout',
    label: 'Release payout to athlete',
    json: { refund: false, payout_release: true, magnitude: 'full' },
    appliesTo: ['athlete', 'split'],
  },
  {
    id: 'partial_50',
    label: 'Partial refund / release (~50%)',
    json: { refund: true, payout_release: true, magnitude: 'partial_50' },
    appliesTo: ['split'],
  },
  {
    id: 'cancel_full',
    label: 'Cancel deal, refund brand',
    json: { refund: false, payout_release: false, cancel: true, magnitude: 'full' },
    appliesTo: ['brand'],
  },
  {
    id: 'no_action',
    label: 'No payout / refund change',
    json: { refund: false, payout_release: false, cancel: false },
    appliesTo: ['athlete', 'brand', 'split', 'withdraw'],
  },
  {
    id: 'resume',
    label: 'Resume deal at prior status',
    json: { refund: false, payout_release: false, resume: true },
    appliesTo: ['withdraw'],
  },
];

const OUTCOME_META: Record<
  Outcome,
  { label: string; consequence: string; tone: 'primary' | 'danger' | 'neutral' }
> = {
  athlete: {
    label: 'In favor of athlete',
    consequence:
      'The deal transitions back to in_review so the brand re-reviews the deliverable. Any payout or refund action is recorded here but must be executed separately.',
    tone: 'primary',
  },
  brand: {
    label: 'In favor of brand',
    consequence:
      'The deal transitions to cancelled. Any refund owed to the brand must still be executed through the payout ops surface.',
    tone: 'danger',
  },
  split: {
    label: 'Split decision',
    consequence:
      'The deal status is left as-is. You are expected to take manual follow-up actions (partial release / refund) through the existing ops endpoints.',
    tone: 'neutral',
  },
  withdraw: {
    label: 'Withdraw dispute',
    consequence:
      'The dispute is closed without a ruling. The deal is restored to the status it held before the dispute was raised.',
    tone: 'neutral',
  },
};

export interface DisputeResolutionPanelProps {
  disputeId: string;
  dealId: string;
  dealTitle: string;
  dealStatusBeforeDispute: string | null;
  reasonCategory: string;
  priority: string;
  raisedByRole: string;
  description: string;
  evidenceUrls: string[];
  athleteName: string | null;
  brandName: string | null;
  deliverableSummary?: string | null;
  approvalSummary?: string | null;
}

type UiState =
  | { phase: 'idle' }
  | { phase: 'confirm'; outcome: Outcome }
  | { phase: 'submitting' }
  | { phase: 'done' }
  | { phase: 'error'; message: string };

export function DisputeResolutionPanel(props: DisputeResolutionPanelProps) {
  const {
    disputeId,
    dealId,
    dealTitle,
    dealStatusBeforeDispute,
    reasonCategory,
    priority,
    raisedByRole,
    description,
    evidenceUrls,
    athleteName,
    brandName,
    deliverableSummary,
    approvalSummary,
  } = props;

  const [state, setState] = useState<UiState>({ phase: 'idle' });
  const [summary, setSummary] = useState('');
  const [actionPresetId, setActionPresetId] = useState<string>('no_action');
  const [, startTransition] = useTransition();
  const router = useRouter();

  const baseId = useId();
  const summaryId = `${baseId}-summary`;
  const actionId = `${baseId}-action`;
  const errorId = `${baseId}-error`;

  const summaryLen = summary.trim().length;
  const summaryValid = summaryLen >= 30 && summaryLen <= 4000;

  const submitting = state.phase === 'submitting';

  const outcome = state.phase === 'confirm' ? state.outcome : null;
  const availablePresets = outcome
    ? ACTION_PRESETS.filter((p) => p.appliesTo.includes(outcome))
    : ACTION_PRESETS.filter((p) => p.id === 'no_action');

  async function onConfirm() {
    if (!outcome || !summaryValid) return;
    const preset =
      ACTION_PRESETS.find((p) => p.id === actionPresetId) ??
      ACTION_PRESETS.find((p) => p.id === 'no_action')!;
    setState({ phase: 'submitting' });
    try {
      const res = await fetch('/api/hs/admin/actions/dispute-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId,
          outcome,
          summary: summary.trim(),
          action: { preset: preset.id, ...preset.json },
        }),
      });
      type ApiBody = {
        ok?: boolean;
        auditLogId?: string;
        error?: string;
      };
      const data: ApiBody = await res.json().catch(() => ({}) as ApiBody);
      if (!res.ok || !data.ok) {
        setState({
          phase: 'error',
          message: data.error || `Request failed (${res.status}).`,
        });
        return;
      }
      setState({ phase: 'done' });
      startTransition(() => router.refresh());
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Dispute
        </p>
        <h2 className="mt-2 font-display text-2xl text-white md:text-3xl">
          {dealTitle}
        </h2>
        <dl className="mt-4 grid gap-3 text-sm text-white/80 md:grid-cols-2">
          <div>
            <dt className="text-white/50">Raised by</dt>
            <dd className="font-medium capitalize">{raisedByRole}</dd>
          </div>
          <div>
            <dt className="text-white/50">Category</dt>
            <dd className="font-medium capitalize">
              {reasonCategory.replace(/_/g, ' ')}
            </dd>
          </div>
          <div>
            <dt className="text-white/50">Priority</dt>
            <dd className="font-medium capitalize">{priority}</dd>
          </div>
          <div>
            <dt className="text-white/50">Prior deal status</dt>
            <dd className="font-medium">
              {dealStatusBeforeDispute ?? 'unknown'}
            </dd>
          </div>
          <div>
            <dt className="text-white/50">Athlete</dt>
            <dd className="font-medium">{athleteName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-white/50">Brand</dt>
            <dd className="font-medium">{brandName ?? '—'}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Description
          </p>
          <p className="mt-2 whitespace-pre-wrap rounded-md bg-black/30 p-4 text-sm text-white/90">
            {description}
          </p>
        </div>

        {evidenceUrls.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Evidence
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {evidenceUrls.map((u, i) => (
                <li key={i}>
                  <a
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-primary)] underline underline-offset-2 hover:opacity-80"
                  >
                    {u}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(deliverableSummary || approvalSummary) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {deliverableSummary && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                  Latest deliverable
                </p>
                <p className="mt-2 rounded-md bg-black/30 p-3 text-xs text-white/80">
                  {deliverableSummary}
                </p>
              </div>
            )}
            {approvalSummary && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                  Latest approval / review
                </p>
                <p className="mt-2 rounded-md bg-black/30 p-3 text-xs text-white/80">
                  {approvalSummary}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
        <h3 className="font-display text-xl text-white">Rationale</h3>
        <p className="mt-1 text-xs text-white/60">
          Required. Min 30 chars. Written to deal_disputes.resolution_summary
          and admin_audit_log.reason. Both parties see this in their
          resolution email.
        </p>
        <textarea
          id={summaryId}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={submitting}
          rows={5}
          minLength={30}
          maxLength={4000}
          placeholder="Describe the decision — what evidence weighed heaviest, what the admin verified, and what each side should expect next."
          className="mt-3 block w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-white/50">
          {summaryLen < 30 ? `${summaryLen}/30 minimum` : `${summaryLen} chars`}
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
        <h3 className="font-display text-xl text-white">Decision</h3>
        <p className="mt-1 text-xs text-white/60">
          Pick the outcome. Each button shows a consequence preview before
          you commit.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {(['athlete', 'brand', 'split', 'withdraw'] as Outcome[]).map((o) => {
            const meta = OUTCOME_META[o];
            const tone =
              meta.tone === 'danger'
                ? 'border-[var(--color-error,#DA2B57)]/60 text-[var(--color-error,#DA2B57)] hover:bg-[var(--color-error,#DA2B57)]/10'
                : meta.tone === 'neutral'
                  ? 'border-white/30 text-white/80 hover:bg-white/10'
                  : 'border-[var(--accent-primary)]/60 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10';
            return (
              <button
                key={o}
                type="button"
                onClick={() => {
                  if (!summaryValid) return;
                  setActionPresetId(
                    ACTION_PRESETS.find((p) => p.appliesTo.includes(o))?.id ??
                      'no_action'
                  );
                  setState({ phase: 'confirm', outcome: o });
                }}
                disabled={!summaryValid || submitting}
                className={[
                  'inline-flex min-h-[44px] items-center rounded-md border px-4 py-2 text-sm font-semibold uppercase tracking-widest transition',
                  summaryValid
                    ? tone
                    : 'cursor-not-allowed border-white/10 text-white/40',
                ].join(' ')}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        {!summaryValid && (
          <p className="mt-3 text-xs text-white/50">
            Write a rationale (at least 30 characters) to enable the
            decision buttons.
          </p>
        )}
      </section>

      {state.phase === 'confirm' && outcome && (
        <section
          className="rounded-2xl border border-[var(--accent-primary)]/40 bg-black/40 p-6 md:p-8"
          role="dialog"
          aria-label="Confirm dispute decision"
        >
          <h3 className="font-display text-xl text-white">
            Confirm: {OUTCOME_META[outcome].label}
          </h3>
          <p className="mt-2 text-sm text-white/80">
            {OUTCOME_META[outcome].consequence}
          </p>

          <div className="mt-6">
            <label
              htmlFor={actionId}
              className="block text-xs font-semibold uppercase tracking-widest text-white/60"
            >
              Follow-up action (informational — recorded in the audit log)
            </label>
            <select
              id={actionId}
              value={actionPresetId}
              onChange={(e) => setActionPresetId(e.target.value)}
              disabled={submitting}
              className="mt-2 block min-h-[44px] w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white"
            >
              {availablePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] text-white/50">
              This does not execute the action. For payout release / refund,
              use the existing payout ops endpoints after resolving.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="inline-flex min-h-[44px] items-center rounded-md border border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/15 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Resolving…' : 'Yes, resolve dispute'}
            </button>
            <button
              type="button"
              onClick={() => setState({ phase: 'idle' })}
              disabled={submitting}
              className="inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {state.phase === 'done' && (
        <section
          className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6 md:p-8"
          role="status"
        >
          <p className="text-sm text-white/90">
            Dispute resolved. Deal <code className="text-xs">{dealId}</code>{' '}
            updated. Both parties have been emailed.
          </p>
        </section>
      )}

      {state.phase === 'error' && (
        <p
          id={errorId}
          role="alert"
          className="rounded-md border border-[var(--color-error,#DA2B57)]/40 bg-[var(--color-error,#DA2B57)]/10 px-3 py-2 text-sm text-[var(--color-error,#DA2B57)]"
        >
          {state.message}
        </p>
      )}
    </div>
  );
}

export default DisputeResolutionPanel;
