import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getConsentForSigning } from '@/lib/services/hs-nil/consent';
import { createClient } from '@/lib/supabase/server';
import ConsentSignForm from '@/components/hs/ConsentSignForm';

export const metadata: Metadata = {
  title: 'Sign Parental Consent — GradeUp HS',
  description: 'Review and sign the parental consent required for your athlete to accept NIL deals.',
};

// Consent tokens are minted server-side and time-bounded. Disable any edge
// caching so a revoked or consumed token is never served stale.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ConsentSigningPage({ params }: PageProps) {
  const { token } = await params;
  const result = await getConsentForSigning(token);

  if (!result.valid || !result.scope) {
    notFound();
  }

  const { scope, parentEmail, parentFullName, expiresAt, athleteUserId } = result;

  // Best-effort athlete-name lookup so the parent can visually confirm they
  // are signing for the right child. Falls back to a generic label; never
  // blocks rendering.
  let athleteDisplayName: string | null = null;
  if (athleteUserId) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('athletes')
        .select('first_name, last_name')
        .eq('profile_id', athleteUserId)
        .maybeSingle<{ first_name: string | null; last_name: string | null }>();
      if (data) {
        const joined = [data.first_name, data.last_name]
          .filter(Boolean)
          .join(' ')
          .trim();
        athleteDisplayName = joined || null;
      }
    } catch {
      // Swallow — signing surface never depends on this lookup.
    }
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Parental Consent
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">
            Confirm your consent.
          </h1>
          <p className="mt-4 text-white/70">
            {athleteDisplayName ? (
              <>
                <strong className="text-white">{athleteDisplayName}</strong> has
                asked for your permission to participate in NIL deals on
                GradeUp.{' '}
              </>
            ) : (
              <>
                Your athlete has asked for your permission to participate in NIL
                deals on GradeUp.{' '}
              </>
            )}
            Federal and state law require a parent or legal guardian to consent
            before any deal can be signed. Please review the terms below
            carefully — this is a legal document.
          </p>
          <p className="mt-3 text-xs text-white/50">
            Not the right parent?{' '}
            <a
              href="mailto:support@gradeupnil.com?subject=Consent%20link%20received%20by%20wrong%20person"
              className="underline decoration-white/30 underline-offset-2 hover:text-white/80"
            >
              Tell us
            </a>{' '}
            and we&rsquo;ll cancel this request.
          </p>
        </header>

        <section
          aria-labelledby="scope-heading"
          className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <h2 id="scope-heading" className="font-display text-2xl">
            What you are consenting to
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            {athleteDisplayName && (
              <div>
                <dt className="font-semibold text-white/80">Athlete</dt>
                <dd className="mt-1 text-white/70">{athleteDisplayName}</dd>
              </div>
            )}

            <div>
              <dt className="font-semibold text-white/80">Parent / guardian of record</dt>
              <dd className="mt-1 text-white/70">
                {parentFullName ?? '(to be confirmed below)'} — {parentEmail}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-white/80">Deal categories allowed</dt>
              <dd className="mt-1 flex flex-wrap gap-2 text-white/70">
                {scope.dealCategories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs"
                  >
                    {c}
                  </span>
                ))}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-white/80">Maximum deal amount</dt>
              <dd className="mt-1 text-white/70">
                ${scope.maxDealAmount.toLocaleString()} per deal
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-white/80">How long this consent is valid</dt>
              <dd className="mt-1 text-white/70">
                {scope.durationMonths} months from the date you sign. After that, GradeUp will
                ask you to re-consent.
              </dd>
            </div>

            {expiresAt && (
              <div>
                <dt className="font-semibold text-white/80">This signing link expires</dt>
                <dd className="mt-1 text-white/70">
                  {new Date(expiresAt).toLocaleString()} — if it expires, your athlete can
                  send a fresh invitation.
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-6 rounded-lg border border-white/10 bg-black/30 p-4 text-xs text-white/60">
            <p>
              <strong>What this does not cover:</strong> GradeUp never permits deals that involve
              school logos, uniforms, mascots, or pay-for-play. Banned categories (gambling,
              alcohol, tobacco, cannabis, adult content, weapons) are blocked at the platform
              level — your consent does not override those rules.
            </p>
            <p className="mt-2">
              You can revoke this consent at any time from your parent dashboard. Revocation
              stops all future deals; deals already in motion will be wound down per their
              terms.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Sign</h2>
          <p className="mt-2 text-sm text-white/60">
            By signing below you confirm you are the parent or legal guardian
            named above and that you agree to the scope described. We&rsquo;ll
            email a PDF copy to {parentEmail} for your records.
          </p>
          <div className="mt-6">
            <ConsentSignForm
              token={token}
              parentEmail={parentEmail ?? ''}
              scope={scope}
              defaultParentFullName={parentFullName ?? null}
            />
          </div>
        </section>

        <footer className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-xs text-white/60 md:text-sm">
          <p className="font-semibold text-white/80">
            Questions? You can reach a real person.
          </p>
          <p className="mt-2">
            Email{' '}
            <a
              href="mailto:support@gradeupnil.com"
              className="font-medium text-white underline decoration-white/30 underline-offset-2 hover:text-[var(--accent-primary)]"
            >
              support@gradeupnil.com
            </a>{' '}
            or call{' '}
            <a
              href="tel:+18667234738"
              className="font-medium text-white underline decoration-white/30 underline-offset-2 hover:text-[var(--accent-primary)]"
            >
              1-866-723-4738
            </a>
            . Response within one business day.
          </p>
          <p className="mt-3 text-white/50">
            You can revoke this consent at any time after signing, from the
            parent dashboard. Nothing you sign today is permanent.
          </p>
        </footer>
      </div>
    </main>
  );
}
