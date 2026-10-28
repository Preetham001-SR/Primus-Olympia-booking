// Renders every Ad15-* composition (the 15s Meta test matrix) to out/ad15/<id>.mp4, bundling once.
// Run: npm run render:15   (optionally pass an id prefix, e.g. npm run render:15 -- Ad15-Square)
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prefix = process.argv[2] || 'Ad15-';
await mkdir(path.join(root, 'out/ad15'), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), enableCaching: false }); // no webpack cache: this disk is nearly full
for (const composition of (await getCompositions(serveUrl)).filter(c => c.id.startsWith(prefix))) {
	const outputLocation = path.join(root, `out/ad15/${composition.id}.mp4`);
	await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation });
	console.log(outputLocation);
}
