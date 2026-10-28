// One still per scene for both formats -> out/stills/. Run: npm run stills
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 20s Video: scene frames in 30fps beats. Ad15: moments in seconds (frame 0 must already show the full hook).
const FRAMES = { 1: 75, 2: 166, 3: 335, 4: 435, 5: 575 };
const AD15_SECS = { hook0: 0, hook: 1.2, step1: 3.6, step2: 5.5, step3: 7.2, lifestyle: 10.5, end: 14.2 };
await mkdir(path.join(root, 'out/stills'), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), enableCaching: false }); // no webpack cache: this disk is nearly full
for (const id of (process.argv.length > 2 ? process.argv.slice(2) : ['Vertical', 'Square'])) {
	const composition = await selectComposition({ serveUrl, id });
	const moments = id.startsWith('Ad15')
		? Object.entries(AD15_SECS).map(([name, s]) => [name, Math.round(s * composition.fps)])
		: Object.entries(FRAMES).map(([scene, beat]) => [`scene${scene}`, Math.round((beat * composition.fps) / 30)]);
	for (const [name, frame] of moments) {
		const output = path.join(root, `out/stills/${id.toLowerCase()}-${name}-f${frame}.png`);
		await renderStill({ composition, serveUrl, output, frame });
		console.log(output);
	}
}
