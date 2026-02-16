import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brand Deals | GradeUp NIL',
  description: 'Manage your NIL deals with student-athletes. Review active contracts, pending offers, and partnership agreements in one centralized dashboard.',
};

export default function BrandDealsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
