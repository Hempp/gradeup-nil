import type { Metadata } from 'next';
import Link from 'next/link';

// ISR every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Brand Plus Subscription Terms — GradeUp HS-NIL',
  description:
    'Subscription terms for the GradeUp HS-NIL Brand Plus plan. Term, payment, cancellation, service levels, fees, termination, limitation of liability, and governing law.',
  openGraph: {
    title: 'Brand Plus Subscription Terms — GradeUp HS-NIL',
    description:
      'Subscription terms for the GradeUp HS-NIL Brand Plus plan.',
    type: 'article',
  },
  alternates: { canonical: '/subscription-terms' },
};

const LAST_UPDATED = '2026-04-17';

export default function SubscriptionTermsPage() {
  return (
    <article className="min-h-screen pt-24 pb-20 bg-black">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] mb-3">
            Legal · Subscription Agreement
          </p>
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
            Brand Plus Subscription Terms
          </h1>
          <p className="mt-4 text-white/60">
            Last updated: {LAST_UPDATED}. Effective immediately for new
            subscribers; existing subscribers on the effective date shown below.
          </p>
        </header>

        <div className="rounded-xl border border-white/10 bg-[var(--marketing-gray-950)] p-5 mb-10 text-sm text-white/75">
          <p>
            This document complements, and does not replace, our{' '}
            <Link
              href="/terms"
              className="text-[var(--accent-primary)] underline underline-offset-2 hover:text-[var(--accent-primary)]/80"
            >
              Terms of Use
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="text-[var(--accent-primary)] underline underline-offset-2 hover:text-[var(--accent-primary)]/80"
            >
              Privacy Policy
            </Link>
            . If any Brand Plus-specific term here conflicts with the general
            Terms of Use, the Brand Plus-specific term controls for the Brand
            Plus plan only.
          </p>
        </div>

        <div className="prose prose-invert prose-lg max-w-none">
          {/* 1 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              1. Definitions
            </h2>
            <p className="text-white/75">
              In these terms, &ldquo;GradeUp,&rdquo; &ldquo;we,&rdquo;
              &ldquo;our,&rdquo; and &ldquo;us&rdquo; refer to GradeUp NIL
              Technologies, Inc., a Delaware corporation. &ldquo;Subscriber,&rdquo;
              &ldquo;you,&rdquo; and &ldquo;your&rdquo; refer to the brand
              organization that purchases a Brand Plus subscription.
              &ldquo;Service&rdquo; refers to the GradeUp HS-NIL platform,
              including the Brand Plus features described on our pricing page.
              &ldquo;Plan&rdquo; refers to the Brand Plus subscription plan.
              &ldquo;Billing Cycle&rdquo; means the monthly or annual period for
              which you have prepaid. &ldquo;AUP&rdquo; means our Acceptable Use
              Policy, which forms part of our Terms of Use.
            </p>
          </section>

          {/* 2 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              2. Subscription Term
            </h2>
            <p className="text-white/75 mb-3">
              Brand Plus is offered on two billing cycles:
            </p>
            <ul className="list-disc pl-6 text-white/75 space-y-2 mb-3">
              <li>
                <strong className="text-white">Monthly:</strong> A one-month
                Billing Cycle, renewing on the same day of each subsequent
                month.
              </li>
              <li>
                <strong className="text-white">Annual:</strong> A twelve-month
                Billing Cycle, renewing on the same date one year later.
              </li>
            </ul>
            <p className="text-white/75">
              Subscriptions auto-renew at the end of each Billing Cycle for a
              new Billing Cycle of the same length, at the then-current price
              for your Plan, unless you cancel before the renewal date. We will
              notify you by email at least seven (7) days before an annual
              renewal.
            </p>
          </section>

          {/* 3 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              3. Payment and Billing
            </h2>
            <p className="text-white/75 mb-3">
              Subscription fees are charged in advance at the start of each
              Billing Cycle. By subscribing, you authorize us to charge your
              designated payment method for all fees owed under your Plan,
              including applicable taxes. If a charge fails, we may retry it
              and, after a reasonable grace period, suspend or terminate your
              access to Brand Plus features.
            </p>
            <p className="text-white/75 mb-3">
              Current prices are published on our{' '}
              <Link
                href="/pricing"
                className="text-[var(--accent-primary)] underline underline-offset-2"
              >
                pricing page
              </Link>
              . Brand Plus is $149 USD per month or $1,490 USD per year at the
              time of this document&rsquo;s last update. Pricing for renewals may
              change; we will give at least thirty (30) days&rsquo; notice of any
              price increase that takes effect at your next renewal.
            </p>
            <p className="text-white/75">
              Per-deal platform fees (the 5% Brand Plus rate) are separate from
              and in addition to subscription fees. Per-deal fees are
              calculated and settled at the time each deal completes.
            </p>
          </section>

          {/* 4 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              4. Cancellation and Refunds
            </h2>
            <p className="text-white/75 mb-3">
              You may cancel your Brand Plus subscription at any time from your
              account settings. Cancellation takes effect at the end of your
              current Billing Cycle: you retain access to Brand Plus features
              through that date, and no further charges will be made.
            </p>
            <p className="text-white/75 mb-3">
              We do not offer prorated refunds for partial Billing Cycles. If
              you cancel mid-cycle, no refund is issued for the remaining days;
              you simply keep access through cycle end. Annual subscriptions
              are non-refundable once the annual period begins, except as
              required by applicable law or as expressly set out in Section 8
              (Termination for Cause).
            </p>
            <p className="text-white/75">
              If we terminate your subscription for cause under Section 8, we
              may, at our discretion, refund a prorated portion of prepaid
              unused fees. If we terminate for our convenience (such as a
              product sunset), we will refund the unused prepaid portion.
            </p>
          </section>

          {/* 5 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              5. Service Levels
            </h2>
            <p className="text-white/75 mb-3">
              We commit to the following service levels for Brand Plus
              subscribers during the active Billing Cycle:
            </p>
            <ul className="list-disc pl-6 text-white/75 space-y-2 mb-3">
              <li>
                <strong className="text-white">Uptime target:</strong> 99.9%
                monthly availability of the Service, measured by the portion of
                the calendar month during which the brand-facing web
                application is reachable and accepts logged-in requests.
                Scheduled maintenance windows communicated at least 24 hours in
                advance are excluded from the calculation.
              </li>
              <li>
                <strong className="text-white">Support response time:</strong>{' '}
                First human response within one (1) business day for emails
                sent to support@gradeup-nil.com, and within four (4) business
                hours for issues reported through the Brand Plus Slack Connect
                channel during our standard business hours (9am-6pm US Eastern,
                Monday through Friday, excluding US federal holidays).
              </li>
              <li>
                <strong className="text-white">Incident transparency:</strong>{' '}
                Post-incident summaries for any unplanned outage exceeding 30
                minutes, published within five (5) business days.
              </li>
            </ul>
            <p className="text-white/75">
              If we fall below the uptime target in a given month by more than
              one full percentage point (that is, below 98.9%), you may request
              a service credit equal to 10% of that month&rsquo;s subscription
              fee, applied to your next invoice. Service credits are the sole
              remedy for service-level breach.
            </p>
          </section>

          {/* 6 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              6. Fees and Taxes
            </h2>
            <p className="text-white/75 mb-3">
              All fees are stated in US dollars and are exclusive of applicable
              taxes, including sales, use, value-added, GST, and similar
              transactional taxes. You are responsible for any taxes imposed on
              your purchase of the Service, other than taxes on our net income.
              Where we are required by law to collect a tax, we will add the
              tax to your invoice.
            </p>
            <p className="text-white/75">
              If you are exempt from any tax, you must provide valid
              documentation before we can honor the exemption. Until then, we
              will collect applicable taxes.
            </p>
          </section>

          {/* 7 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              7. Acceptable Use
            </h2>
            <p className="text-white/75">
              Your use of the Service must comply with our Acceptable Use
              Policy, which is part of our Terms of Use. In particular, you may
              not use Brand Plus to run deals prohibited by applicable
              state-NIL rules, to contact athletes outside the platform in
              violation of our code of conduct, or in any way that would cause
              a state athletic association or school to question the
              compliance posture of an athlete. We reserve the right to decline
              specific campaigns at our sole discretion.
            </p>
          </section>

          {/* 8 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              8. Termination for Cause
            </h2>
            <p className="text-white/75 mb-3">
              We may suspend or terminate your Brand Plus subscription and
              associated platform access, with or without prior notice, for any
              of the following:
            </p>
            <ul className="list-disc pl-6 text-white/75 space-y-2 mb-3">
              <li>
                <strong className="text-white">Non-payment:</strong> Failure to
                pay any fee when due, after a reasonable grace period and
                notice.
              </li>
              <li>
                <strong className="text-white">Breach of AUP:</strong> Material
                or repeated breach of our Acceptable Use Policy, Terms of Use,
                or these Subscription Terms.
              </li>
              <li>
                <strong className="text-white">Illegal use:</strong> Use of the
                Service in connection with activity that is unlawful under
                applicable federal or state law, including but not limited to
                state-NIL rules that apply to deals with minors.
              </li>
              <li>
                <strong className="text-white">Fraud or misrepresentation:</strong>{' '}
                Impersonating a brand you are not authorized to represent,
                submitting false account information, or engaging in payment
                fraud.
              </li>
            </ul>
            <p className="text-white/75">
              You may terminate your subscription at any time for any reason by
              following the cancellation flow in Section 4. For material
              uncured breach by us, you may terminate early and receive a
              refund of the unused prepaid portion of your subscription.
            </p>
          </section>

          {/* 9 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              9. Disclaimer of Warranties
            </h2>
            <p className="text-white/75">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as
              available.&rdquo; To the maximum extent permitted by applicable
              law, we disclaim all warranties, express or implied, including
              warranties of merchantability, fitness for a particular purpose,
              title, and non-infringement. We do not warrant that the Service
              will be uninterrupted, error-free, or secure from unauthorized
              access beyond industry-standard controls. You acknowledge that
              NIL compliance depends on state-specific rules that change; our
              per-state rules engine reflects our best current understanding
              but is not a substitute for your own legal review where material.
            </p>
          </section>

          {/* 10 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              10. Limitation of Liability
            </h2>
            <p className="text-white/75 mb-3">
              To the maximum extent permitted by applicable law, our aggregate
              liability to you for all claims arising out of or relating to
              your Brand Plus subscription and use of the Service is limited to
              the amount of subscription fees you actually paid to us in the
              twelve (12) months preceding the event giving rise to the claim.
            </p>
            <p className="text-white/75">
              In no event are we liable for indirect, incidental, special,
              consequential, or punitive damages, or for lost profits, lost
              revenue, lost data, or cost of substitute services, even if we
              have been advised of the possibility of such damages. Some
              jurisdictions do not allow these limitations; in those
              jurisdictions, the limitations apply only to the extent
              permitted.
            </p>
          </section>

          {/* 11 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              11. Indemnification
            </h2>
            <p className="text-white/75">
              You agree to defend, indemnify, and hold us harmless from claims
              arising out of your use of the Service in violation of these
              terms or applicable law, including claims arising from campaign
              content you provide or from your representations to athletes.
              We will promptly notify you of any such claim and cooperate
              reasonably in the defense.
            </p>
          </section>

          {/* 12 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              12. Governing Law and Disputes
            </h2>
            <p className="text-white/75 mb-3">
              These Subscription Terms are governed by the laws of the State
              of Delaware, without regard to its conflict-of-laws principles.
              The exclusive jurisdiction for any dispute arising out of or
              related to these terms is the state or federal courts located in
              New Castle County, Delaware, and each party consents to personal
              jurisdiction in those courts.
            </p>
            <p className="text-white/75">
              Before filing a formal dispute, the parties agree to attempt a
              good-faith resolution by written notice describing the dispute,
              followed by at least thirty (30) days of informal negotiation. If
              unresolved, either party may proceed to court.
            </p>
          </section>

          {/* 13 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              13. Changes to These Terms
            </h2>
            <p className="text-white/75">
              We may update these Subscription Terms from time to time. When we
              make a material change, we will update the &ldquo;Last
              updated&rdquo; date above and, where legally required or for
              material changes, notify you by email at least thirty (30) days
              before the change takes effect. Your continued use of Brand Plus
              after the effective date constitutes acceptance of the updated
              terms.
            </p>
          </section>

          {/* 14 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              14. Contact
            </h2>
            <p className="text-white/75">
              Questions about these terms or your subscription? Email{' '}
              <a
                href="mailto:support@gradeup-nil.com"
                className="text-[var(--accent-primary)] underline underline-offset-2 hover:text-[var(--accent-primary)]/80"
              >
                support@gradeup-nil.com
              </a>
              . For billing-specific issues, include your account email and the
              invoice number in your message.
            </p>
          </section>
        </div>

        <footer className="mt-12 border-t border-white/10 pt-6 text-sm text-white/60">
          <p>
            This page is a plain-English summary of the Brand Plus subscription
            relationship between GradeUp HS-NIL and its Brand Plus subscribers.
            It complements, and does not replace, our{' '}
            <Link
              href="/terms"
              className="text-[var(--accent-primary)] underline underline-offset-2"
            >
              Terms of Use
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="text-[var(--accent-primary)] underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </footer>
      </div>
    </article>
  );
}
