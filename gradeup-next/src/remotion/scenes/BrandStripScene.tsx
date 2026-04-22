/**
 * BrandStripScene — animated brand-partner marquee rendered via Remotion.
 *
 * Two render contexts:
 *   1. Remotion Studio / `remotion render` — treat as a video composition
 *      and export a looping MP4 of the logo scroll.
 *   2. <Player /> from `@remotion/player` — embedded on the homepage so
 *      visitors see the animation live (no MP4 pipeline needed).
 *
 * Design notes:
 * - The strip scrolls left continuously. The logo list is doubled so the
 *   modulo-based translation produces a seamless loop.
 * - Each logo fades in from translateY(12px) with a stagger at the start
 *   of the video, then participates in the continuous scroll.
 * - Durations assume 30 fps (see Root.tsx registration).
 */

import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface BrandStripBrand {
  name: string;
  logo: string;
  /** Flip colors for white-on-black rendering. */
  invert?: boolean;
}

export interface BrandStripSceneProps {
  // All props are optional so Remotion's <Composition> accepts the component —
  // its LooseComponentType<Record<string, unknown>> shape requires this. Runtime
  // defaults below cover the unset cases.
  brands?: BrandStripBrand[];
  background?: string;
  scrollSpeedPxPerSec?: number;
  gap?: number;
  logoWidth?: number;
}

const DEFAULT_BRANDS: BrandStripBrand[] = [
  { name: 'Nike', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg', invert: true },
  { name: 'Under Armour', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Under_armour_logo.svg', invert: true },
  { name: 'Adidas', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg', invert: true },
];

export const BrandStripScene: React.FC<BrandStripSceneProps> = ({
  brands = DEFAULT_BRANDS,
  background = '#0a0a0a',
  scrollSpeedPxPerSec = 80,
  gap = 64,
  logoWidth = 140,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Estimate the width of ONE pass of the list. Exact width depends on the
  // actual rendered images, but treating each slot as (logoWidth + gap)
  // is close enough for a seamless loop because we double the list.
  const slotWidth = logoWidth + gap;
  const singlePassWidth = slotWidth * brands.length;

  // Scroll offset. Modulo wraps the translation so the doubled list feels
  // infinite.
  const elapsedSec = frame / fps;
  const rawOffset = elapsedSec * scrollSpeedPxPerSec;
  const xOffset = -(rawOffset % singlePassWidth);

  // Doubled for seamless loop.
  const doubled = [...brands, ...brands];

  return (
    <AbsoluteFill
      style={{
        background,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: `${gap}px`,
          transform: `translateX(${xOffset}px)`,
          whiteSpace: 'nowrap',
          willChange: 'transform',
        }}
      >
        {doubled.map((brand, i) => {
          // Fade-in stagger for the first pass only.
          const isFirstPass = i < brands.length;
          const appearStart = isFirstPass ? i * 3 : 0; // 3 frames per logo
          const opacity = isFirstPass
            ? interpolate(frame, [appearStart, appearStart + 12], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            : 1;
          const translateY = isFirstPass
            ? interpolate(frame, [appearStart, appearStart + 14], [12, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            : 0;

          return (
            <div
              key={`${brand.name}-${i}`}
              style={{
                width: logoWidth,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity,
                transform: `translateY(${translateY}px)`,
                flexShrink: 0,
              }}
            >
              <Img
                src={brand.logo}
                alt={`${brand.name} logo`}
                style={{
                  maxWidth: '100%',
                  maxHeight: 56,
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: brand.invert
                    ? 'brightness(0) invert(1) opacity(0.85)'
                    : 'opacity(0.95)',
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default BrandStripScene;
