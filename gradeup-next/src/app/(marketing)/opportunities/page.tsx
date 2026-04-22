import { redirect } from 'next/navigation';

/**
 * /opportunities was consolidated into the /brands "Open opportunities" tab
 * in April 2026 as part of the Directories nav cleanup. A 301 lives in
 * next.config.ts's `async redirects()`; this server-side redirect is a
 * belt-and-suspenders fallback so dev hot-reload and any stale client-side
 * link prefetch still land the user on the right page.
 */
export default function OpportunitiesRedirect(): never {
  redirect('/brands?tab=opportunities');
}
