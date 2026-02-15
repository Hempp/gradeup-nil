import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center & FAQ | GradeUp NIL',
  description:
    'Find answers to frequently asked questions about GradeUp NIL. Learn about signing up, verification, NIL deals, payments, NCAA compliance, and more.',
  keywords: [
    'GradeUp FAQ',
    'NIL help',
    'NIL platform support',
    'athlete NIL questions',
    'NCAA compliance FAQ',
    'GPA verification',
    'NIL payment help',
    'student athlete NIL',
    'college athlete deals',
    'NIL support',
  ],
  openGraph: {
    title: 'Help Center & FAQ | GradeUp NIL',
    description:
      'Find answers to frequently asked questions about GradeUp NIL. Learn about signing up, verification, NIL deals, payments, and NCAA compliance.',
    type: 'website',
    url: 'https://gradeupnil.com/help',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help Center & FAQ | GradeUp NIL',
    description:
      'Find answers to frequently asked questions about GradeUp NIL. Learn about NIL deals, payments, and NCAA compliance.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://gradeupnil.com/help',
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
