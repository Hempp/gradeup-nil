import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | GradeUp NIL',
  description: 'Configure your athletic program settings. Manage team access, compliance preferences, notification settings, and program information.',
};

export default function DirectorSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
