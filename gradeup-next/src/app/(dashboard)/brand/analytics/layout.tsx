import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics | GradeUp NIL',
  description: 'Analyze your NIL campaign performance with detailed metrics. Track athlete engagement, ROI, impressions, and partnership success rates.',
};

export default function BrandAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
