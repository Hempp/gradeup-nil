import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner Brands | GradeUp NIL',
  description: 'Manage brand relationships for your athletic program. Connect with sponsors, review partnership opportunities, and track brand engagement.',
};

export default function DirectorBrandsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
