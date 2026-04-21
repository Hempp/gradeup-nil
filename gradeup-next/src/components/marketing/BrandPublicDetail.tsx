import type { PublicBrand } from '@/lib/hs-nil/brand-directory';
import { STATE_RULES } from '@/lib/hs-nil/state-rules';
import type { USPSStateCode } from '@/lib/hs-nil/state-rules';

export function BrandPublicDetail({ brand }: { brand: PublicBrand }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <h2 className="font-display text-lg text-white">
          What they&apos;re looking for
        </h2>
        {brand.dealCategories.length === 0 ? (
          <p className="mt-2 text-sm text-white/60">
            Categories not specified yet.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {brand.dealCategories.map((cat) => (
              <li
                key={cat}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80"
              >
                {cat.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <h2 className="font-display text-lg text-white">Operating in</h2>
        {brand.targetStates.length === 0 ? (
          <p className="mt-2 text-sm text-white/60">
            State list not specified.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {brand.targetStates.map((code) => {
              const rules = STATE_RULES[code as USPSStateCode];
              return (
                <li
                  key={code}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80"
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

      <section className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <h2 className="font-display text-lg text-white">Activity</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-white/40">
              Completed deals
            </dt>
            <dd className="font-display text-2xl text-white">
              {brand.completedDealCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-white/40">
              Active campaigns
            </dt>
            <dd className="font-display text-2xl text-white">
              {brand.activeCampaignCount}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-white/40">
          Counts only. Deal amounts and athlete PII are never shown publicly.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[var(--marketing-gray-800)]/60 p-6">
        <h2 className="font-display text-lg text-white">
          Partner with {brand.companyName}?
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Athletes can see open campaigns matching their state and sport. Brand
          teams can post new deals from their dashboard.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/hs/signup/athlete"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Sign up as athlete
          </a>
          <a
            href="/hs/signup/brand"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-white/15 px-5 py-2 text-sm font-semibold text-white hover:bg-white/5"
          >
            Post a campaign
          </a>
        </div>
      </section>
    </div>
  );
}
