import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover Athletes | GradeUp NIL',
  description: 'Discover and connect with verified student-athletes for NIL partnerships. Filter by sport, school, GPA, and social reach to find your perfect brand ambassador.',
};

export default function BrandDiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
