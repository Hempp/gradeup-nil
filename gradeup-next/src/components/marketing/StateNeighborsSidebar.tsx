/**
 * StateNeighborsSidebar — cross-link block. Lists 3–5 neighboring states
 * with a permission-status badge so readers land on comparable pages.
 * Ships as a full-width section (not a visual sidebar) to keep the
 * per-state page layout simple and SEO-friendly.
 */
import Link from 'next/link';
import type { PermissionStatus } from '@/lib/hs-nil/state-rules';
import { permissionStatusLabel } from '@/lib/hs-nil/state-blog-content';

export interface StateNeighborsSidebarProps {
  stateName: string;
  neighbors: Array<{
    code: string;
    name: string;
    slug: string;
    status: PermissionStatus;
  }>;
}

function badgeTone(status: PermissionStatus) {
  switch (status) {
    case 'permitted':
      return 'bg-[var(--status-verified)]/10 text-[var(--status-verified)] border-[var(--status-verified)]/30';
    case 'limited':
      return 'bg-[var(--status-caution)]/10 text-[var(--status-caution)] border-[var(--status-caution)]/30';
    case 'transitioning':
      return 'bg-[var(--cobalt)]/10 text-[var(--cobalt)] border-[var(--cobalt)]/30';
    case 'prohibited':
      return 'bg-[var(--status-restricted)]/10 text-[var(--status-restricted)] border-[var(--status-restricted)]/30';
  }
}

export function StateNeighborsSidebar({
  stateName,
  neighbors,
}: StateNeighborsSidebarProps) {
  if (neighbors.length === 0) {
    return null;
  }
  // Cap at 5 to keep the cross-link block focused.
  const list = neighbors.slice(0, 5);

  return (
    <section
      aria-label={`States near ${stateName}`}
      className="bg-[var(--cream)] py-16 border-b border-[var(--hairline)]"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <span className="eyebrow inline-block px-3 py-1 rounded-full border border-[var(--hairline)] bg-[var(--cream-surface)]">
          Nearby states
        </span>
        <h2 className="font-display mt-4 text-2xl sm:text-3xl text-[var(--ink)]">
          Compare {stateName}&rsquo;s rules to its neighbors
        </h2>
        <p className="mt-2 text-[var(--ink-muted)] text-sm max-w-2xl">
          HS-NIL rules vary by state association. If you&rsquo;re a parent,
          coach, or brand operating across a region, it pays to know who
          allows what.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((n) => (
            <li key={n.code}>
              <Link
                href={`/blog/state-nil-rules/${n.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--cream-surface)] p-4 hover:border-[var(--cobalt)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cobalt)] focus-visible:outline-none"
              >
                <div>
                  <div className="text-[var(--ink)] font-semibold group-hover:text-[var(--cobalt)] transition-colors">
                    {n.name}
                  </div>
                  <div className="text-xs text-[var(--ink-meta)] mt-0.5">
                    See {n.name} HS NIL rules
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap ${badgeTone(n.status)}`}
                >
                  {permissionStatusLabel(n.status)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
