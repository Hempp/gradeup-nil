import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import {
  FloatingParticles,
  GradientOrb,
  GlowBorder,
  FilmGrain,
  Vignette,
  TextReveal,
} from '../components/AnimationUtils';

interface FeatureProps {
  icon: string;
  title: string;
  description: string;
  color: string;
  delay: number;
  index: number;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description, color, delay, index }) => {
  const frame = useCurrentFrame();

  const scale = spring({
    frame: frame - delay,
    fps: 30,
    config: { damping: 12, stiffness: 100, mass: 0.8 },
  });

  const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const x = interpolate(frame - delay, [0, 25], [index % 2 === 0 ? -60 : 60, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const iconRotate = interpolate(frame - delay, [0, 30], [-15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glowPulse = interpolate(
    Math.sin((frame - delay) * 0.06 + index),
    [-1, 1],
    [0.4, 0.8]
  );

  return (
    <div
      style={{
        transform: `scale(${Math.max(0, scale)}) translateX(${x}px)`,
        opacity,
      }}
    >
      <GlowBorder colors={[color, '#ffffff30', color]} borderRadius={20} glowSize={2} speed={1.5}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            padding: '28px 36px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            minWidth: 420,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background glow */}
          <div
            style={{
              position: 'absolute',
              left: 30,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
              opacity: glowPulse,
            }}
          />

          {/* Icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`,
              border: `1px solid ${color}40`,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: 36,
              transform: `rotate(${iconRotate}deg)`,
              flexShrink: 0,
              boxShadow: `0 10px 40px ${color}30`,
            }}
          >
            {icon}
          </div>

          {/* Text */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 26,
                color: '#fff',
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 15,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.4,
              }}
            >
              {description}
            </div>
          </div>

          {/* Arrow */}
          <div
            style={{
              fontSize: 24,
              color: color,
              opacity: 0.6,
            }}
          >
            →
          </div>
        </div>
      </GlowBorder>
    </div>
  );
};

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = spring({
    frame,
    fps: 30,
    config: { damping: 12, stiffness: 100 },
  });

  const features = [
    {
      icon: '🎓',
      title: 'GPA-Based Matching',
      description: 'Higher grades unlock premium brand partnerships',
      color: '#adff2f',
    },
    {
      icon: '✓',
      title: 'Verified Profiles',
      description: 'Academic credentials verified by institutions',
      color: '#00f0ff',
    },
    {
      icon: '💳',
      title: 'Direct Payments',
      description: 'Fast, secure payments within 5-7 business days',
      color: '#ffd700',
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'Track earnings, engagement, and growth metrics',
      color: '#ff00ff',
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at 30% 50%, #0a0a0a 0%, #000 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Background orbs */}
      <GradientOrb
        colors={['#00f0ff', '#0088ff']}
        size={700}
        position={{ x: 1700, y: 200 }}
        blur={120}
        pulseSpeed={0.015}
      />
      <GradientOrb
        colors={['#ff00ff', '#8800ff']}
        size={500}
        position={{ x: 100, y: 900 }}
        blur={100}
        pulseSpeed={0.02}
      />

      {/* Particles */}
      <FloatingParticles count={35} color="#00f0ff" minSize={1} maxSize={4} speed={0.5} />

      {/* Content */}
      <div style={{ padding: '80px 120px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${Math.max(0, 30 - titleY * 30)}px)`,
            marginBottom: 60,
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: '#00f0ff',
              textTransform: 'uppercase',
              letterSpacing: 6,
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            Features
          </div>
          <div style={{ fontSize: 52, fontWeight: 800, color: '#fff' }}>
            <TextReveal text="Everything You Need" startFrame={5} staggerDelay={1} type="slide" />
          </div>
          <div
            style={{
              fontSize: 22,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 12,
            }}
          >
            <TextReveal
              text="Built for student-athletes, by people who get it"
              startFrame={25}
              staggerDelay={0.5}
              type="fade"
            />
          </div>
        </div>

        {/* Features Grid - 2x2 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
            flex: 1,
            alignContent: 'center',
          }}
        >
          {features.map((feature, index) => (
            <Feature key={feature.title} {...feature} delay={30 + index * 18} index={index} />
          ))}
        </div>
      </div>

      {/* Film grain and vignette */}
      <FilmGrain opacity={0.02} />
      <Vignette intensity={0.4} />
    </AbsoluteFill>
  );
};
