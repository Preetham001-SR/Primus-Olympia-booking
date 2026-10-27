import { Composition } from 'remotion';
import { Video } from './Video';

const FPS = 60; // scenes are timed in 30fps beats, so any fps keeps the same timing

export const Root = () => (
	<>
		<Composition id="Vertical" component={Video} durationInFrames={20 * FPS} fps={FPS} width={1080} height={1920} />
		<Composition id="Square" component={Video} durationInFrames={20 * FPS} fps={FPS} width={1080} height={1080} />
	</>
);
