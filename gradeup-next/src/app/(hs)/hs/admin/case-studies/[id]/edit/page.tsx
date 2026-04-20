/**
 * /hs/admin/case-studies/[id]/edit — Edit a case study.
 *
 * Server Component shell; the form is a Client Component. Admin-gated.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  getCaseStudyByIdAdmin,
} from '@/lib/hs-nil/case-studies';
import { CaseStudyEditForm } from '@/components/hs/CaseStudyEditForm';

export const metadata: Metadata = {
  title: 'Edit case study — GradeUp HS admin',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

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

export default async function EditCaseStudyPage({ params }: PageProps) {
  await requireAdminOr404();
  const { id } = await params;
  const study = await getCaseStudyByIdAdmin(id);
  if (!study) notFound();

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-24">
        <Link
          href="/hs/admin/case-studies"
          className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white"
        >
          ← Case studies
        </Link>
        <div className="mt-3 flex items-start justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl text-white md:text-5xl">
              {study.title || 'Untitled study'}
            </h1>
            <p className="mt-2 text-sm text-white/70">
              /{study.slug} ·{' '}
              {study.published ? (
                <span className="text-[var(--accent-success)] font-semibold">
                  Published
                </span>
              ) : (
                <span className="text-yellow-300 font-semibold">Draft</span>
              )}
            </p>
          </div>
          {study.published && (
            <Link
              href={`/business/case-studies/${study.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--accent-primary)] font-semibold"
            >
              View live →
            </Link>
          )}
        </div>
        <div className="mt-10">
          <CaseStudyEditForm mode="edit" initial={study} />
        </div>
      </section>
    </main>
  );
}
