import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | GradeUp NIL',
  description: 'View your athlete dashboard with deal opportunities, earnings overview, and performance metrics. Track your NIL success and academic achievements in one place.',
};

export default function AthletesDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
