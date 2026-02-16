import { AbsoluteFill, useCurrentFrame, interpolate, spring, Img, staticFile } from 'remotion';
import {
  FloatingParticles,
  GradientOrb,
  TextReveal,
  FilmGrain,
  Vignette,
  PulseRings,
} from '../components/AnimationUtils';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Logo animation with bounce
  const logoScale = spring({
    frame,
    fps: 30,
    config: { damping: 10, stiffness: 80, mass: 1.2 },
  });

  const logoOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const logoRotate = interpolate(frame, [0, 30], [-5, 0], {
    extrapolateRight: 'clamp',
  });

  // Tagline staggered animation
  const taglineOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const taglineY = spring({
    frame: frame - 40,
    fps: 30,
    config: { damping: 12, stiffness: 100 },
  });

  // Subtitle animation
  const subtitleOpacity = interpolate(frame, [70, 90], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Background pulse
  const bgPulse = interpolate(Math.sin(frame * 0.03), [-1, 1], [0.95, 1.05]);

  // Glow intensity
  const glowIntensity = interpolate(Math.sin(frame * 0.05), [-1, 1], [0.4, 0.8]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(ellipse at 50% 50%, #0a0a0a 0%, #000 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Animated gradient orbs */}
      <GradientOrb
        colors={['#00f0ff', '#0066ff', '#00f0ff']}
        size={800}
        position={{ x: -100, y: -100 }}
        blur={120}
        pulseSpeed={0.015}
        rotateSpeed={0.3}
      />
      <GradientOrb
        colors={['#ff00ff', '#ff0066', '#ff00ff']}
        size={900}
        position={{ x: 1920 + 100, y: 1080 + 100 }}
        blur={140}
        pulseSpeed={0.02}
        rotateSpeed={-0.4}
      />
      <GradientOrb
        colors={['#adff2f', '#00ff88', '#adff2f']}
        size={500}
        position={{ x: 1920, y: 0 }}
        blur={100}
        pulseSpeed={0.025}
        rotateSpeed={0.5}
      />

      {/* Floating particles */}
      <FloatingParticles count={60} color="#00f0ff" minSize={2} maxSize={5} speed={0.8} />
      <FloatingParticles count={30} color="#adff2f" minSize={1} maxSize={3} speed={0.5} />

      {/* Center pulse rings behind logo */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '40%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.15,
        }}
      >
        <PulseRings color="#00f0ff" size={600} count={4} speed={0.3} />
      </div>

      {/* Logo container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
          transform: `scale(${logoScale * bgPulse}) rotate(${logoRotate}deg)`,
          opacity: logoOpacity,
        }}
      >
        {/* Logo with glow */}
        <div style={{ position: 'relative' }}>
          {/* Glow layer */}
          <Img
            src={staticFile('logo.svg')}
            width={180}
            height={180}
            style={{
              position: 'absolute',
              filter: `blur(30px) brightness(1.5)`,
              opacity: glowIntensity,
            }}
          />
          {/* Main logo */}
          <Img
            src={staticFile('logo.svg')}
            width={180}
            height={180}
            style={{
              filter: 'drop-shadow(0 0 40px rgba(0,240,255,0.5))',
            }}
          />
        </div>

        {/* Wordmark with gradient */}
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: -3,
            background: 'linear-gradient(135deg, #fff 0%, #00f0ff 50%, #adff2f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 80px rgba(0,240,255,0.3)',
          }}
        >
          GradeUp
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          position: 'absolute',
          bottom: 180,
          opacity: taglineOpacity,
          transform: `translateY(${Math.max(0, 50 - taglineY * 50)}px)`,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
          <TextReveal text="Your GPA Is Worth " startFrame={45} staggerDelay={1.5} type="slide" />
          <span
            style={{
              background: 'linear-gradient(90deg, #ffd700, #adff2f)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            <TextReveal text="Money." startFrame={70} staggerDelay={2} type="scale" />
          </span>
        </div>
        <div
          style={{
            fontSize: 26,
            color: 'rgba(255,255,255,0.5)',
            opacity: subtitleOpacity,
            letterSpacing: 2,
          }}
        >
          The NIL platform where grades unlock better deals
        </div>
      </div>

      {/* Decorative line */}
      <div
        style={{
          position: 'absolute',
          bottom: 140,
          width: interpolate(frame, [90, 120], [0, 300], { extrapolateRight: 'clamp' }),
          height: 2,
          background: 'linear-gradient(90deg, transparent, #00f0ff, transparent)',
        }}
      />

      {/* Film grain and vignette for premium feel */}
      <FilmGrain opacity={0.025} speed={2} />
      <Vignette intensity={0.5} />
    </AbsoluteFill>
  );
};
