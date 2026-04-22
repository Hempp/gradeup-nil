'use client';

/**
 * BrandStripPlayer — lazy-loaded wrapper around the Remotion Player.
 *
 * Dynamically imported from HomePageClient via `next/dynamic({ ssr: false })`
 * so the Remotion runtime (which ships with @remotion/player) isn't part of
 * the critical marketing bundle.
 *
 * The Player embeds the BrandStripScene composition live — no MP4 rendering
 * required for the homepage use case. Same composition is registered in
 * remotion/Root.tsx so `remotion render BrandStrip out/brand-strip.mp4` still
 * works for social exports.
 */

import { Player } from '@remotion/player';
import { BrandStripScene, type BrandStripBrand } from '@/remotion/scenes/BrandStripScene';

export interface BrandStripPlayerProps {
  brands: BrandStripBrand[];
  /** Background color behind the strip. Defaults to the marketing gray-950. */
  background?: string;
  /** Horizontal scroll speed in pixels per second. */
  scrollSpeedPxPerSec?: number;
  /** Gap between logos in px. */
  gap?: number;
  /** Logo box width in px. */
  logoWidth?: number;
  /** Optional class passed through to the wrapper. */
  className?: string;
}

export default function BrandStripPlayer({
  brands,
  background = '#0a0a0a',
  scrollSpeedPxPerSec = 80,
  gap = 64,
  logoWidth = 140,
  className,
}: BrandStripPlayerProps) {
  return (
    <div className={className} style={{ width: '100%', aspectRatio: '1920 / 200' }}>
      <Player
        component={BrandStripScene}
        inputProps={{
          brands,
          background,
          scrollSpeedPxPerSec,
          gap,
          logoWidth,
        }}
        durationInFrames={600}
        compositionWidth={1920}
        compositionHeight={200}
        fps={30}
        autoPlay
        loop
        controls={false}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
