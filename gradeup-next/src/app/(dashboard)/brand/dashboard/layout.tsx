import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brand Dashboard | GradeUp NIL',
  description: 'Access your brand dashboard to manage athlete partnerships, track campaign performance, and discover new NIL opportunities with student-athletes.',
};

export default function BrandDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
