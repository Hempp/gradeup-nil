import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import {
  FloatingParticles,
  GradientOrb,
  GlowBorder,
  FilmGrain,
  Vignette,
  TextReveal,
  AnimatedCounter,
} from '../components/AnimationUtils';

export const TestimonialsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = spring({
    frame,
    fps: 30,
    config: { damping: 12, stiffness: 100 },
  });

  const cardScale = spring({
    frame: frame - 30,
    fps: 30,
    config: { damping: 10, stiffness: 80, mass: 1.2 },
  });

  const cardOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const quoteOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const avatarPulse = interpolate(
    Math.sin(frame * 0.05),
    [-1, 1],
    [0.95, 1.05]
  );

  const statsOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at 50% 50%, #0a0a0a 0%, #000 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background orbs */}
      <GradientOrb
        colors={['#00f0ff', '#0066ff']}
        size={800}
        position={{ x: 200, y: 200 }}
        blur={150}
        pulseSpeed={0.012}
      />
      <GradientOrb
        colors={['#adff2f', '#00ff88']}
        size={600}
        position={{ x: 1600, y: 800 }}
        blur={120}
        pulseSpeed={0.018}
      />

      {/* Particles */}
      <FloatingParticles count={30} color="#adff2f" minSize={1} maxSize={3} speed={0.3} />

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `translateY(${Math.max(0, 30 - titleY * 30)}px)`,
        }}
      >
        <div
          style={{
            fontSize: 16,
            color: '#adff2f',
            textTransform: 'uppercase',
            letterSpacing: 6,
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Success Stories
        </div>
        <div style={{ fontSize: 52, fontWeight: 800, color: '#fff' }}>
          Real Athletes,{' '}
          <span
            style={{
              background: 'linear-gradient(90deg, #00f0ff, #adff2f)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Real Results
          </span>
        </div>
      </div>

      {/* Testimonial Card */}
      <div
        style={{
          transform: `scale(${Math.max(0, cardScale)})`,
          opacity: cardOpacity,
          marginTop: 80,
        }}
      >
        <GlowBorder
          colors={['#00f0ff', '#adff2f', '#ffd700', '#00f0ff']}
          borderRadius={32}
          glowSize={3}
          speed={1}
        >
          <div
            style={{
              maxWidth: 900,
              padding: '56px 64px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            }}
          >
            {/* Quote mark */}
            <div
              style={{
                fontSize: 120,
                color: '#00f0ff',
                opacity: 0.15,
                position: 'absolute',
                top: 20,
                left: 40,
                fontFamily: 'Georgia, serif',
              }}
            >
              "
            </div>

            {/* Quote text */}
            <div
              style={{
                fontSize: 30,
                color: '#fff',
                lineHeight: 1.7,
                marginBottom: 40,
                fontStyle: 'italic',
                opacity: quoteOpacity,
                position: 'relative',
              }}
            >
              <TextReveal
                text="After verifying my 3.9 GPA on GradeUp, a tutoring company reached out with a $3,500 semester deal. They specifically wanted someone who could represent academic excellence."
                startFrame={55}
                staggerDelay={0.3}
                type="fade"
              />
            </div>

            {/* Author info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: statsOpacity,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                {/* Avatar with glow */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      background: 'linear-gradient(135deg, #00f0ff, #adff2f)',
                      transform: `scale(${avatarPulse})`,
                      boxShadow: '0 0 40px rgba(0,240,255,0.4)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 3,
                      borderRadius: 36,
                      background: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                    }}
                  >
                    🏀
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                    Jasmine Taylor
                  </div>
                  <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>
                    Women's Basketball • Stanford University
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      marginTop: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        padding: '4px 12px',
                        borderRadius: 20,
                        background: '#adff2f20',
                        color: '#adff2f',
                        border: '1px solid #adff2f40',
                      }}
                    >
                      3.9 GPA
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        padding: '4px 12px',
                        borderRadius: 20,
                        background: '#00f0ff20',
                        color: '#00f0ff',
                        border: '1px solid #00f0ff40',
                      }}
                    >
                      Verified Athlete
                    </span>
                  </div>
                </div>
              </div>

              {/* Earnings */}
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    background: 'linear-gradient(90deg, #adff2f, #ffd700)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  $<AnimatedCounter value={12400} startFrame={85} duration={40} />
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2 }}>
                  Total Earned
                </div>
              </div>
            </div>
          </div>
        </GlowBorder>
      </div>

      {/* Film grain and vignette */}
      <FilmGrain opacity={0.025} />
      <Vignette intensity={0.5} />
    </AbsoluteFill>
  );
};
