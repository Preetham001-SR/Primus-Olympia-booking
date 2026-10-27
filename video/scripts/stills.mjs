// One still per scene for both formats -> out/stills/. Run: npm run stills
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Scene frames in 30fps beats; scaled to the composition fps below.
const FRAMES = { 1: 75, 2: 166, 3: 335, 4: 435, 5: 575 };
await mkdir(path.join(root, 'out/stills'), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts') });
for (const id of (process.argv[2] ? [process.argv[2]] : ['Vertical', 'Square'])) {
	const composition = await selectComposition({ serveUrl, id });
	for (const [scene, beat] of Object.entries(FRAMES)) {
		const frame = Math.round((beat * composition.fps) / 30);
		const output = path.join(root, `out/stills/${id.toLowerCase()}-scene${scene}-f${frame}.png`);
		await renderStill({ composition, serveUrl, output, frame });
		console.log(output);
	}
}
