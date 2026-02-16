import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import {
  FloatingParticles,
  GradientOrb,
  GlowBorder,
  AnimatedCounter,
  FilmGrain,
  Vignette,
  Shimmer,
} from '../components/AnimationUtils';

interface StatCardProps {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  color: string;
  delay: number;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  prefix = '',
  suffix = '',
  label,
  color,
  delay,
  icon,
}) => {
  const frame = useCurrentFrame();

  const scale = spring({
    frame: frame - delay,
    fps: 30,
    config: { damping: 10, stiffness: 80, mass: 1.1 },
  });

  const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glowPulse = interpolate(
    Math.sin((frame - delay) * 0.08),
    [-1, 1],
    [0.3, 0.6]
  );

  return (
    <div
      style={{
        transform: `scale(${Math.max(0, scale)})`,
        opacity,
      }}
    >
      <GlowBorder colors={[color, '#fff', color]} borderRadius={24} glowSize={2} speed={2}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 72px',
            background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Icon glow */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              fontSize: 32,
              opacity: 0.3,
            }}
          >
            {icon}
          </div>

          {/* Background glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
              opacity: glowPulse,
            }}
          />

          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color,
              marginBottom: 12,
              textShadow: `0 0 40px ${color}60`,
              position: 'relative',
            }}
          >
            <AnimatedCounter
              value={value}
              prefix={prefix}
              suffix={suffix}
              startFrame={delay + 5}
              duration={50}
            />
          </div>
          <div
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: 3,
              fontWeight: 600,
            }}
          >
            {label}
          </div>

          {/* Shimmer effect */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <Shimmer height={3} speed={1.5} />
          </div>
        </div>
      </GlowBorder>
    </div>
  );
};

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = spring({
    frame,
    fps: 30,
    config: { damping: 12, stiffness: 100 },
  });

  const stats = [
    { value: 127450, prefix: '$', suffix: '+', label: 'Paid to Athletes', color: '#adff2f', icon: '💰' },
    { value: 847, label: 'Verified Athletes', color: '#00f0ff', icon: '🎓' },
    { value: 412, label: 'Deals Completed', color: '#ffd700', icon: '🤝' },
    { value: 68, suffix: '%', label: 'Conversion Rate', color: '#ff00ff', icon: '📈' },
  ];

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(ellipse at 50% 30%, #0a0a0a 0%, #000 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Background orbs */}
      <GradientOrb
        colors={['#adff2f', '#00ff88']}
        size={600}
        position={{ x: -150, y: 540 }}
        blur={100}
        pulseSpeed={0.02}
      />
      <GradientOrb
        colors={['#ffd700', '#ff8800']}
        size={500}
        position={{ x: 2000, y: 300 }}
        blur={90}
        pulseSpeed={0.025}
      />

      {/* Particles */}
      <FloatingParticles count={40} color="#fff" minSize={1} maxSize={3} speed={0.4} />

      {/* Section Title */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          opacity: titleOpacity,
          transform: `translateY(${Math.max(0, 40 - titleY * 40)}px)`,
          textAlign: 'center',
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
          Platform Stats
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: -1,
          }}
        >
          Real Numbers.{' '}
          <span
            style={{
              background: 'linear-gradient(90deg, #adff2f, #ffd700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Real Results.
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 40,
          marginTop: 100,
        }}
      >
        {stats.map((stat, index) => (
          <StatCard key={stat.label} {...stat} delay={20 + index * 12} />
        ))}
      </div>

      {/* Film grain and vignette */}
      <FilmGrain opacity={0.02} />
      <Vignette intensity={0.45} />
    </AbsoluteFill>
  );
};
