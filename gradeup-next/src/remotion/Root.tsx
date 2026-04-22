import { Composition, registerRoot } from 'remotion';
import { GradeUpDemo } from './GradeUpDemo';
import { BrandStripScene } from './scenes/BrandStripScene';

/**
 * GradeUp NIL Remotion Video Configuration
 *
 * ADDING VOICEOVER:
 * 1. Generate voiceover using ElevenLabs, Play.ht, or record your own
 * 2. Save as: public/audio/voiceover.mp3
 * 3. The video will automatically include the voiceover
 *
 * VOICEOVER SCRIPT (30 seconds):
 * "GradeUp. Where your GPA is worth money.
 *  We're the NIL platform that rewards student-athletes for academic excellence.
 *  Connect with top brands. Unlock better deals based on your grades.
 *  Over 10,000 athletes. 500 verified brands. $2.5 million in deals closed.
 *  Verified academics. Transparent earnings. Real opportunities.
 *  Join GradeUp today. Your education is your greatest asset."
 */

const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Full Demo - 30 seconds, 1080p landscape */}
      <Composition
        id="GradeUpDemo"
        component={GradeUpDemo}
        durationInFrames={900} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          // Uncomment when you add audio files:
          // voiceoverPath: 'audio/voiceover.mp3',
          // backgroundMusicPath: 'audio/background.mp3',
          // backgroundMusicVolume: 0.2,
        }}
      />

      {/* With Voiceover - for rendering with audio */}
      <Composition
        id="GradeUpDemoWithVoiceover"
        component={GradeUpDemo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          voiceoverPath: 'audio/voiceover.mp3',
          backgroundMusicPath: 'audio/background.mp3',
          backgroundMusicVolume: 0.15,
        }}
      />

      {/* Short version for social - 15 seconds vertical */}
      <Composition
        id="GradeUpDemoShort"
        component={GradeUpDemo}
        durationInFrames={450} // 15 seconds at 30fps
        fps={30}
        width={1080}
        height={1920} // Vertical for social
        defaultProps={{
          // voiceoverPath: 'audio/voiceover-short.mp3',
        }}
      />

      {/* Brand-partner marquee — embedded on the homepage via @remotion/player.
          20-second loop at 30 fps; short enough that the continuous scroll
          feels natural but long enough to render to MP4 for social use. */}
      <Composition
        id="BrandStrip"
        component={BrandStripScene}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={200}
        defaultProps={{
          background: '#0a0a0a',
          scrollSpeedPxPerSec: 80,
          gap: 64,
          logoWidth: 140,
          brands: [
            { name: 'Nike', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg', invert: true },
            { name: 'Under Armour', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Under_armour_logo.svg', invert: true },
            { name: 'Adidas', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg', invert: true },
          ],
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
