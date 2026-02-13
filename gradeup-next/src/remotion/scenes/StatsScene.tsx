import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';

interface StatCardProps {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  color: string;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ value, prefix = '', suffix = '', label, color, delay }) => {
  const frame = useCurrentFrame();

  const scale = spring({
    frame: frame - delay,
    fps: 30,
    config: { damping: 12, stiffness: 100 },
  });

  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Counting animation
  const progress = interpolate(frame - delay, [0, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const animatedNumber = Math.floor(value * progress);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 60px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.1)',
        transform: `scale(${Math.max(0, scale)})`,
        opacity,
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 'bold', color, marginBottom: 12 }}>
        {prefix}{animatedNumber.toLocaleString()}{suffix}
      </div>
      <div
        style={{
          fontSize: 20,
          color: 'rgba(255,255,255,0.6)',
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, 30], [-30, 0], {
    extrapolateRight: 'clamp',
  });

  const stats = [
    { value: 127450, prefix: '$', suffix: '+', label: 'Paid to Athletes', color: '#adff2f' },
    { value: 847, label: 'Verified Athletes', color: '#00f0ff' },
    { value: 412, label: 'Deals Completed', color: '#ffd700' },
    { value: 68, suffix: '%', label: 'Conversion Rate', color: '#ff00ff' },
  ];

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: '#000',
      }}
    >
      {/* Section Title */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: '#00f0ff',
            textTransform: 'uppercase',
            letterSpacing: 4,
            marginBottom: 12,
          }}
        >
          Platform Stats
        </div>
        <div style={{ fontSize: 48, fontWeight: 'bold', color: '#fff' }}>
          Real Numbers. Real Results.
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 32,
          marginTop: 60,
        }}
      >
        {stats.map((stat, index) => (
          <StatCard key={stat.label} {...stat} delay={15 + index * 10} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
