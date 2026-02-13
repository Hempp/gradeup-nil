import { Composition, registerRoot } from 'remotion';
import { GradeUpDemo } from './GradeUpDemo';

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GradeUpDemo"
        component={GradeUpDemo}
        durationInFrames={900} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="GradeUpDemoShort"
        component={GradeUpDemo}
        durationInFrames={450} // 15 seconds at 30fps
        fps={30}
        width={1080}
        height={1920} // Vertical for social
      />
    </>
  );
};

registerRoot(RemotionRoot);
