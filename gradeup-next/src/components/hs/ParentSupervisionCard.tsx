/**
 * ParentSupervisionCard
 *
 * Athlete-facing toggle for removing parent supervision once the
 * student-athlete turns 18 OR graduates. Until they hit that
 * threshold the toggle is visible but disabled, with copy that
 * tells them exactly when they'll qualify.
 *
 * Data flow:
 *   * On mount: GET /api/hs/athlete/parent-supervision → initial state.
 *   * On confirm-unlink: PATCH {action:'unlink', reason:'turned_18'|
 *     'graduated'|'athlete_choice'}.
 *   * On re-link: PATCH {action:'relink'}.
 *
 * The server re-verifies eligibility on unlink, so this component's
 * UI gating is a hint rather than a gate. We still render it
 * conservatively — the backend is the source of truth.
 *
 * We deliberately show the toggle as disabled (rather than hidden)
 * when ineligible so the athlete knows the feature exists and when
 * it'll unlock. That's friendlier than a silent absence.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  ShieldOff,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToastActions } from '@/components/ui/toast';
import { getCsrfHeaders } from '@/hooks/useCsrf';

// Keep the payload shape in lockstep with the API route. We re-declare
// here rather than importing from the route because route files
// aren't meant to be imported as modules from the client graph.
interface ParentSupervisionState {
  eligible: boolean;
  ageYears: number | null;
  ageMonths: number | null;
  graduationYear: number;
  parentUnlinkedAt: string | null;
  parentUnlinkReason: 'turned_18' | 'graduated' | 'athlete_choice' | null;
  parent: {
    linkId: string;
    emailMasked: string | null;
    fullName: string | null;
  } | null;
}

type UnlinkReason = 'turned_18' | 'graduated' | 'athlete_choice';

// ----------------------------------------------------------------------------
// Copy helpers
// ----------------------------------------------------------------------------

function formatAge(years: number | null, months: number | null): string {
  if (years === null) return 'Age on file is incomplete';
  const yearLabel = years === 1 ? 'year' : 'years';
  if (months === null || months === 0) {
    return `${years} ${yearLabel}`;
  }
  const monthLabel = months === 1 ? 'month' : 'months';
  return `${years} ${yearLabel}, ${months} ${monthLabel}`;
}

/**
 * Humanise the reason code for display. The stored enum is stable
 * across the backend; this is purely UI copy.
 */
function describeReason(
  reason: UnlinkReason | null,
): string {
  switch (reason) {
    case 'turned_18':
      return 'You turned 18';
    case 'graduated':
      return 'You graduated high school';
    case 'athlete_choice':
      return 'You chose to manage your own deals';
    default:
      return '';
  }
}

/**
 * Pick the default reason to pre-select in the confirm modal based
 * on what the server flagged as the qualifying event. Graduation
 * wins over age when both are true — it's the more common path for
 * seniors who unlock right at graduation regardless of birthday.
 */
function defaultReasonFor(state: ParentSupervisionState): UnlinkReason {
  const currentYear = new Date().getUTCFullYear();
  if (state.graduationYear <= currentYear) return 'graduated';
  if (state.ageYears !== null && state.ageYears >= 18) return 'turned_18';
  return 'athlete_choice';
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export interface ParentSupervisionCardProps {
  /**
   * Optional initial state. When provided, avoids the fetch-on-mount
   * flash for server components that already have the data. When
   * omitted the card fetches itself.
   */
  initialState?: ParentSupervisionState;
}

export function ParentSupervisionCard({
  initialState,
}: ParentSupervisionCardProps) {
  const toast = useToastActions();
  const [state, setState] = useState<ParentSupervisionState | null>(
    initialState ?? null,
  );
  const [loading, setLoading] = useState(!initialState);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Modals
  const [confirmUnlinkOpen, setConfirmUnlinkOpen] = useState(false);
  const [confirmRelinkOpen, setConfirmRelinkOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<UnlinkReason>('turned_18');

  // Stable mount guard so we can skip the fetch on hot-reload when
  // initialState is present.
  const fetchedRef = useRef(false);

  const loadState = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/hs/athlete/parent-supervision', {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        if (res.status === 404) {
          // Non-HS athlete or feature disabled — hide the card.
          setState(null);
          return;
        }
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? 'Could not load supervision state.');
      }
      const data = (await res.json()) as ParentSupervisionState;
      setState(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (!initialState) {
      void loadState();
    }
  }, [initialState, loadState]);

  const handlePatch = useCallback(
    async (body: { action: 'unlink'; reason: UnlinkReason } | { action: 'relink' }) => {
      setPending(true);
      try {
        const res = await fetch('/api/hs/athlete/parent-supervision', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            ...getCsrfHeaders(),
          },
          body: JSON.stringify(body),
        });
        const payload = (await res.json().catch(() => ({}))) as
          | ParentSupervisionState
          | { error?: string };
        if (!res.ok) {
          const errMsg =
            (payload as { error?: string }).error ??
            'Could not update supervision.';
          throw new Error(errMsg);
        }
        setState(payload as ParentSupervisionState);
        if (body.action === 'unlink') {
          toast.success(
            'Parent supervision removed',
            'You can now approve NIL deals yourself. Your past deals are unaffected.',
          );
        } else {
          toast.success(
            'Parent supervision restored',
            'New deals will require parental consent again.',
          );
        }
        setConfirmUnlinkOpen(false);
        setConfirmRelinkOpen(false);
      } catch (err) {
        toast.error(
          'Update failed',
          err instanceof Error ? err.message : 'Please try again.',
        );
      } finally {
        setPending(false);
      }
    },
    [toast],
  );

  // When the athlete opens the unlink modal, pick a sensible default
  // reason so they don't have to fiddle with the radios in the happy
  // path.
  const openUnlinkModal = useCallback(() => {
    if (!state) return;
    setSelectedReason(defaultReasonFor(state));
    setConfirmUnlinkOpen(true);
  }, [state]);

  // --------------------------------------------------------------------------
  // Loading / error / hidden states
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-primary-muted)] flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base">Parent Supervision</CardTitle>
              <p className="text-sm text-[var(--text-muted)]">Loading…</p>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-error-muted)] flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-[var(--color-error)]" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base">Parent Supervision</CardTitle>
              <p className="text-sm text-[var(--text-muted)]">
                Couldn&rsquo;t load supervision status.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-error)]">{loadError}</p>
          <Button
            className="mt-3"
            variant="outline"
            size="sm"
            onClick={() => void loadState()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not an HS-NIL athlete — hide the card entirely.
  if (!state) return null;

  // --------------------------------------------------------------------------
  // Main card
  // --------------------------------------------------------------------------

  const isUnlinked = Boolean(state.parentUnlinkedAt);
  const canUnlink = state.eligible && !isUnlinked;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className={
                isUnlinked
                  ? 'h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-primary-muted)] flex items-center justify-center'
                  : 'h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-primary-muted)] flex items-center justify-center'
              }
            >
              {isUnlinked ? (
                <ShieldOff
                  className="h-5 w-5 text-[var(--color-primary)]"
                  aria-hidden="true"
                />
              ) : (
                <ShieldCheck
                  className="h-5 w-5 text-[var(--color-primary)]"
                  aria-hidden="true"
                />
              )}
            </div>
            <div>
              <CardTitle className="text-base">Parent Supervision</CardTitle>
              <p className="text-sm text-[var(--text-muted)]">
                {isUnlinked
                  ? 'You are managing your own NIL deals.'
                  : 'Your parent or guardian approves NIL deals with you.'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status summary */}
            {isUnlinked ? (
              <div
                className="rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4"
                aria-live="polite"
              >
                <p className="text-sm text-[var(--text-primary)]">
                  Parent supervision removed.
                </p>
                {state.parentUnlinkReason && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Reason: {describeReason(state.parentUnlinkReason)}
                  </p>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Existing signed consents remain on file for past deals. New
                  deals no longer require parental approval.
                </p>
              </div>
            ) : state.eligible ? (
              <div
                className="rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4"
                aria-live="polite"
              >
                <p className="text-sm text-[var(--text-primary)]">
                  You&rsquo;re eligible to manage your own NIL deals.
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Removing supervision won&rsquo;t erase past consents — those
                  stay on file. It only affects new deals going forward.
                </p>
              </div>
            ) : (
              <div
                className="rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4"
                aria-live="polite"
              >
                <p className="text-sm text-[var(--text-primary)]">
                  You can remove parent supervision when you turn 18 or
                  graduate high school.
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Today: {formatAge(state.ageYears, state.ageMonths)} ·
                  Graduation year: {state.graduationYear}
                </p>
              </div>
            )}

            {/* Action row */}
            <div className="flex items-center justify-between gap-4 py-2 border-t border-[var(--border-color)]">
              <div className="min-w-0">
                <p className="font-medium text-[var(--text-primary)]">
                  {isUnlinked
                    ? 'Restore parent supervision'
                    : 'Remove parent supervision'}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {isUnlinked
                    ? state.parent?.fullName
                      ? `Re-link with ${state.parent.fullName}.`
                      : 'Re-link with your parent on file.'
                    : 'Stops requiring parent co-sign on new NIL deals.'}
                </p>
              </div>
              {isUnlinked ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRelinkOpen(true)}
                  disabled={pending}
                >
                  <UserCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                  Re-link parent
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openUnlinkModal}
                  disabled={!canUnlink || pending}
                  aria-disabled={!canUnlink || pending}
                  title={
                    canUnlink
                      ? undefined
                      : 'Unlocks when you turn 18 or graduate.'
                  }
                >
                  <ShieldOff className="h-4 w-4 mr-2" aria-hidden="true" />
                  Remove supervision
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirm unlink modal */}
      <Modal
        isOpen={confirmUnlinkOpen}
        onClose={() => (pending ? undefined : setConfirmUnlinkOpen(false))}
        title="Remove parent supervision?"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmUnlinkOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                void handlePatch({ action: 'unlink', reason: selectedReason })
              }
              isLoading={pending}
              disabled={pending}
            >
              <ShieldOff className="h-4 w-4 mr-2" aria-hidden="true" />
              Remove supervision
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div
            className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-primary-muted)]"
          >
            <ShieldCheck
              className="h-6 w-6 text-[var(--color-primary)] flex-shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                Your past consents stay on file.
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Every deal your parent already approved remains legally binding
                for that deal. Removing supervision only affects new deals you
                sign after today.
              </p>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm text-[var(--text-muted)] mb-1">
              Why are you removing supervision?
            </legend>
            {(
              [
                { value: 'turned_18', label: 'I turned 18' },
                { value: 'graduated', label: 'I graduated high school' },
                {
                  value: 'athlete_choice',
                  label: 'I want to manage my own deals',
                },
              ] as ReadonlyArray<{ value: UnlinkReason; label: string }>
            ).map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-tertiary)]"
              >
                <input
                  type="radio"
                  name="unlink-reason"
                  value={option.value}
                  checked={selectedReason === option.value}
                  onChange={() => setSelectedReason(option.value)}
                  className="accent-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">
                  {option.label}
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      </Modal>

      {/* Confirm relink modal */}
      <Modal
        isOpen={confirmRelinkOpen}
        onClose={() => (pending ? undefined : setConfirmRelinkOpen(false))}
        title="Restore parent supervision?"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmRelinkOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handlePatch({ action: 'relink' })}
              isLoading={pending}
              disabled={pending}
            >
              <UserCheck className="h-4 w-4 mr-2" aria-hidden="true" />
              Restore supervision
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            New NIL deals will require parental approval again.
          </p>
          {state.parent?.fullName ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4">
              <p className="text-sm text-[var(--text-primary)]">
                Parent on file: <strong>{state.parent.fullName}</strong>
              </p>
              {state.parent.emailMasked && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {state.parent.emailMasked}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              We&rsquo;ll use the parent link already on your profile.
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}

export default ParentSupervisionCard;
