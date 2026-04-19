'use client';

/**
 * MentorSessionRequestForm — athlete-facing.
 *
 * Submits a mentor_session_requests row for the given mentor. Only shown
 * formats the mentor accepts are selectable. On success, navigates the
 * athlete to their mentor-sessions dashboard so they can track the request.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export interface MentorSessionRequestFormProps {
  mentorId: string;
  mentorDisplayName: string;
  acceptsMessageOnly: boolean;
  acceptsVideoCall: boolean;
}

export default function MentorSessionRequestForm({
  mentorId,
  mentorDisplayName,
  acceptsMessageOnly,
  acceptsVideoCall,
}: MentorSessionRequestFormProps) {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState<'message' | 'video_call'>(
    acceptsMessageOnly ? 'message' : 'video_call'
  );
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (topic.trim().length < 1) {
      setError('Give your request a topic.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/hs/mentors/${mentorId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          format,
          athleteNote: note.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Submit failed (${res.status})`);
      }
      const sessionId = json.sessionRequest?.id as string | undefined;
      if (sessionId) {
        router.push(`/hs/alumni/sessions/${sessionId}`);
      } else {
        router.push('/hs/athlete/mentor-sessions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-xl border border-white/10 bg-white/5 p-6"
    >
      <div>
        <h2 className="font-display text-xl text-white">
          Ask {mentorDisplayName} for a session
        </h2>
        <p className="mt-2 text-sm text-white/70">
          Say what you want to learn. Keep it specific — mentors respond faster
          to a clear ask.
        </p>
      </div>

      <label className="block">
        <span className="block text-xs font-semibold uppercase tracking-widest text-white/60">
          What do you want to talk about?
        </span>
        <input
          type="text"
          required
          maxLength={200}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Recruiting during junior year"
          className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
          disabled={submitting}
        />
      </label>

      <fieldset className="block">
        <legend className="block text-xs font-semibold uppercase tracking-widest text-white/60">
          Format
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {acceptsMessageOnly && (
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${format === 'message' ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-white' : 'border-white/15 bg-black/40 text-white/70'}`}
            >
              <input
                type="radio"
                name="format"
                value="message"
                checked={format === 'message'}
                onChange={() => setFormat('message')}
                disabled={submitting}
                className="sr-only"
              />
              Async messages
            </label>
          )}
          {acceptsVideoCall && (
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${format === 'video_call' ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-white' : 'border-white/15 bg-black/40 text-white/70'}`}
            >
              <input
                type="radio"
                name="format"
                value="video_call"
                checked={format === 'video_call'}
                onChange={() => setFormat('video_call')}
                disabled={submitting}
                className="sr-only"
              />
              Video call
            </label>
          )}
        </div>
        {!acceptsMessageOnly && !acceptsVideoCall && (
          <p className="mt-2 text-sm text-white/60">
            This mentor isn&apos;t accepting requests right now.
          </p>
        )}
      </fieldset>

      <label className="block">
        <span className="block text-xs font-semibold uppercase tracking-widest text-white/60">
          Anything else they should know? (optional)
        </span>
        <textarea
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Where you are in the season, what you're most confused about, etc."
          className="mt-2 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]"
          rows={4}
          disabled={submitting}
        />
      </label>

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
          disabled={
            submitting || (!acceptsMessageOnly && !acceptsVideoCall)
          }
        >
          {submitting ? 'Sending…' : 'Send request'}
        </Button>
      </div>
    </form>
  );
}
