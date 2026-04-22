import { redirect } from 'next/navigation';

/**
 * /discover was folded into /athletes in April 2026 as part of the
 * Directories nav cleanup. The primary 301 lives in next.config.ts's
 * `async redirects()`; this server-side redirect is a belt-and-suspenders
 * fallback for dev/hot-reload and any stale client-side link prefetch.
 *
 * A `?curated=1` variant was considered here (showing a highlighted subset
 * at the top of /athletes) but deferred — the public athlete data layer
 * doesn't yet expose a curated/featured flag, so adding it would have
 * required a DB/schema change that's out of scope for a nav consolidation.
 */
export default function DiscoverRedirect(): never {
  redirect('/athletes');
}
