import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages | GradeUp NIL',
  description: 'Communicate with brands and sponsors through secure messaging. Manage deal negotiations and partnership discussions.',
};

export default function AthletesMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
