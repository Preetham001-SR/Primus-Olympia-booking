import { Composition } from 'remotion';
import { Video } from './Video';
import { Ad15, Ad15Props } from './Ad15';

const FPS = 60; // scenes are timed in 30fps beats (Video) or seconds (Ad15), so any fps keeps the same timing

// 15s Meta test matrix: 3 hooks x price/no-price on vertical, hook 1 x price/no-price on square.
const AD15: { id: string; height: number; props: Ad15Props }[] = [
	...([1, 2, 3] as const).flatMap(hook => [false, true].map(price => ({ id: `Ad15-Vertical-Hook${hook}${price ? '-Price' : ''}`, height: 1920, props: { hook, price } }))),
	...[false, true].map(price => ({ id: `Ad15-Square-Hook1${price ? '-Price' : ''}`, height: 1080, props: { hook: 1 as const, price } })),
];

export const Root = () => (
	<>
		<Composition id="Vertical" component={Video} durationInFrames={20 * FPS} fps={FPS} width={1080} height={1920} />
		<Composition id="Square" component={Video} durationInFrames={20 * FPS} fps={FPS} width={1080} height={1080} />
		{AD15.map(c => (
			<Composition key={c.id} id={c.id} component={Ad15} defaultProps={c.props} durationInFrames={15 * FPS} fps={FPS} width={1080} height={c.height} />
		))}
	</>
);
