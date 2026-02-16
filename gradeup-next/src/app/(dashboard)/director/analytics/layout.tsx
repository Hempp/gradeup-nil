import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics | GradeUp NIL',
  description: 'Analyze your athletic program\'s NIL performance. View aggregate earnings, deal trends, brand partnerships, and athlete success metrics.',
};

export default function DirectorAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
