import { AbsoluteFill, useCurrentFrame, interpolate, spring, Img, staticFile } from 'remotion';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Logo animation
  const logoScale = spring({
    frame,
    fps: 30,
    config: { damping: 12, stiffness: 100 },
  });

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Tagline animation
  const taglineOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const taglineY = interpolate(frame, [30, 60], [40, 0], {
    extrapolateRight: 'clamp',
  });

  // Gradient orb animations
  const orbScale = interpolate(frame, [0, 180], [0.8, 1.2], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Animated gradient orbs */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,240,255,0.3) 0%, transparent 70%)',
          top: -200,
          left: -200,
          transform: `scale(${orbScale})`,
          filter: 'blur(60px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,0,255,0.2) 0%, transparent 70%)',
          bottom: -300,
          right: -300,
          transform: `scale(${orbScale})`,
          filter: 'blur(80px)',
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 40,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        {/* Logo from public folder */}
        <Img
          src={staticFile('logo.svg')}
          width={160}
          height={160}
          style={{
            filter: 'drop-shadow(0 20px 60px rgba(0,240,255,0.5))',
          }}
        />

        {/* Wordmark */}
        <div style={{ fontSize: 72, fontWeight: 'bold', color: '#fff', letterSpacing: -2 }}>
          GradeUp
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 'bold', color: '#fff', marginBottom: 16 }}>
          Your GPA Is Worth{' '}
          <span
            style={{
              background: 'linear-gradient(90deg, #ffd700, #adff2f)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Money.
          </span>
        </div>
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.6)' }}>
          The NIL platform where grades unlock better deals
        </div>
      </div>
    </AbsoluteFill>
  );
};
