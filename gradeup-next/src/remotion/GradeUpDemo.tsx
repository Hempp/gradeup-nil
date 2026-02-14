import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  staticFile,
} from 'remotion';
import { IntroScene } from './scenes/IntroScene';
import { StatsScene } from './scenes/StatsScene';
import { FeaturesScene } from './scenes/FeaturesScene';
import { TestimonialsScene } from './scenes/TestimonialsScene';
import { CTAScene } from './scenes/CTAScene';

// Props for the demo video - allows passing voiceover audio path
interface GradeUpDemoProps {
  voiceoverPath?: string;
  backgroundMusicPath?: string;
  backgroundMusicVolume?: number;
}

export const GradeUpDemo: React.FC<GradeUpDemoProps> = ({
  voiceoverPath,
  backgroundMusicPath,
  backgroundMusicVolume = 0.3,
}) => {
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
      {/* Voiceover Audio - Add your voiceover MP3/WAV to public/audio/voiceover.mp3 */}
      {voiceoverPath && (
        <Audio src={staticFile(voiceoverPath)} volume={1} />
      )}

      {/* Background Music - Add ambient music to public/audio/background.mp3 */}
      {backgroundMusicPath && (
        <Audio src={staticFile(backgroundMusicPath)} volume={backgroundMusicVolume} />
      )}

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
