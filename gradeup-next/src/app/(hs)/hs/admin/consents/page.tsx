/**
 * /hs/admin/consents — Parental consents expiring within 14 days.
 *
 * Read-only. Renewal itself happens through the athlete/parent consent
 * flow; this page exists so ops can proactively email the households whose
 * coverage is about to lapse so deals don't get frozen mid-flight.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ConsentBulkPanel } from '@/components/hs/ConsentBulkPanel';

export const metadata: Metadata = {
  title: 'Expiring consents — GradeUp HS',
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

interface ConsentRow {
  id: string;
  athlete_user_id: string;
  parent_full_name: string;
  parent_email: string;
  relationship: string;
  signed_at: string;
  expires_at: string;
  signature_method: string;
}

export default async function AdminConsentsPage() {
  await requireAdminOr404();

  const supabase = await createClient();
  let rows: ConsentRow[] = [];
  try {
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from('parental_consents')
      .select(
        'id, athlete_user_id, parent_full_name, parent_email, relationship, signed_at, expires_at, signature_method'
      )
      .is('revoked_at', null)
      .gte('expires_at', now.toISOString())
      .lte('expires_at', in14Days.toISOString())
      .order('expires_at', { ascending: true })
      .limit(100);
    if (error) throw error;
    rows = (data ?? []) as ConsentRow[];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[hs-admin/consents] query failed', err);
  }

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-widest text-white/50"
        >
          <Link href="/hs/admin" className="hover:text-white">
            Ops dashboard
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">Expiring consents</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Compliance · Ops queue
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Consents expiring within 14 days
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Active parental consents whose coverage lapses soon. Sorted by
            soonest first so you can nudge households before their athletes
            get frozen mid-deal.
          </p>
        </header>

        <aside className="mt-6 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 p-5 text-sm text-white/80">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            What to do next
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              Email the parent at the address on file with a re-sign link
              (the existing <code>/hs/consent/request</code> flow).
            </li>
            <li>
              If the parent is unreachable, email the athlete so they can
              nudge the household directly.
            </li>
            <li>
              Use <strong>Send renewal nudge</strong> to fire the canned
              renewal email to the parent on record. This does NOT mutate
              the consent — renewal requires parental intent through
              the existing /hs/consent/request?renew=… flow. Every nudge
              attempt (success and failure) lands in the admin audit log.
            </li>
          </ol>
        </aside>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-white">
            Expiring ({rows.length})
          </h2>
          <div className="mt-4">
            <ConsentBulkPanel rows={rows} />
          </div>
        </section>
      </section>
    </main>
  );
}
