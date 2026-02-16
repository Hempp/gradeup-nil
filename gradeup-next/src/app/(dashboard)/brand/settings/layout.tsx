import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | GradeUp NIL',
  description: 'Manage your brand account settings, team members, billing information, and notification preferences on GradeUp NIL.',
};

export default function BrandSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
