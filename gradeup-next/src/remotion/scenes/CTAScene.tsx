import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import {
  FloatingParticles,
  GradientOrb,
  PulseRings,
  TextReveal,
  FilmGrain,
} from '../components/AnimationUtils';

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleScale = spring({
    frame,
    fps: 30,
    config: { damping: 8, stiffness: 60, mass: 1.5 },
  });

  const subtitleOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const buttonOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const buttonY = spring({
    frame: frame - 50,
    fps: 30,
    config: { damping: 12, stiffness: 100 },
  });

  const urlOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Background animation
  const bgRotation = frame * 0.3;
  const bgPulse = interpolate(Math.sin(frame * 0.04), [-1, 1], [0.9, 1.1]);

  // Button hover simulation
  const buttonGlow = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.6, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${bgRotation}deg at 50% 50%, #00f0ff 0deg, #adff2f 120deg, #ffd700 240deg, #00f0ff 360deg)`,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Animated background overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, rgba(255,255,255,${0.3 * bgPulse}) 0%, transparent 50%)`,
        }}
      />

      {/* Mesh gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 100%)',
        }}
      />

      {/* Floating particles (dark for contrast) */}
      <FloatingParticles count={40} color="rgba(0,0,0,0.15)" minSize={3} maxSize={8} speed={0.6} />

      {/* Decorative orbs */}
      <GradientOrb
        colors={['rgba(255,255,255,0.3)', 'transparent']}
        size={400}
        position={{ x: 200, y: 200 }}
        blur={60}
        pulseSpeed={0.03}
      />
      <GradientOrb
        colors={['rgba(255,255,255,0.2)', 'transparent']}
        size={500}
        position={{ x: 1700, y: 800 }}
        blur={80}
        pulseSpeed={0.025}
      />

      {/* Center pulse rings */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.15,
        }}
      >
        <PulseRings color="rgba(0,0,0,0.3)" size={800} count={5} speed={0.4} />
      </div>

      {/* Content */}
      <div
        style={{
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          position: 'relative',
        }}
      >
        {/* Main headline */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: '#000',
            marginBottom: 24,
            lineHeight: 1.05,
            letterSpacing: -2,
            textShadow: '0 4px 30px rgba(0,0,0,0.1)',
          }}
        >
          <TextReveal text="Ready to Turn Your" startFrame={5} staggerDelay={1} type="slide" />
          <br />
          <TextReveal text="GPA Into Opportunity?" startFrame={20} staggerDelay={1} type="slide" />
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(0,0,0,0.6)',
            marginBottom: 56,
            opacity: subtitleOpacity,
            fontWeight: 500,
          }}
        >
          Join 847+ athletes already earning through GradeUp
        </div>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 28,
            justifyContent: 'center',
            opacity: buttonOpacity,
            transform: `translateY(${Math.max(0, 40 - buttonY * 40)}px)`,
          }}
        >
          {/* Primary Button */}
          <div
            style={{
              padding: '24px 56px',
              background: '#000',
              borderRadius: 16,
              fontSize: 24,
              fontWeight: 700,
              color: '#fff',
              boxShadow: `0 20px 60px rgba(0,0,0,${0.3 * buttonGlow}), 0 0 0 4px rgba(255,255,255,0.1)`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              transform: `scale(${0.98 + buttonGlow * 0.02})`,
            }}
          >
            <span>Join as Athlete</span>
            <span style={{ fontSize: 28 }}>→</span>
          </div>

          {/* Secondary Button */}
          <div
            style={{
              padding: '24px 56px',
              background: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              fontSize: 24,
              fontWeight: 700,
              color: '#000',
              border: '2px solid rgba(0,0,0,0.15)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            }}
          >
            Partner as Brand
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            marginTop: 64,
            fontSize: 28,
            color: 'rgba(0,0,0,0.5)',
            fontWeight: 700,
            letterSpacing: 2,
            opacity: urlOpacity,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: '#000',
              opacity: 0.3,
            }}
          />
          gradeup.com
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: '#000',
              opacity: 0.3,
            }}
          />
        </div>
      </div>

      {/* Decorative corners */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          width: 80,
          height: 80,
          borderLeft: '4px solid rgba(0,0,0,0.1)',
          borderTop: '4px solid rgba(0,0,0,0.1)',
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          width: 80,
          height: 80,
          borderRight: '4px solid rgba(0,0,0,0.1)',
          borderBottom: '4px solid rgba(0,0,0,0.1)',
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      />

      {/* Film grain for texture */}
      <FilmGrain opacity={0.015} speed={3} />
    </AbsoluteFill>
  );
};
