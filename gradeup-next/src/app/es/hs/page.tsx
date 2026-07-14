/**
 * Spanish HS landing — /es/hs.
 *
 * Same layout as the English /hs but with translated copy. Reuses the
 * existing WaitlistForm (the form labels themselves are already bilingual-
 * ready or stay English at form level; a full-form translation is out of
 * scope for v1 of i18n and will be a separate pass).
 */
import type { Metadata } from 'next';
import { ClipboardCheck, Award, Compass } from 'lucide-react';
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

const CARD_ICONS = [ClipboardCheck, Award, Compass];

export default async function SpanishHSLandingPage() {
  const dict = await getDictionary('es');
  const h = dict.hsLanding;

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-16">
        <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-center">
          <div>
            <p className="eyebrow">
              {h.phase}
            </p>
            <h1 className="mt-4 font-display text-4xl leading-tight text-[var(--ink)] md:text-6xl">
              {h.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[var(--ink-muted)]">{h.body}</p>
            <p className="mt-8 text-sm text-[var(--ink-meta)]">{h.states}</p>
          </div>

          {/* Coach's playbook — cobalt duotone editorial image */}
          <div
            className="duotone relative aspect-[4/3] rounded-2xl overflow-hidden border border-[var(--hairline)] shadow-[0_40px_90px_-40px_rgba(22,24,43,0.35)] bg-cover bg-center"
            style={{ backgroundImage: `url(/editorial/photo-playbook.jpg)` }}
            role="img"
            aria-label="Cuaderno de un entrenador con una jugada diagramada junto a un silbato"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Card icon={CARD_ICONS[0]} title={h.verifiedGpaTitle} body={h.verifiedGpaBody} />
          <Card icon={CARD_ICONS[1]} title={h.parentsTitle} body={h.parentsBody} />
          <Card icon={CARD_ICONS[2]} title={h.stateTitle} body={h.stateBody} />
        </div>
      </section>

      <section className="px-6 pb-24">
        <WaitlistForm />
      </section>
    </main>
  );
}

function Card({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ClipboardCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="card-marketing p-6">
      <Icon className="h-6 w-6 mb-4 text-[var(--cobalt)]" aria-hidden="true" />
      <h3 className="font-display text-xl text-[var(--ink)]">{title}</h3>
      <p className="mt-3 text-sm text-[var(--ink-muted)]">{body}</p>
    </div>
  );
}
