'use client';

/**
 * Interactive brand-wordmark collage for the /brands hero.
 *
 * Honesty contract: these are the KINDS of brands that run NIL deals
 * (same set + framing as the home marquee) — never presented as active
 * partners. Wordmarks are typographic, no trademarked logo art.
 *
 * Motion: each tile drifts on its own slow loop (CSS), the whole field
 * parallaxes toward the pointer by depth, hover pops a tile cobalt.
 * All motion disables under prefers-reduced-motion.
 */

import { useRef, useCallback } from 'react';

const BRANDS: Array<{ name: string; italic?: boolean; size: number; depth: number; x: number; y: number; rotate: number }> = [
  { name: 'Gatorade', size: 30, depth: 3, x: 8, y: 10, rotate: -4 },
  { name: 'State Farm', size: 24, depth: 2, x: 58, y: 6, rotate: 3 },
  { name: 'Red Bull', size: 34, depth: 4, x: 30, y: 24, rotate: -2 },
  { name: 'Chipotle', size: 22, depth: 2, x: 74, y: 30, rotate: 5 },
  { name: 'Celsius', italic: true, size: 26, depth: 3, x: 6, y: 42, rotate: 2 },
  { name: 'AT&T', size: 38, depth: 5, x: 48, y: 44, rotate: -3 },
  { name: 'Chick-fil-A', size: 22, depth: 2, x: 12, y: 64, rotate: -5 },
  { name: 'Beats by Dre', size: 26, depth: 3, x: 56, y: 66, rotate: 2 },
  { name: 'Cricket Wireless', size: 20, depth: 2, x: 28, y: 82, rotate: 3 },
  { name: 'Powerade', size: 24, depth: 3, x: 70, y: 86, rotate: -2 },
];

export function BrandLogoCollage() {
  const fieldRef = useRef<HTMLDivElement>(null);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const field = fieldRef.current;
    if (!field) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = field.getBoundingClientRect();
    // -1..1 from center
    const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const py = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    field.style.setProperty('--px', String(px));
    field.style.setProperty('--py', String(py));
  }, []);

  const onPointerLeave = useCallback(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.setProperty('--px', '0');
    field.style.setProperty('--py', '0');
  }, []);

  return (
    <div
      className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)]"
      role="img"
      aria-label="Collage of the kinds of brands that run NIL deals — beverage, restaurant, telecom, insurance, and apparel names"
    >
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
            className={`brand-collage-tile font-display text-[var(--ink-muted)] ${b.italic ? 'italic' : ''}`}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              fontSize: `${b.size}px`,
              // depth drives parallax strength; delay de-syncs the drift
              ['--depth' as string]: b.depth,
              ['--rot' as string]: `${b.rotate}deg`,
              animationDelay: `${(i % 5) * -3.5}s`,
            }}
          >
            {b.name}
          </span>
        ))}
      </div>
      {/* honest caption chip, mirrors the home marquee framing */}
      <div className="stat-strip absolute left-4 bottom-4 right-4 !bg-[var(--cream-surface)]/95 backdrop-blur-sm text-center">
        The <b>kinds</b> of brands that run NIL deals
      </div>
    </div>
  );
}
