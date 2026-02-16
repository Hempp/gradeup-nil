import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Deals | GradeUp NIL',
  description: 'Manage your NIL deals and sponsorship agreements. View active contracts, pending offers, and completed partnerships with brands.',
};

export default function AthletesDealsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
