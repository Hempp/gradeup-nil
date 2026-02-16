import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | GradeUp NIL',
  description: 'Manage your account settings, notification preferences, privacy controls, and payment information for your GradeUp NIL athlete account.',
};

export default function AthletesSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
