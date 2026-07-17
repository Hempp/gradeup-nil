'use client';

/**
 * Cinematic brand-wall for the /brands hero + home For Brands section.
 *
 * A dark media object (extends the DESIGN.md §3 dark-on-cream hero
 * exception — reads as a lit screen, not a UI panel). One cobalt light
 * source. A cursor spotlight lights up the marks you point at; tiles sit
 * at graded depth so the wall reads 3D. Subtraction over noise: the whole
 * field breathes on ONE slow loop instead of every tile jittering.
 *
 * Honesty contract: brand NAMES as wordmarks (not logo art), framed as
 * "the kinds of brands that run NIL deals" — never a partnership claim.
 * All motion disables under prefers-reduced-motion.
 */

import { useRef, useCallback } from 'react';

const BRANDS: Array<{
  name: string;
  italic?: boolean;
  size: number;
  /** 1 (far/dim/small) → 5 (near/bright/parallax-heavy) */
  depth: number;
  x: number;
  y: number;
  rotate: number;
}> = [
  { name: 'Nike', italic: true, size: 40, depth: 5, x: 6, y: 12, rotate: -3 },
  { name: 'Gatorade', size: 22, depth: 3, x: 54, y: 8, rotate: 2 },
  { name: 'Adidas', italic: true, size: 26, depth: 4, x: 80, y: 20, rotate: 3 },
  { name: 'Red Bull', size: 30, depth: 4, x: 28, y: 26, rotate: -2 },
  { name: "McDonald's", size: 20, depth: 2, x: 64, y: 30, rotate: 4 },
  { name: 'State Farm', size: 18, depth: 2, x: 8, y: 34, rotate: 2 },
  { name: 'AT&T', size: 34, depth: 5, x: 44, y: 46, rotate: -3 },
  { name: 'Chipotle', size: 18, depth: 2, x: 82, y: 46, rotate: -3 },
  { name: 'Celsius', italic: true, size: 22, depth: 3, x: 11, y: 52, rotate: 3 },
  { name: 'Chick-fil-A', size: 18, depth: 2, x: 32, y: 62, rotate: -4 },
  { name: 'Beats by Dre', size: 22, depth: 3, x: 62, y: 64, rotate: 2 },
  { name: 'Powerade', size: 20, depth: 3, x: 8, y: 68, rotate: -2 },
  { name: 'Subway', size: 20, depth: 3, x: 78, y: 74, rotate: -3 },
  { name: 'Cricket Wireless', size: 16, depth: 1, x: 40, y: 76, rotate: 3 },
];

export function BrandLogoCollage() {
  const fieldRef = useRef<HTMLDivElement>(null);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const field = fieldRef.current;
    if (!field) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = field.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    field.style.setProperty('--px', String(nx * 2 - 1)); // -1..1 for parallax
    field.style.setProperty('--py', String(ny * 2 - 1));
    field.style.setProperty('--mx', `${nx * 100}%`); // spotlight position
    field.style.setProperty('--my', `${ny * 100}%`);
  }, []);

  const onPointerLeave = useCallback(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.setProperty('--px', '0');
    field.style.setProperty('--py', '0');
    field.style.setProperty('--mx', '50%');
    field.style.setProperty('--my', '38%');
  }, []);

  return (
    <div
      className="brand-wall relative aspect-[4/3] overflow-hidden rounded-[28px] border border-white/10 shadow-[0_40px_90px_-40px_rgba(22,24,43,0.6)]"
      role="img"
      aria-label="Cinematic wall of the kinds of brands that run NIL deals — beverage, restaurant, telecom, insurance, and apparel names"
    >
      {/* ambient cobalt glow + slow light sweep */}
      <div className="brand-wall-glow" aria-hidden="true" />
      <div className="brand-wall-sheen" aria-hidden="true" />

      <div
        ref={fieldRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="brand-collage absolute inset-0"
        aria-hidden="true"
      >
        {BRANDS.map((b, i) => (
          <span
            key={b.name}
            className={`brand-collage-tile font-display ${b.italic ? 'italic' : ''}`}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              fontSize: `${b.size}px`,
              ['--depth' as string]: b.depth,
              ['--rot' as string]: `${b.rotate}deg`,
              // graded base opacity by depth → the wall reads 3D
              ['--tile-alpha' as string]: 0.32 + b.depth * 0.11,
              animationDelay: `${(i % 4) * -2.5}s`,
            }}
          >
            {b.name}
          </span>
        ))}
      </div>

      {/* cursor spotlight — lit cobalt reveal that follows the pointer */}
      <div className="brand-wall-spot" aria-hidden="true" />
      {/* cinematic vignette frames the wall like a lens */}
      <div className="brand-wall-vignette" aria-hidden="true" />

      <div className="brand-wall-caption">
        The <b>kinds</b> of brands that run NIL deals
      </div>
    </div>
  );
}
