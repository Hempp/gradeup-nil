/**
 * /hs/admin/concierge-import/new — Upload form.
 *
 * Admin-only. Renders ConciergeImportUploader. On successful upload
 * the client redirects to the batch detail page — no server-side
 * action is needed beyond the gate.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ConciergeImportUploader } from '@/components/hs/ConciergeImportUploader';

export const metadata: Metadata = {
  title: 'New concierge import — GradeUp HS admin',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function requireAdminOr404(): Promise<void> {
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

export default async function NewConciergeImportPage() {
  await requireAdminOr404();

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/hs/admin/concierge-import"
          className="inline-flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back
        </Link>

        <h1 className="mt-4 font-display text-3xl text-white md:text-4xl">
          New concierge import
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60">
          Upload a CSV of athlete+parent pairs you&rsquo;ve already
          qualified off-platform. You&rsquo;ll review per-row validation
          before any accounts are created.
        </p>
        <p className="mt-3 max-w-2xl text-xs text-white/50">
          Need the schema? Use the{' '}
          <a
            href="/docs/HS-NIL-CONCIERGE-IMPORT-TEMPLATE.csv"
            download
            className="text-[var(--accent-primary)] underline"
          >
            CSV template
          </a>
          . Field-level guidance is in the{' '}
          <a
            href="/docs/HS-NIL-CONCIERGE-IMPORT-GUIDE.md"
            className="text-[var(--accent-primary)] underline"
          >
            one-page guide
          </a>
          .
        </p>

        <div className="mt-8">
          <ConciergeImportUploader />
        </div>
      </section>
    </main>
  );
}
