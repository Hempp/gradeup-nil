import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verifications | GradeUp NIL',
  description: 'Review and approve athlete verification requests. Verify enrollment status, academic records, and athletic participation for NIL eligibility.',
};

export default function DirectorVerificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
