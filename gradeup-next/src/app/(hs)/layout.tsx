import { notFound } from 'next/navigation';
import { isFeatureEnabled } from '@/lib/feature-flags';

export default function HSLayout({ children }: { children: React.ReactNode }) {
  if (!isFeatureEnabled('HS_NIL')) {
    notFound();
  }
  return <>{children}</>;
}
