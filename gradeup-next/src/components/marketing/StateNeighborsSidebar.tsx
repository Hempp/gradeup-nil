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
      return 'bg-[var(--accent-success)]/15 text-[var(--accent-success)] border-[var(--accent-success)]/30';
    case 'limited':
      return 'bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] border-[var(--accent-gold)]/30';
    case 'transitioning':
      return 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/30';
    case 'prohibited':
      return 'bg-white/5 text-white/60 border-white/15';
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
      className="bg-black py-16 border-b border-white/10"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-[var(--accent-primary)]">
          Nearby states
        </span>
        <h2 className="font-display mt-4 text-2xl sm:text-3xl font-bold text-white">
          Compare {stateName}&rsquo;s rules to its neighbors
        </h2>
        <p className="mt-2 text-white/60 text-sm max-w-2xl">
          HS-NIL rules vary by state association. If you&rsquo;re a parent,
          coach, or brand operating across a region, it pays to know who
          allows what.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((n) => (
            <li key={n.code}>
              <Link
                href={`/blog/state-nil-rules/${n.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none"
              >
                <div>
                  <div className="text-white font-semibold group-hover:text-[var(--accent-primary)] transition-colors">
                    {n.name}
                  </div>
                  <div className="text-xs text-white/50 mt-0.5">
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
