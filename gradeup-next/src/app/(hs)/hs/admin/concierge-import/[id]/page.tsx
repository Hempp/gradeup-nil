/**
 * /hs/admin/concierge-import/[id] — Batch detail page.
 *
 * Admin-only. Server-renders the initial preview, then hands off to the
 * client-side ConciergeImportPreviewTable which owns the Apply / Cancel
 * flow and periodic refresh.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { previewImport } from '@/lib/hs-nil/concierge-import';
import { ConciergeImportPreviewTable } from '@/components/hs/ConciergeImportPreviewTable';

export const metadata: Metadata = {
  title: 'Batch detail — Concierge import',
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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConciergeImportBatchPage({ params }: PageProps) {
  await requireAdminOr404();
  const { id } = await params;

  const preview = await previewImport(id);
  if (!preview) notFound();

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/hs/admin/concierge-import"
          className="inline-flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back to all batches
        </Link>

        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Batch · {preview.batch.pilotStateCode}
          </p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            {preview.batch.filename}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {preview.batch.notes ? preview.batch.notes : (
              <span className="text-white/40">No admin notes for this batch.</span>
            )}
          </p>
          <p className="mt-1 text-xs text-white/50">
            Batch ID: <span className="font-mono">{preview.batch.id}</span>
          </p>
        </header>

        <div className="mt-8">
          <ConciergeImportPreviewTable initial={preview} />
        </div>
      </section>
    </main>
  );
}
