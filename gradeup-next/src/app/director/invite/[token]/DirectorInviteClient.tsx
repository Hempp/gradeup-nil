'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface InvitationData {
  invitedEmail: string;
  invitedName: string | null;
  invitedTitle: string | null;
  athleteName: string;
  schoolName: string;
  expiresAt: string;
}

interface Props {
  token: string;
  invitation: InvitationData;
}

const TITLE_OPTIONS = [
  { value: 'Athletic Director', label: 'Athletic Director' },
  { value: 'Assistant Athletic Director', label: 'Assistant Athletic Director' },
  { value: 'Associate Athletic Director', label: 'Associate Athletic Director' },
  { value: 'Senior Associate Athletic Director', label: 'Senior Associate Athletic Director' },
  { value: 'Director of Athletics', label: 'Director of Athletics' },
  { value: 'Other', label: 'Other' },
];

export function DirectorInviteClient({ token, invitation }: Props) {
  const router = useRouter();

  const [name, setName] = useState(invitation.invitedName ?? '');
  const [title, setTitle] = useState(invitation.invitedTitle ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/director/invitation/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          confirmPassword,
          acceptedName: name.trim() || undefined,
          acceptedTitle: title || undefined,
        }),
      });

      const json = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !json.success) {
        setError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }

      router.push('/login?invited=true');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        GradeUp NIL · Athletic Director Invite
      </p>
      <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
        Create your account
      </h1>
      <p className="mt-3 text-sm text-white/70">
        <strong className="text-white">{invitation.athleteName}</strong> has invited you to
        verify student-athletes at{' '}
        <strong className="text-white">{invitation.schoolName}</strong>.
      </p>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-display text-lg text-white">What you can do</h2>
        <ul className="mt-3 space-y-2 text-sm text-white/70">
          <li>Verify enrolled athletes at {invitation.schoolName}</li>
          <li>Confirm academic standing, sport participation, and transcripts</li>
          <li>Manage your school&apos;s NIL compliance roster</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-5" noValidate>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">
            Email address
          </label>
          <Input
            type="email"
            value={invitation.invitedEmail}
            readOnly
            disabled
            className="opacity-70 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-white/50">
            Your account will be created with this email.
          </p>
        </div>

        <div>
          <label htmlFor="ad-name" className="block text-sm font-medium text-white/80 mb-1.5">
            Your name
          </label>
          <Input
            id="ad-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First Last"
            autoComplete="name"
          />
        </div>

        <div>
          <Select
            label="Your title"
            options={TITLE_OPTIONS}
            value={title}
            onChange={setTitle}
            placeholder="Select a title..."
            clearable
          />
        </div>

        <div>
          <label htmlFor="ad-password" className="block text-sm font-medium text-white/80 mb-1.5">
            Password <span className="text-[var(--color-error)]">*</span>
          </label>
          <Input
            id="ad-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="ad-confirm-password" className="block text-sm font-medium text-white/80 mb-1.5">
            Confirm password <span className="text-[var(--color-error)]">*</span>
          </label>
          <Input
            id="ad-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
            error={confirmPassword.length > 0 && password !== confirmPassword}
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="mt-1 text-sm text-[var(--color-error)]" role="alert">
              Passwords do not match
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-sm text-[var(--color-error)]"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="w-full"
        >
          Accept Invitation &amp; Create Account
        </Button>

        <p className="text-center text-xs text-white/50">
          Already have an account?{' '}
          <a href="/login" className="text-[var(--accent-primary)] underline underline-offset-2">
            Sign in
          </a>
        </p>
      </form>

      <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-5 text-xs text-white/60">
        <p className="font-semibold text-white/80">Questions?</p>
        <p className="mt-2">
          Contact{' '}
          <a
            href="mailto:support@gradeupnil.com"
            className="text-[var(--accent-primary)] underline decoration-white/30 underline-offset-2"
          >
            support@gradeupnil.com
          </a>
        </p>
      </div>
    </section>
  );
}
