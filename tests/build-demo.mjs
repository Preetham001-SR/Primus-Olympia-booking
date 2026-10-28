// Builds a static, no-backend demo of /olympia into demo/index.html for sharing (e.g. on Vercel).
// Needs the shim server running: php -S localhost:8765 tests/wp-shim-server.php
// Run: node tests/build-demo.mjs
// Demo mode: the booking form gets a fake success reply in the browser and sends nothing,
// the page's original enquiry forms are blocked, analytics tags are removed, and search engines are told not to index it.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'wp-content/mu-plugins/pc-visit');
const css = await readFile(path.join(dir, 'pc-visit.css'), 'utf8');
const js = await readFile(path.join(dir, 'pc-visit.js'), 'utf8');
let html = await (await fetch('http://localhost:8765/olympia')).text();

const swap = (from, to) => {
	if (!from.test(html)) throw new Error(`Pattern not found: ${from}`);
	html = html.replace(from, () => to);
};

const stub = `<script>
(function () {
	var realFetch = window.fetch;
	window.fetch = function (url, init) {
		if (url !== 'demo:') return realFetch.apply(this, arguments);
		var data = { ref: 'PO-DEMO', token: 'demo', band: 'demo' };
		return new Promise(function (ok) { setTimeout(function () { ok(new Response(JSON.stringify({ success: true, data: data }))); }, 400); });
	};
	document.addEventListener('submit', function (e) {
		if (e.target.id === 'pc-visit-form') return;
		e.preventDefault(); e.stopImmediatePropagation();
		alert('Demo page: this form is switched off and nothing was sent.');
	}, true);
})();
</script>`;
const banner = '<div style="position:fixed;left:12px;bottom:84px;z-index:2147483647;max-width:260px;background:#5a1e44;color:#fff;font:600 12px/1.35 system-ui,sans-serif;padding:6px 10px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none">Demo: forms are switched off, nothing you enter is sent.</div>';

swap(/<head>/, '<head><meta name="robots" content="noindex, nofollow">');
swap(/<link rel="stylesheet" href="http:\/\/localhost:8765\/pc-visit\/pc-visit\.css">/, `<style>${css}</style>`);
swap(/<script>\s*\(function\(w, d, s, l, i\)[\s\S]*?GTM-K49SNKT'\);\s*<\/script>/, '');
swap(/<script src="https:\/\/www\.googletagmanager\.com\/gtag\/js[^"]*"[^>]*><\/script>/, '');
swap(/<noscript><iframe src="https:\/\/www\.googletagmanager\.com\/ns\.html[\s\S]*?<\/noscript>/, '');
swap(/<script>var pcVisit = [^<]*<\/script><script defer src="http:\/\/localhost:8765\/pc-visit\/pc-visit\.js"><\/script>/,
	`${stub}<script>var pcVisit = ${JSON.stringify({ ajaxUrl: 'demo:', nonce: 'demo', whatsapp: '919845037078', pincodeRe: '^560\\d{3}$' })};</script><script>${js}</script>`);
html = html.replace(/<body[^>]*>/, m => m + banner);
if (/localhost|googletagmanager/.test(html)) throw new Error('Leftover localhost or analytics reference');

await mkdir(path.join(root, 'demo'), { recursive: true });
await writeFile(path.join(root, 'demo/index.html'), html);
console.log(`demo/index.html (${(html.length / 1024).toFixed(0)} KB)`);
