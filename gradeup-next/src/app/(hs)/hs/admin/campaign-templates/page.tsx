/**
 * /hs/admin/campaign-templates — Admin list + usage stats.
 *
 * Server Component. 404s on non-admin. Shows all templates (drafts +
 * published) with per-template clone + conversion counts.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getTemplateUsageStats,
  listAllTemplatesAdmin,
} from '@/lib/hs-nil/campaign-templates';

export const metadata: Metadata = {
  title: 'Campaign templates — GradeUp HS admin',
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

function fmtUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default async function AdminCampaignTemplatesPage() {
  await requireAdminOr404();

  const [templates, stats] = await Promise.all([
    listAllTemplatesAdmin(),
    getTemplateUsageStats(),
  ]);
  const statById = new Map(stats.map((s) => [s.templateId, s]));

  const published = templates.filter((t) => t.published);
  const drafts = templates.filter((t) => !t.published);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/hs/admin"
              className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white"
            >
              ← Back to admin
            </Link>
            <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
              Campaign templates
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Pre-built briefs brands clone into their campaign-create form.
              Clones without conversions flag copy that needs work.
            </p>
          </div>
          <Link
            href="/hs/admin/campaign-templates/new"
            className="rounded-lg bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            New template
          </Link>
        </div>

        <section className="mb-12">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">
            Published ({published.length})
          </h2>
          {published.length === 0 ? (
            <p className="text-sm text-white/50">Nothing published yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-widest text-white/50">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Suggested</th>
                    <th className="px-4 py-3">Clones</th>
                    <th className="px-4 py-3">Converted</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {published.map((t) => {
                    const s = statById.get(t.id);
                    return (
                      <tr key={t.id} className="bg-white/[0.02]">
                        <td className="px-4 py-3 font-semibold">
                          {t.title}
                          <div className="mt-1 text-xs font-normal text-white/50">
                            /{t.slug}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/70">{t.category}</td>
                        <td className="px-4 py-3 text-white/70">
                          {fmtUsd(t.suggestedCompensationCents)}{' '}
                          <span className="text-white/40">
                            · {t.suggestedDurationDays}d
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/70">
                          {s?.cloneCount ?? 0}
                        </td>
                        <td className="px-4 py-3 text-white/70">
                          {s?.convertedCount ?? 0}
                          {s && s.cloneCount > 0 && (
                            <span className="ml-2 text-xs text-white/40">
                              ({Math.round(s.conversionRate * 100)}%)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/hs/admin/campaign-templates/${t.id}/edit`}
                            className="text-sm font-semibold text-[var(--accent-primary)]"
                          >
                            Edit →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">
            Drafts / unpublished ({drafts.length})
          </h2>
          {drafts.length === 0 ? (
            <p className="text-sm text-white/50">No unpublished templates.</p>
          ) : (
            <ul className="space-y-3">
              {drafts.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="mt-1 text-xs text-white/50">
                      /{t.slug} · {t.category}
                    </div>
                  </div>
                  <Link
                    href={`/hs/admin/campaign-templates/${t.id}/edit`}
                    className="text-sm font-semibold text-[var(--accent-primary)]"
                  >
                    Edit →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
