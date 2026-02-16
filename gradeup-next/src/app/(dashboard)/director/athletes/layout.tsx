import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Athletes | GradeUp NIL',
  description: 'Manage your program\'s student-athletes. View verification status, NIL activity, academic standing, and athletic performance metrics.',
};

export default function DirectorAthletesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
