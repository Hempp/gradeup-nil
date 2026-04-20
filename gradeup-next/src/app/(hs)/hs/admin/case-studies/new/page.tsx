/**
 * /hs/admin/case-studies/new — Create a new case study.
 *
 * Server Component shell; the form is a Client Component.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CaseStudyEditForm } from '@/components/hs/CaseStudyEditForm';

export const metadata: Metadata = {
  title: 'New case study — GradeUp HS admin',
};

export const dynamic = 'force-dynamic';

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

export default async function NewCaseStudyPage() {
  await requireAdminOr404();

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-24">
        <Link
          href="/hs/admin/case-studies"
          className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white"
        >
          ← Case studies
        </Link>
        <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
          New case study
        </h1>
        <p className="mt-2 text-sm text-white/70 mb-10">
          Save once to create the draft. You can then autopopulate metrics from
          a deal id and publish when ready.
        </p>
        <CaseStudyEditForm mode="create" initial={null} />
      </section>
    </main>
  );
}
