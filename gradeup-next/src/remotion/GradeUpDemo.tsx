import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';
import { IntroScene } from './scenes/IntroScene';
import { StatsScene } from './scenes/StatsScene';
import { FeaturesScene } from './scenes/FeaturesScene';
import { TestimonialsScene } from './scenes/TestimonialsScene';
import { CTAScene } from './scenes/CTAScene';

export const GradeUpDemo: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();

  // Scene durations (in frames)
  const introDuration = 180; // 6 seconds
  const statsDuration = 150; // 5 seconds
  const featuresDuration = 240; // 8 seconds
  const testimonialsDuration = 180; // 6 seconds
  const ctaDuration = 150; // 5 seconds

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #111111 100%)',
      }}
    >
      {/* Intro - Logo & Tagline */}
      <Sequence from={0} durationInFrames={introDuration}>
        <IntroScene />
      </Sequence>

      {/* Stats - Key Numbers */}
      <Sequence from={introDuration} durationInFrames={statsDuration}>
        <StatsScene />
      </Sequence>

      {/* Features Showcase */}
      <Sequence from={introDuration + statsDuration} durationInFrames={featuresDuration}>
        <FeaturesScene />
      </Sequence>

      {/* Testimonials */}
      <Sequence
        from={introDuration + statsDuration + featuresDuration}
        durationInFrames={testimonialsDuration}
      >
        <TestimonialsScene />
      </Sequence>

      {/* CTA - Call to Action */}
      <Sequence
        from={introDuration + statsDuration + featuresDuration + testimonialsDuration}
        durationInFrames={ctaDuration}
      >
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
