import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | GradeUp NIL',
  description: 'Privacy policy for the GradeUp NIL platform',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>

        <div className="prose prose-invert prose-lg max-w-none">
          <p className="text-[var(--marketing-gray-300)] text-lg mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
            <p className="text-[var(--marketing-gray-400)] mb-4">
              GradeUp NIL collects information you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-[var(--marketing-gray-400)] space-y-2">
              <li>Account information (name, email, password)</li>
              <li>Profile information (school, sport, GPA, social media handles)</li>
              <li>Transaction and payment information</li>
              <li>Communications with us</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
            <p className="text-[var(--marketing-gray-400)] mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-[var(--marketing-gray-400)] space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Connect athletes with brands for NIL opportunities</li>
              <li>Process transactions and send related information</li>
              <li>Send promotional communications (with your consent)</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Data Security</h2>
            <p className="text-[var(--marketing-gray-400)]">
              We implement appropriate technical and organizational measures to protect your personal
              information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
            <p className="text-[var(--marketing-gray-400)]">
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a
                href="mailto:privacy@gradeupnil.com"
                className="text-[var(--marketing-cyan)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marketing-cyan)] rounded-sm"
              >
                privacy@gradeupnil.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
