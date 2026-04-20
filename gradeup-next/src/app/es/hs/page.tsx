/**
 * Spanish HS landing — /es/hs.
 *
 * Same layout as the English /hs but with translated copy. Reuses the
 * existing WaitlistForm (the form labels themselves are already bilingual-
 * ready or stay English at form level; a full-form translation is out of
 * scope for v1 of i18n and will be a separate pass).
 */
import type { Metadata } from 'next';
import { WaitlistForm } from '@/components/hs/WaitlistForm';
import { getDictionary } from '@/lib/i18n/get-dictionary';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary('es');
  return {
    title: dict.hsLanding.metadata.title,
    description: dict.hsLanding.metadata.description,
    alternates: {
      canonical: `${BASE_URL}/es/hs`,
      languages: {
        en: `${BASE_URL}/hs`,
        es: `${BASE_URL}/es/hs`,
        'x-default': `${BASE_URL}/hs`,
      },
    },
    openGraph: {
      title: dict.hsLanding.metadata.title,
      description: dict.hsLanding.metadata.description,
      url: `${BASE_URL}/es/hs`,
      locale: 'es_US',
    },
  };
}

export default async function SpanishHSLandingPage() {
  const dict = await getDictionary('es');
  const h = dict.hsLanding;

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          {h.phase}
        </p>
        <h1 className="mt-4 font-display text-5xl leading-tight md:text-7xl">{h.title}</h1>
        <p className="mt-6 max-w-2xl text-lg text-white/70">{h.body}</p>
        <p className="mt-8 text-sm text-white/50">{h.states}</p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Card title={h.verifiedGpaTitle} body={h.verifiedGpaBody} />
          <Card title={h.parentsTitle} body={h.parentsBody} />
          <Card title={h.stateTitle} body={h.stateBody} />
        </div>
      </section>

      <section className="px-6 pb-24">
        <WaitlistForm />
      </section>
    </main>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-3 text-sm text-white/70">{body}</p>
    </div>
  );
}
