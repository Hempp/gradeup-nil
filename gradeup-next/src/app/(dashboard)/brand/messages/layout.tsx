import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages | GradeUp NIL',
  description: 'Communicate directly with student-athletes and their representatives. Manage deal negotiations and partnership discussions securely.',
};

export default function BrandMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
