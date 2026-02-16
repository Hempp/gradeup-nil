import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Profile | GradeUp NIL',
  description: 'Manage your athlete profile showcasing your academic achievements, athletic stats, and NIL portfolio. Build your personal brand for sponsors.',
};

export default function AthletesProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
