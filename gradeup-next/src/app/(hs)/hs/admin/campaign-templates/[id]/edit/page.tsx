/**
 * /hs/admin/campaign-templates/[id]/edit — Edit an existing template.
 *
 * Server Component shell; the authoring form is a Client Component.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CampaignTemplateEditForm from '@/components/hs/CampaignTemplateEditForm';
import { getTemplateByIdAdmin } from '@/lib/hs-nil/campaign-templates';

export const metadata: Metadata = {
  title: 'Edit campaign template — GradeUp HS admin',
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

export default async function EditCampaignTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOr404();
  const { id } = await params;
  const template = await getTemplateByIdAdmin(id);
  if (!template) notFound();

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <Link
          href="/hs/admin/campaign-templates"
          className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white"
        >
          ← Campaign templates
        </Link>
        <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
          {template.title}
        </h1>
        <p className="mb-10 mt-2 text-sm text-white/70">
          /{template.slug} · {template.published ? 'published' : 'unpublished'}
        </p>
        <CampaignTemplateEditForm mode="edit" initial={template} />
      </section>
    </main>
  );
}
