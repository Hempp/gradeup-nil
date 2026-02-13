import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleScale = spring({
    frame,
    fps: 30,
    config: { damping: 12, stiffness: 100 },
  });

  const buttonOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const buttonY = interpolate(frame, [30, 50], [30, 0], {
    extrapolateRight: 'clamp',
  });

  // Pulsing glow effect
  const glowIntensity = interpolate(
    Math.sin(frame * 0.1),
    [-1, 1],
    [0.3, 0.6]
  );

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #00f0ff 0%, #adff2f 50%, #ffd700 100%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Background pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${glowIntensity}) 0%, transparent 60%)`,
        }}
      />

      <div
        style={{
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: '#000',
            marginBottom: 24,
            lineHeight: 1.1,
          }}
        >
          Ready to Turn Your
          <br />
          GPA Into Opportunity?
        </div>

        <div
          style={{
            fontSize: 28,
            color: 'rgba(0,0,0,0.7)',
            marginBottom: 48,
          }}
        >
          Join 847+ athletes already earning through GradeUp
        </div>

        <div
          style={{
            display: 'flex',
            gap: 24,
            justifyContent: 'center',
            opacity: buttonOpacity,
            transform: `translateY(${buttonY}px)`,
          }}
        >
          <div
            style={{
              padding: '20px 48px',
              background: '#000',
              borderRadius: 12,
              fontSize: 22,
              fontWeight: 'bold',
              color: '#fff',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            Join as Athlete →
          </div>
          <div
            style={{
              padding: '20px 48px',
              background: 'rgba(255,255,255,0.3)',
              borderRadius: 12,
              fontSize: 22,
              fontWeight: 'bold',
              color: '#000',
              border: '2px solid rgba(0,0,0,0.2)',
            }}
          >
            Partner as Brand
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            marginTop: 48,
            fontSize: 24,
            color: 'rgba(0,0,0,0.6)',
            fontWeight: 600,
          }}
        >
          gradeup.com
        </div>
      </div>
    </AbsoluteFill>
  );
};
