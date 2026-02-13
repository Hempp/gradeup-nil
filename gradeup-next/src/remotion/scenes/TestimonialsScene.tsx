import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const TestimonialsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const cardOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const cardScale = interpolate(frame, [0, 30], [0.9, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 18, color: '#00f0ff', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>
          Testimonials
        </div>
        <div style={{ fontSize: 48, fontWeight: 'bold', color: '#fff' }}>
          Real Athletes, Real Results
        </div>
      </div>

      <div
        style={{
          maxWidth: 800,
          padding: 48,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.1)',
          opacity: cardOpacity,
          transform: `scale(${cardScale})`,
        }}
      >
        <div style={{ fontSize: 28, color: '#fff', lineHeight: 1.6, marginBottom: 32, fontStyle: 'italic' }}>
          "After verifying my 3.9 GPA on GradeUp, a tutoring company reached out with a $3,500 semester deal. They specifically wanted someone who could represent academic excellence."
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: 'linear-gradient(135deg, #00f0ff, #adff2f)',
            }}
          />
          <div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>Jasmine Taylor</div>
            <div style={{ fontSize: 16, color: '#666' }}>Women's Basketball, Stanford</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#adff2f' }}>$12,400</div>
            <div style={{ fontSize: 14, color: '#666' }}>earned</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
