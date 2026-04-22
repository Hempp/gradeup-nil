import { buildMarketingMetadata } from '@/lib/seo';

export const metadata = {
  ...buildMarketingMetadata({
    title: 'Help Center & FAQ',
    description:
      'Find answers to frequently asked questions about GradeUp NIL. Learn about signing up, verification, NIL deals, payments, NCAA compliance, and more.',
    path: '/help',
  }),
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
  robots: { index: true, follow: true },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
