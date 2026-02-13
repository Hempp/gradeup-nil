import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';

interface FeatureProps {
  icon: string;
  title: string;
  color: string;
  delay: number;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, color, delay }) => {
  const frame = useCurrentFrame();
  
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const x = interpolate(frame - delay, [0, 20], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '24px 32px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)',
        opacity,
        transform: `translateX(${x}px)`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: `${color}20`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 28,
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 24, color: '#fff', fontWeight: 600 }}>{title}</span>
    </div>
  );
};

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const features = [
    { icon: '🎓', title: 'GPA-Based Matching', color: '#adff2f' },
    { icon: '✓', title: 'Verified Profiles', color: '#00f0ff' },
    { icon: '💰', title: 'Direct Payments', color: '#ffd700' },
    { icon: '📊', title: 'Analytics Dashboard', color: '#ff00ff' },
  ];

  return (
    <AbsoluteFill style={{ background: '#000', padding: 80 }}>
      <div style={{ opacity: titleOpacity, marginBottom: 48 }}>
        <div style={{ fontSize: 18, color: '#00f0ff', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>
          Features
        </div>
        <div style={{ fontSize: 48, fontWeight: 'bold', color: '#fff' }}>
          Everything You Need
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {features.map((feature, index) => (
          <Feature key={feature.title} {...feature} delay={20 + index * 15} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
