import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover Scholar-Athletes',
  description: 'Browse verified NCAA student-athletes ranked by GPA and athletic performance. Find the perfect brand ambassador for your campaign.',
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
