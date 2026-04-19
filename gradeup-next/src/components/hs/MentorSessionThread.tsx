'use client';

/**
 * MentorSessionThread — shared message thread view.
 *
 * Used by both roles — athlete and mentor — for a single session request.
 * Renders the session header, any metadata (topic, status), an accept/decline
 * affordance for the mentor on pending requests, and the message list with
 * optimistic posting.
 *
 * Messaging is disabled when the session is declined/expired. It remains
 * open for pending (so the parties can clarify before the mentor accepts),
 * accepted (the main mode), completed (archive read + follow-up), and
 * cancelled (we still allow it since we don't currently support cancel
 * but future-proofing the permissive case).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type {
  MentorSessionRequest,
  MentorMessage,
  MentorSessionStatus,
} from '@/lib/hs-nil/mentors';
import { sessionStatusLabel } from '@/lib/hs-nil/mentors';

export interface MentorSessionThreadProps {
  session: MentorSessionRequest;
  initialMessages: MentorMessage[];
  viewerUserId: string;
  viewerRole: 'mentor' | 'athlete';
  mentorDisplayName: string;
  athleteDisplayName: string;
}

const STATUS_TONE: Record<MentorSessionStatus, string> = {
  pending: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  accepted: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  declined: 'border-rose-400/40 bg-rose-400/10 text-rose-200',
  completed: 'border-blue-400/40 bg-blue-400/10 text-blue-200',
  cancelled: 'border-white/20 bg-white/5 text-white/60',
  expired: 'border-white/20 bg-white/5 text-white/60',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MentorSessionThread({
  session: initialSession,
  initialMessages,
  viewerUserId,
  viewerRole,
  mentorDisplayName,
  athleteDisplayName,
}: MentorSessionThreadProps) {
  const router = useRouter();
  const [session, setSession] = useState<MentorSessionRequest>(initialSession);
  const [messages, setMessages] = useState<MentorMessage[]>(initialMessages);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [decisionSubmitting, setDecisionSubmitting] = useState<null | 'accept' | 'decline' | 'complete'>(
    null
  );

  const listRef = useRef<HTMLDivElement | null>(null);

  const messagingDisabled = useMemo(
    () => session.status === 'declined' || session.status === 'expired',
    [session.status]
  );

  useEffect(() => {
    // Autoscroll on new messages
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  async function onPostMessage(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);

    // Optimistic append
    const optimistic: MentorMessage = {
      id: `optimistic-${Date.now()}`,
      sessionRequestId: session.id,
      senderUserId: viewerUserId,
      senderRole: viewerRole,
      body: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setBody('');

    try {
      const res = await fetch(
        `/api/hs/mentor-sessions/${session.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: trimmed }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Send failed (${res.status})`);
      }
      // Replace the optimistic entry with the server row
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? (json.message as MentorMessage) : m))
      );
    } catch (err) {
      // Drop optimistic, surface error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(trimmed);
      setError(err instanceof Error ? err.message : 'Send failed.');
    } finally {
      setSending(false);
    }
  }

  async function onDecision(action: 'accept' | 'decline' | 'complete') {
    setDecisionSubmitting(action);
    setError(null);
    try {
      const res = await fetch(`/api/hs/mentor-sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          declinedReason:
            action === 'decline' ? declineReason.trim() || null : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Action failed (${res.status})`);
      }
      setSession(json.session as MentorSessionRequest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setDecisionSubmitting(null);
    }
  }

  const isMentorView = viewerRole === 'mentor';
  const canRespond = isMentorView && session.status === 'pending';
  const canComplete = session.status === 'accepted';

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
              Mentorship session
            </p>
            <h1 className="mt-1 font-display text-2xl text-white">
              {session.requestedTopic}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {isMentorView ? athleteDisplayName : mentorDisplayName} ·{' '}
              {session.requestedFormat === 'video_call'
                ? 'Video call'
                : 'Async messages'}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[session.status]}`}
          >
            {sessionStatusLabel(session.status)}
          </span>
        </div>

        {session.athleteNote && (
          <div className="mt-4 rounded-md border border-white/10 bg-black/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Athlete note
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-white/80">
              {session.athleteNote}
            </p>
          </div>
        )}

        {canRespond && (
          <div className="mt-5 space-y-3 rounded-md border border-amber-400/30 bg-amber-400/5 p-4">
            <p className="text-sm text-amber-100">
              This request is waiting on your response.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Optional reason if you decline (shared with the athlete)"
              rows={2}
              maxLength={2000}
              className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent-primary)]"
              disabled={decisionSubmitting !== null}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => onDecision('accept')}
                disabled={decisionSubmitting !== null}
              >
                {decisionSubmitting === 'accept' ? 'Accepting…' : 'Accept'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onDecision('decline')}
                disabled={decisionSubmitting !== null}
              >
                {decisionSubmitting === 'decline' ? 'Declining…' : 'Decline'}
              </Button>
            </div>
          </div>
        )}

        {canComplete && (
          <div className="mt-5 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onDecision('complete')}
              disabled={decisionSubmitting !== null}
            >
              {decisionSubmitting === 'complete'
                ? 'Marking complete…'
                : 'Mark session complete'}
            </Button>
          </div>
        )}

        {session.status === 'declined' && session.declinedReason && (
          <div className="mt-4 rounded-md border border-rose-400/30 bg-rose-400/5 p-4 text-sm text-rose-100">
            <strong>Decline reason:</strong> {session.declinedReason}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-display text-lg text-white">Messages</h2>
        <div
          ref={listRef}
          className="mt-4 max-h-[480px] space-y-3 overflow-y-auto pr-2"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-white/60">
              No messages yet. Say hi and break the ice.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.senderUserId === viewerUserId;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg border px-3 py-2 text-sm ${
                      mine
                        ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-white'
                        : 'border-white/15 bg-black/40 text-white/85'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.body}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-white/50">
                      {m.senderRole === 'mentor' ? 'Mentor' : 'Athlete'} ·{' '}
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {messagingDisabled ? (
          <p className="mt-4 rounded-md border border-white/10 bg-black/30 p-3 text-sm text-white/60">
            Messaging is closed for this session.
          </p>
        ) : (
          <form onSubmit={onPostMessage} className="mt-4 space-y-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message…"
              rows={3}
              maxLength={5000}
              className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
              disabled={sending}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-white/50">
                {body.length}/5000
              </span>
              <Button
                type="submit"
                variant="primary"
                disabled={sending || body.trim().length === 0}
              >
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </form>
        )}

        {error && (
          <p className="mt-3 rounded-md border border-[var(--color-error,#DA2B57)]/50 bg-[var(--color-error,#DA2B57)]/10 p-3 text-sm text-[var(--color-error,#DA2B57)]">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
