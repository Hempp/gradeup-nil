import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compliance | GradeUp NIL',
  description: 'Monitor NCAA compliance for your athletic program. Track NIL disclosures, review deal compliance, and ensure regulatory adherence.',
};

export default function DirectorComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
