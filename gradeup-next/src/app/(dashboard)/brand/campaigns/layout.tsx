import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campaigns | GradeUp NIL',
  description: 'Create and manage NIL marketing campaigns. Track campaign performance, athlete engagement, and ROI across your brand partnerships.',
};

export default function BrandCampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
