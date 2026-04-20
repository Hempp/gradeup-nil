/**
 * Spanish pricing page — /es/pricing.
 *
 * Same structure as the English pricing page (tiers, always-free, feature
 * table, FAQ, final CTA) with copy read from the Spanish dictionary. The
 * JSON-LD Offer schema stays in English — priced offerings are listed in
 * the default language to avoid duplicating schema rows across locales,
 * and hreflang tags tell Google that the Spanish page is the translation.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export const revalidate = 300;

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://gradeupnil.com';

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary('es');
  return {
    title: dict.pricing.metadata.title,
    description: dict.pricing.metadata.description,
    alternates: {
      canonical: `${BASE_URL}/es/pricing`,
      languages: {
        en: `${BASE_URL}/pricing`,
        es: `${BASE_URL}/es/pricing`,
        'x-default': `${BASE_URL}/pricing`,
      },
    },
    openGraph: {
      title: dict.pricing.metadata.title,
      description: dict.pricing.metadata.description,
      url: `${BASE_URL}/es/pricing`,
      locale: 'es_US',
      type: 'website',
    },
  };
}

export default async function SpanishPricingPage() {
  const dict = await getDictionary('es');
  const p = dict.pricing;

  const tiers = [
    {
      id: 'athletes',
      name: p.tiers.athletesName,
      headline: p.tiers.athletesHeadline,
      price: p.tiers.athletesPrice,
      priceDetail: p.tiers.athletesPriceDetail,
      description: p.tiers.athletesDescription,
      ctaLabel: p.tiers.athletesCta,
      ctaHref: '/signup/athlete',
      highlighted: false,
      features: [
        p.tiers.athletesFeature1,
        p.tiers.athletesFeature2,
        p.tiers.athletesFeature3,
        p.tiers.athletesFeature4,
        p.tiers.athletesFeature5,
        p.tiers.athletesFeature6,
      ],
    },
    {
      id: 'brands',
      name: p.tiers.brandsName,
      headline: p.tiers.brandsHeadline,
      price: p.tiers.brandsPrice,
      priceDetail: p.tiers.brandsPriceDetail,
      description: p.tiers.brandsDescription,
      ctaLabel: p.tiers.brandsCta,
      ctaHref: '/signup/brand',
      highlighted: false,
      features: [
        p.tiers.brandsFeature1,
        p.tiers.brandsFeature2,
        p.tiers.brandsFeature3,
        p.tiers.brandsFeature4,
        p.tiers.brandsFeature5,
        p.tiers.brandsFeature6,
      ],
    },
    {
      id: 'brand-plus',
      name: p.tiers.brandPlusName,
      headline: p.tiers.brandPlusHeadline,
      price: p.tiers.brandPlusPrice,
      priceDetail: p.tiers.brandPlusPriceDetail,
      description: p.tiers.brandPlusDescription,
      ctaLabel: p.tiers.brandPlusCta,
      ctaHref: '/signup/brand?plan=plus',
      highlighted: true,
      features: [
        p.tiers.brandPlusFeature1,
        p.tiers.brandPlusFeature2,
        p.tiers.brandPlusFeature3,
        p.tiers.brandPlusFeature4,
        p.tiers.brandPlusFeature5,
        p.tiers.brandPlusFeature6,
      ],
    },
  ];

  const tableRows = [
    { label: 'Para quién es', athletes: 'Atletas-estudiantes de preparatoria (8.º grado a último año)', brands: 'Marcas locales o regionales con acuerdos individuales', brandPlus: 'Marcas con campañas recurrentes' },
    { label: 'Tarifa de registro', athletes: '$0', brands: '$0', brandPlus: '$149/mes o $1,490/año' },
    { label: 'Mínimo mensual', athletes: 'Ninguno', brands: 'Ninguno', brandPlus: 'La suscripción misma' },
    { label: 'Tarifa por acuerdo completado', athletes: 'N/D — comisión, no tarifa', brands: '8 %', brandPlus: '5 %' },
    { label: 'Comisión en acuerdos < $500', athletes: '8 % del acuerdo', brands: 'N/D', brandPlus: 'N/D' },
    { label: 'Comisión en acuerdos ≥ $500', athletes: '6 % del acuerdo', brands: 'N/D', brandPlus: 'N/D' },
    { label: 'Participación del custodio padre', athletes: '92\u201394 % del bruto', brands: 'N/D', brandPlus: 'N/D' },
    { label: 'Verificación de reglas estatales', athletes: 'Sí, incluido', brands: 'Sí, incluido', brandPlus: 'Sí, incluido' },
    { label: 'Arquitectura de consentimiento parental', athletes: 'Sí, incluido', brands: 'Sí, incluido', brandPlus: 'Sí, incluido' },
    { label: 'Resolución de disputas', athletes: 'Sí, incluido', brands: 'Sí, incluido', brandPlus: 'Sí, incluido' },
    { label: 'Pipeline de divulgación de cumplimiento', athletes: 'Sí, incluido', brands: 'Sí, incluido', brandPlus: 'Sí, incluido' },
    { label: 'Campañas activas ilimitadas', athletes: 'N/D', brands: 'No — un acuerdo a la vez', brandPlus: 'Sí' },
    { label: 'Emparejamiento prioritario', athletes: 'N/D', brands: 'Fila estándar', brandPlus: 'Fila prioritaria' },
    { label: 'Caso de éxito con marca', athletes: 'No', brands: 'No', brandPlus: 'Sí, en gradeup-nil.com' },
    { label: 'Soporte dedicado', athletes: 'Solo correo', brands: 'Solo correo', brandPlus: 'Correo + Slack Connect' },
    { label: 'Llamada de incorporación uno a uno', athletes: 'No', brands: 'No', brandPlus: 'Sí' },
  ];

  const faqs = [
    { q: p.faq.q1, a: p.faq.a1 },
    { q: p.faq.q2, a: p.faq.a2 },
    { q: p.faq.q3, a: p.faq.a3 },
    { q: p.faq.q4, a: p.faq.a4 },
    { q: p.faq.q5, a: p.faq.a5 },
    { q: p.faq.q6, a: p.faq.a6 },
    { q: p.faq.q7, a: p.faq.a7 },
    { q: p.faq.q8, a: p.faq.a8 },
  ];

  return (
    <>
      {/* Hero */}
      <section
        aria-label={p.hero.titleAccent}
        className="relative overflow-hidden bg-black pt-32 pb-20 sm:pt-40 sm:pb-24"
      >
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 200, 0, 0.08) 0%, transparent 50%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            {p.hero.badge}
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {p.hero.titlePrefix}{' '}
            <span className="gradient-text-cyan">{p.hero.titleAccent}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">{p.hero.subtitle}</p>
        </div>
      </section>

      {/* Tiers */}
      <section aria-label="Niveles" className="bg-black py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                id={tier.id}
                className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 ${
                  tier.highlighted
                    ? 'border-[var(--accent-primary)]/40 bg-gradient-to-br from-[var(--accent-primary)]/10 via-black to-black shadow-[0_0_40px_-10px_rgba(0,240,255,0.3)]'
                    : 'border-white/10 bg-[var(--marketing-gray-950)]'
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[var(--accent-primary)]/50 bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                    {p.tiers.mostPopular}
                  </span>
                )}
                <div className="mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
                    {tier.name}
                  </h2>
                  <p className="mt-1 text-white/60 text-sm">{tier.headline}</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white sm:text-5xl">{tier.price}</span>
                    {tier.priceDetail && (
                      <span className="text-sm text-white/60">{tier.priceDetail}</span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-white/70">{tier.description}</p>
                </div>
                <ul className="mb-6 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-white/80">
                      <Check
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--accent-success)]"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={tier.ctaHref} className="mt-auto">
                  <Button
                    size="lg"
                    className={`w-full gap-2 ${
                      tier.highlighted ? 'btn-marketing-primary' : 'btn-marketing-outline'
                    }`}
                    aria-label={`${tier.ctaLabel} — ${tier.name}`}
                  >
                    {tier.ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Always free */}
      <section
        aria-label={p.alwaysFree.heading}
        className="bg-[var(--marketing-gray-950)] py-12 sm:py-16 border-y border-white/10"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {p.alwaysFree.heading}
            </h2>
            <p className="mt-2 text-white/60">{p.alwaysFree.body}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: p.alwaysFree.stateAd, detail: p.alwaysFree.stateAdDetail },
              { label: p.alwaysFree.parents, detail: p.alwaysFree.parentsDetail },
              { label: p.alwaysFree.schools, detail: p.alwaysFree.schoolsDetail },
            ].map((row) => (
              <div key={row.label} className="rounded-xl border border-white/10 bg-black p-5">
                <div className="flex items-center gap-2 text-[var(--accent-success)]">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-widest">
                    {p.alwaysFree.alwaysZero}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-white">{row.label}</h3>
                <p className="mt-2 text-sm text-white/70">{row.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature table */}
      <section aria-label={p.table.heading} className="bg-black py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {p.table.heading}
            </h2>
            <p className="mt-2 text-white/60">{p.table.subheading}</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[var(--marketing-gray-950)]">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{p.table.caption}</caption>
              <thead className="bg-white/5">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold text-white sm:px-6">
                    {p.table.featureColumn}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-white sm:px-6">
                    {p.table.athletesColumn}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-white sm:px-6">
                    {p.table.brandsColumn}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-[var(--accent-primary)] sm:px-6">
                    {p.table.brandPlusColumn}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}>
                    <th scope="row" className="px-4 py-3 font-medium text-white/90 sm:px-6">
                      {row.label}
                    </th>
                    <td className="px-4 py-3 text-white/70 sm:px-6">{row.athletes}</td>
                    <td className="px-4 py-3 text-white/70 sm:px-6">{row.brands}</td>
                    <td className="px-4 py-3 text-white/90 sm:px-6">{row.brandPlus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        aria-label={p.faq.heading}
        className="bg-[var(--marketing-gray-950)] py-16 border-y border-white/10"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {p.faq.heading}
            </h2>
          </div>
          <dl className="space-y-6">
            {faqs.map((item) => (
              <div key={item.q} className="rounded-xl border border-white/10 bg-black p-5">
                <dt className="text-base font-semibold text-white">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-white/75">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-label={p.finalCta.heading} className="bg-black py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[var(--accent-primary)]/10 via-black to-[var(--accent-gold)]/10 p-10 text-center">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--accent-primary)]/15 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
                {p.finalCta.heading}
              </h2>
              <p className="mt-4 text-white/70 max-w-2xl mx-auto">{p.finalCta.body}</p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup/brand">
                  <Button size="lg" className="btn-marketing-primary gap-2 w-full sm:w-auto">
                    {p.finalCta.primary}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/signup/athlete">
                  <Button size="lg" className="btn-marketing-outline gap-2 w-full sm:w-auto">
                    {p.finalCta.secondary}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-white/50 leading-relaxed">
            {p.finalCta.disclaimer}
          </p>
        </div>
      </section>
    </>
  );
}
