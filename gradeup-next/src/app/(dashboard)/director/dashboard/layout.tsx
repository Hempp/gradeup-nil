import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Director Dashboard | GradeUp NIL',
  description: 'Athletic Director dashboard for managing your program\'s NIL activities. Monitor athlete deals, compliance status, and partnership opportunities.',
};

export default function DirectorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
