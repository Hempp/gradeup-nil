/**
 * /hs/admin/campaign-templates/new — Create a new campaign template.
 *
 * Server Component shell; the authoring form is a Client Component.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CampaignTemplateEditForm from '@/components/hs/CampaignTemplateEditForm';

export const metadata: Metadata = {
  title: 'New campaign template — GradeUp HS admin',
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

export default async function NewCampaignTemplatePage() {
  await requireAdminOr404();

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
          New template
        </h1>
        <p className="mb-10 mt-2 text-sm text-white/70">
          Compensation here is the national baseline — the clone UI reminds
          brands in CA / NY / TX to adjust upward by 20-30%.
        </p>
        <CampaignTemplateEditForm mode="create" initial={null} />
      </section>
    </main>
  );
}
