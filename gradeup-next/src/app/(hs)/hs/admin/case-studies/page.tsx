/**
 * /hs/admin/case-studies — Admin list page.
 *
 * Server Component. Shows published + draft case studies side by side.
 * Gated to profiles.role === 'admin' (404 on mismatch).
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listAllCaseStudiesAdmin } from '@/lib/hs-nil/case-studies';

export const metadata: Metadata = {
  title: 'Case studies — GradeUp HS admin',
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

export default async function AdminCaseStudiesPage() {
  await requireAdminOr404();
  const studies = await listAllCaseStudiesAdmin();
  const drafts = studies.filter((s) => !s.published);
  const published = studies.filter((s) => s.published);

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/hs/admin"
              className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white"
            >
              ← Back to admin
            </Link>
            <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
              Case studies
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Author, publish, and tune the public portfolio at /business/case-studies.
            </p>
          </div>
          <Link
            href="/hs/admin/case-studies/new"
            className="btn-marketing-primary px-5 py-2.5 rounded-lg font-semibold"
          >
            New case study
          </Link>
        </div>

        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-3">
            Drafts ({drafts.length})
          </h2>
          {drafts.length === 0 ? (
            <p className="text-sm text-white/50">No drafts in progress.</p>
          ) : (
            <ul className="space-y-3">
              {drafts.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">{s.title}</div>
                    <div className="text-xs text-white/50 mt-1">
                      /{s.slug} · updated{' '}
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Link
                    href={`/hs/admin/case-studies/${s.id}/edit`}
                    className="text-sm text-[var(--accent-primary)] font-semibold"
                  >
                    Edit →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-3">
            Published ({published.length})
          </h2>
          {published.length === 0 ? (
            <p className="text-sm text-white/50">
              No studies live yet. Publish a draft to light up /business/case-studies.
            </p>
          ) : (
            <ul className="space-y-3">
              {published.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {s.title}
                      {s.featuredOrder !== null && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-semibold">
                          featured #{s.featuredOrder}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      /{s.slug} · published{' '}
                      {s.publishedAt
                        ? new Date(s.publishedAt).toLocaleDateString()
                        : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/business/case-studies/${s.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-white/70 hover:text-white font-semibold"
                    >
                      View
                    </Link>
                    <Link
                      href={`/hs/admin/case-studies/${s.id}/edit`}
                      className="text-sm text-[var(--accent-primary)] font-semibold"
                    >
                      Edit →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
