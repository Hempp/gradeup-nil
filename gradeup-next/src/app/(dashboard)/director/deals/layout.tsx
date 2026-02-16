import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deals | GradeUp NIL',
  description: 'Oversee all NIL deals in your athletic program. Review active agreements, pending contracts, and partnership opportunities for your athletes.',
};

export default function DirectorDealsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
