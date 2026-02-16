import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Earnings | GradeUp NIL',
  description: 'Track your NIL earnings and payment history. View detailed breakdowns of income from deals, sponsorships, and brand partnerships.',
};

export default function AthletesEarningsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
