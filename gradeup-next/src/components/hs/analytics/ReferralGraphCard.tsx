/**
 * ReferralGraphCard — tabular top-referrers + referred-vs-organic conversion.
 *
 * Full DAG viz is out of scope. Instead we render:
 *   - Headline funnel: clicks → signups → consents → first-deals.
 *   - Referred vs organic signup→consent comparison (bar pair).
 *   - Top 10 referrers table (first-name + last-initial only).
 */

import type { ReferralSummary } from '@/lib/hs-nil/analytics';
import { formatPct } from '@/lib/hs-nil/analytics';

function Bar({
  label,
  rate,
  color,
}: {
  label: string;
  rate: number;
  color: string;
}) {
  const pctWidth = Math.max(2, Math.min(100, rate * 100));
  return (
    <div>
      <p className="mb-1 flex items-baseline justify-between text-xs text-white/60">
        <span>{label}</span>
        <span className="font-mono text-white/80">{formatPct(rate)}</span>
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${pctWidth}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function ReferralGraphCard({
  summary,
}: {
  summary: ReferralSummary;
}) {
  return (
    <div className="space-y-8">
      {/* Headline funnel */}
      <section aria-labelledby="ref-funnel">
        <h3
          id="ref-funnel"
          className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/60"
        >
          Referral funnel (in window)
        </h3>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Clicks', summary.totalReferredClicks],
            ['Signups', summary.totalReferredSignups],
            ['Consents', summary.totalReferredConsents],
            ['First deals', summary.totalReferredFirstDeals],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                {label}
              </dt>
              <dd className="mt-1 font-display text-2xl text-white">
                {value as number}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-white/50">
          Click→Signup: {formatPct(summary.clickToSignupRate)} ·
          Signup→Consent: {formatPct(summary.signupToConsentRate)}
        </p>
      </section>

      {/* Referred vs organic */}
      <section aria-labelledby="ref-vs-organic">
        <h3
          id="ref-vs-organic"
          className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/60"
        >
          Signup → consent: referred vs organic
        </h3>
        <div className="space-y-3">
          <Bar
            label="Referred cohort"
            rate={summary.referredSignupToConsent}
            color="#22d3ee"
          />
          <Bar
            label="Organic cohort"
            rate={summary.organicSignupToConsent}
            color="#a78bfa"
          />
        </div>
      </section>

      {/* Top referrers */}
      <section aria-labelledby="top-referrers">
        <h3
          id="top-referrers"
          className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/60"
        >
          Top referrers
        </h3>
        {summary.topReferrers.length === 0 ? (
          <p className="text-sm text-white/50">
            No attributed referrals in window.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-white/50">
                  <th className="px-3 py-2">Referrer</th>
                  <th className="px-3 py-2 text-right">Signups</th>
                  <th className="px-3 py-2 text-right">Deals closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {summary.topReferrers.map((r) => (
                  <tr key={r.referringUserId}>
                    <td className="px-3 py-2 text-white/90">
                      {r.displayName}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-white/80">
                      {r.signups}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-white/80">
                      {r.conversions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
