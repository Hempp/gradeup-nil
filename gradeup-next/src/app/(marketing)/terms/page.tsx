import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | GradeUp NIL',
  description: 'Terms of service for the GradeUp NIL platform',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>

        <div className="prose prose-invert prose-lg max-w-none">
          <p className="text-[var(--marketing-gray-300)] text-lg mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Acceptance of Terms</h2>
            <p className="text-[var(--marketing-gray-400)]">
              By accessing or using the GradeUp NIL platform, you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">NCAA Compliance</h2>
            <p className="text-[var(--marketing-gray-400)] mb-4">
              GradeUp NIL is committed to maintaining NCAA compliance. Users agree to:
            </p>
            <ul className="list-disc pl-6 text-[var(--marketing-gray-400)] space-y-2">
              <li>Only participate in NIL activities permitted by NCAA rules</li>
              <li>Not receive compensation for athletic performance or recruitment</li>
              <li>Disclose all NIL activities to their institution as required</li>
              <li>Maintain amateur status in accordance with NCAA regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">User Responsibilities</h2>
            <p className="text-[var(--marketing-gray-400)] mb-4">
              Athletes using our platform agree to:
            </p>
            <ul className="list-disc pl-6 text-[var(--marketing-gray-400)] space-y-2">
              <li>Provide accurate information about their enrollment, sport, and GPA</li>
              <li>Complete all verification processes honestly</li>
              <li>Fulfill obligations for accepted deals</li>
              <li>Report any compliance concerns promptly</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Platform Fees</h2>
            <p className="text-[var(--marketing-gray-400)]">
              GradeUp NIL may charge platform fees for facilitated deals. Fee structures will be
              clearly communicated before any transaction is finalized.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
            <p className="text-[var(--marketing-gray-400)]">
              GradeUp NIL provides a platform for connecting athletes and brands. We are not
              responsible for the outcome of any deals negotiated through our platform or for any
              NCAA compliance issues arising from user actions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
            <p className="text-[var(--marketing-gray-400)]">
              If you have questions about these Terms of Service, please contact us at{' '}
              <a
                href="mailto:legal@gradeupnil.com"
                className="text-[var(--marketing-cyan)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] rounded-sm"
              >
                legal@gradeupnil.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
