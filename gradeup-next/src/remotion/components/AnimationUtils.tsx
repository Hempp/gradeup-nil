/* eslint-disable react-hooks/purity */
// Remotion video rendering uses intentional randomness for particle effects
import { useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import React, { useMemo } from 'react';

/**
 * Premium Animation Utilities for GradeUp Remotion Videos
 * 10x design quality with advanced motion graphics
 */

// ═══════════════════════════════════════════════════════════════════════════
// FLOATING PARTICLES
// ═══════════════════════════════════════════════════════════════════════════

interface ParticleProps {
  count?: number;
  color?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
}

export const FloatingParticles: React.FC<ParticleProps> = ({
  count = 50,
  color = '#00f0ff',
  minSize = 2,
  maxSize = 6,
  speed = 1,
}) => {
  const frame = useCurrentFrame();

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: minSize + Math.random() * (maxSize - minSize),
      delay: Math.random() * 100,
      duration: 200 + Math.random() * 200,
      opacity: 0.2 + Math.random() * 0.6,
    }));
  }, [count, minSize, maxSize]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p) => {
        const progress = ((frame * speed + p.delay) % p.duration) / p.duration;
        const y = p.y - progress * 120;
        const wobble = Math.sin(frame * 0.05 + p.id) * 10;

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x + wobble * 0.5}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: color,
              opacity: p.opacity * (1 - Math.abs(progress - 0.5) * 2),
              boxShadow: `0 0 ${p.size * 3}px ${color}`,
              filter: 'blur(0.5px)',
            }}
          />
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED GRADIENT ORB
// ═══════════════════════════════════════════════════════════════════════════

interface GradientOrbProps {
  colors: string[];
  size: number;
  position: { x: number; y: number };
  blur?: number;
  pulseSpeed?: number;
  rotateSpeed?: number;
}

export const GradientOrb: React.FC<GradientOrbProps> = ({
  colors,
  size,
  position,
  blur = 80,
  pulseSpeed = 0.02,
  rotateSpeed = 0.5,
}) => {
  const frame = useCurrentFrame();

  const scale = interpolate(Math.sin(frame * pulseSpeed), [-1, 1], [0.9, 1.1]);
  const rotation = frame * rotateSpeed;

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(from ${rotation}deg, ${colors.join(', ')})`,
        transform: `scale(${scale}) translate(-50%, -50%)`,
        filter: `blur(${blur}px)`,
        opacity: 0.6,
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TEXT REVEAL ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

interface TextRevealProps {
  text: string;
  startFrame?: number;
  style?: React.CSSProperties;
  staggerDelay?: number;
  type?: 'fade' | 'slide' | 'scale' | 'typewriter';
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  startFrame = 0,
  style = {},
  staggerDelay = 2,
  type = 'fade',
}) => {
  const frame = useCurrentFrame();
  const chars = text.split('');

  return (
    <span style={{ display: 'inline-flex', ...style }}>
      {chars.map((char, i) => {
        const charFrame = frame - startFrame - i * staggerDelay;
        let transform = '';
        let opacity = 1;

        switch (type) {
          case 'slide':
            opacity = interpolate(charFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
            const y = interpolate(charFrame, [0, 10], [30, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
            transform = `translateY(${y}px)`;
            break;
          case 'scale':
            opacity = interpolate(charFrame, [0, 8], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
            const scale = interpolate(charFrame, [0, 8], [0.5, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
            transform = `scale(${scale})`;
            break;
          case 'typewriter':
            opacity = charFrame > 0 ? 1 : 0;
            break;
          default:
            opacity = interpolate(charFrame, [0, 10], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
        }

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform,
              whiteSpace: char === ' ' ? 'pre' : 'normal',
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SHIMMER EFFECT
// ═══════════════════════════════════════════════════════════════════════════

interface ShimmerProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  speed?: number;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width = '100%',
  height = 4,
  borderRadius = 2,
  speed = 2,
}) => {
  const frame = useCurrentFrame();
  const position = (frame * speed) % 200 - 100;

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'rgba(255,255,255,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
          transform: `translateX(${position}%)`,
        }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// GLOWING BORDER
// ═══════════════════════════════════════════════════════════════════════════

interface GlowBorderProps {
  children: React.ReactNode;
  colors?: string[];
  borderRadius?: number;
  glowSize?: number;
  speed?: number;
}

export const GlowBorder: React.FC<GlowBorderProps> = ({
  children,
  colors = ['#00f0ff', '#ff00ff', '#adff2f', '#ffd700'],
  borderRadius = 16,
  glowSize = 3,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const rotation = frame * speed;

  return (
    <div style={{ position: 'relative', padding: glowSize }}>
      {/* Animated gradient border */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: borderRadius + glowSize,
          background: `conic-gradient(from ${rotation}deg, ${colors.join(', ')}, ${colors[0]})`,
          filter: `blur(${glowSize}px)`,
          opacity: 0.8,
        }}
      />
      {/* Inner content */}
      <div
        style={{
          position: 'relative',
          borderRadius,
          background: '#0a0a0a',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FILM GRAIN OVERLAY
// ═══════════════════════════════════════════════════════════════════════════

interface FilmGrainProps {
  opacity?: number;
  speed?: number;
}

export const FilmGrain: React.FC<FilmGrainProps> = ({ opacity = 0.03, speed = 1 }) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame * speed) % 100;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' seed='${seed}' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: '150px',
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════════════════════

interface AnimatedCounterProps {
  value: number;
  startFrame?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  startFrame = 0,
  duration = 45,
  prefix = '',
  suffix = '',
  style = {},
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame - startFrame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const currentValue = Math.floor(value * progress);

  return (
    <span style={style}>
      {prefix}
      {currentValue.toLocaleString()}
      {suffix}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PULSE RING
// ═══════════════════════════════════════════════════════════════════════════

interface PulseRingProps {
  color?: string;
  size?: number;
  count?: number;
  speed?: number;
}

export const PulseRings: React.FC<PulseRingProps> = ({
  color = '#00f0ff',
  size = 200,
  count = 3,
  speed = 0.5,
}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {Array.from({ length: count }, (_, i) => {
        const delay = (i / count) * 100;
        const progress = ((frame * speed + delay) % 100) / 100;
        const scale = 0.3 + progress * 0.7;
        const opacity = 1 - progress;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              transform: `scale(${scale})`,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCAN LINES
// ═══════════════════════════════════════════════════════════════════════════

interface ScanLinesProps {
  opacity?: number;
  spacing?: number;
}

export const ScanLines: React.FC<ScanLinesProps> = ({ opacity = 0.05, spacing = 4 }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent ${spacing - 1}px,
          rgba(0,0,0,0.5) ${spacing - 1}px,
          rgba(0,0,0,0.5) ${spacing}px
        )`,
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// VIGNETTE
// ═══════════════════════════════════════════════════════════════════════════

interface VignetteProps {
  intensity?: number;
}

export const Vignette: React.FC<VignetteProps> = ({ intensity = 0.4 }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${intensity}) 100%)`,
      }}
    />
  );
};
