'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Shows a transient success toast after a successful consent initiation.
 *
 * Reads from the `initiated=1` query param the request page redirects with,
 * auto-dismisses after a few seconds, and strips the param from the URL so a
 * refresh doesn't re-flash the toast.
 */
interface InitiatedToastProps {
  initiated: boolean;
}

export default function InitiatedToast({ initiated }: InitiatedToastProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(initiated);

  useEffect(() => {
    if (!initiated) return;
    // Remove the query param so a refresh doesn't re-show the toast.
    const url = new URL(window.location.href);
    url.searchParams.delete('initiated');
    router.replace(url.pathname + (url.search ? url.search : ''));

    const t = window.setTimeout(() => setVisible(false), 6000);
    return () => window.clearTimeout(t);
  }, [initiated, router]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
    >
      <strong className="font-semibold">Request sent.</strong> We emailed your
      parent a secure signing link. You&rsquo;ll see it move to Active once
      they&rsquo;ve signed.
    </div>
  );
}
