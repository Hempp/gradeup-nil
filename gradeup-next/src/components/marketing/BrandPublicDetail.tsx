import type { PublicBrand } from '@/lib/hs-nil/brand-directory';
import { STATE_RULES } from '@/lib/hs-nil/state-rules';
import type { USPSStateCode } from '@/lib/hs-nil/state-rules';

export function BrandPublicDetail({ brand }: { brand: PublicBrand }) {
  return (
    <div className="marketing-dark grid gap-6 bg-[var(--cream)] md:grid-cols-2">
      <section className="card-marketing rounded-2xl p-6">
        <h2 className="font-display text-lg text-[var(--ink)]">
          What they&apos;re looking for
        </h2>
        {brand.dealCategories.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Categories not specified yet.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {brand.dealCategories.map((cat) => (
              <li
                key={cat}
                className="rounded-full border border-[var(--hairline)] bg-[var(--cream-section)] px-3 py-1 text-sm text-[var(--ink-muted)]"
              >
                {cat.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-marketing rounded-2xl p-6">
        <h2 className="font-display text-lg text-[var(--ink)]">Operating in</h2>
        {brand.targetStates.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            State list not specified.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {brand.targetStates.map((code) => {
              const rules = STATE_RULES[code as USPSStateCode];
              return (
                <li
                  key={code}
                  className="rounded-full border border-[var(--hairline)] bg-[var(--cream-section)] px-3 py-1 text-sm text-[var(--ink-muted)]"
                  title={
                    rules?.disclosureWindowHours
                      ? `Disclosure window: ${rules.disclosureWindowHours}h to ${rules.disclosureRecipient ?? 'state'}`
                      : undefined
                  }
                >
                  {rules?.state ?? code}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card-marketing rounded-2xl p-6">
        <h2 className="font-display text-lg text-[var(--ink)]">Activity</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="eyebrow">
              Completed deals
            </dt>
            <dd className="font-display text-2xl text-[var(--ink)]">
              {brand.completedDealCount}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">
              Active campaigns
            </dt>
            <dd className="font-display text-2xl text-[var(--ink)]">
              {brand.activeCampaignCount}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-[var(--ink-meta)]">
          Counts only. Deal amounts and athlete PII are never shown publicly.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--cream-section)] p-6">
        <h2 className="font-display text-lg text-[var(--ink)]">
          Partner with {brand.companyName}?
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Athletes can see open campaigns matching their state and sport. Brand
          teams can post new deals from their dashboard.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/signup/athlete"
            className="btn-marketing-primary inline-flex min-h-[44px] items-center justify-center rounded-md px-5 py-2 text-sm font-semibold"
          >
            Sign up as athlete
          </a>
          <a
            href="/signup/brand"
            className="btn-marketing-outline inline-flex min-h-[44px] items-center justify-center rounded-md px-5 py-2 text-sm font-semibold"
          >
            Post a campaign
          </a>
        </div>
      </section>
    </div>
  );
}
