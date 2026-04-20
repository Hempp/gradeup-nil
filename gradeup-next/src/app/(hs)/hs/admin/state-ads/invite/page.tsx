/**
 * /hs/admin/state-ads/invite — Admin form to send a new state-AD invitation.
 *
 * Admin-gated Server Component that renders the StateAdInvitationForm
 * client component pre-loaded with every state code from STATE_RULES.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StateAdInvitationForm } from '@/components/hs/StateAdInvitationForm';
import { STATE_RULES, type USPSStateCode } from '@/lib/hs-nil/state-rules';

export const metadata: Metadata = {
  title: 'Invite state AD — GradeUp HS ops',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function requireAdminOr404() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (error || !profile || profile.role !== 'admin') notFound();
}

/**
 * Best-effort state display name derived from STATE_RULES. We strip the
 * opening governing-body acronym from the notes block as a readable
 * hint — not authoritative, but better than the bare two-letter code.
 */
function stateLabel(code: USPSStateCode): string {
  const rule = STATE_RULES[code];
  if (!rule) return code;
  const match = rule.notes.match(/^([A-Z]{2,}[A-Za-z ]*)/);
  return match ? match[1].trim() : code;
}

export default async function StateAdsInvitePage() {
  await requireAdminOr404();

  const codes = Object.keys(STATE_RULES) as USPSStateCode[];
  codes.sort();
  const stateOptions = codes.map((code) => ({
    code,
    name: stateLabel(code),
  }));

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-2xl px-6 py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-widest text-white/50"
        >
          <Link href="/hs/admin" className="hover:text-white">
            Ops dashboard
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <Link href="/hs/admin/state-ads" className="hover:text-white">
            State ADs
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">Invite</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Compliance distribution
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Invite a state AD
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Creates a 30-day invitation token and sends the invitee a signup
            link. They can accept anytime within the window; revoke from the
            list page if plans change.
          </p>
        </header>

        <div className="mt-8">
          <StateAdInvitationForm stateOptions={stateOptions} />
        </div>

        <aside className="mt-10 rounded-xl border border-white/10 bg-white/5 p-5 text-xs text-white/60">
          <p className="font-semibold text-white/80">Before sending</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Confirm you&rsquo;re emailing the compliance office, not the recruiting or eligibility desk.</li>
            <li>Use the full governing-body name in the organization field (e.g. &ldquo;CIF — California Interscholastic Federation&rdquo;).</li>
            <li>Tokens are single-use and expire in 30 days. After acceptance, manage the AD from the list page.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
