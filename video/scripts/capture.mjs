// Captures the real Olympia page at 375px (2x) from the local preview server into public/.
// Run: npm run capture   (needs the preview server on :8765 and Google Chrome installed)
import puppeteer from 'puppeteer-core';
import { writeFile, mkdir } from 'node:fs/promises';

const PAGE_URL = 'http://localhost:8765/olympia';
const OUT = new URL('../public/', import.meta.url);
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

// Load lazy images, freeze carousels, then return to the top.
await page.evaluate(async () => {
	for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
	scrollTo(0, 0);
	if (window.jQuery) jQuery('.owl-carousel').trigger('stop.owl.autoplay').trigger('to.owl.carousel', [0, 0]);
});
await page.waitForNetworkIdle({ idleTime: 800, timeout: 30000 }).catch(() => {});
await new Promise(r => setTimeout(r, 1500));

// Fixed header on its own, so the video can keep it pinned while the page scrolls.
const headerH = await page.evaluate(() => Math.ceil(document.querySelector('#primusMobileNav').getBoundingClientRect().height));
await writeFile(new URL('header.png', OUT), await page.screenshot({ clip: { x: 0, y: 0, width: 375, height: headerH } }));

// Hide fixed overlays for the tall page capture.
await page.addStyleTag({ content: '#primusMobileNav{visibility:hidden!important}.share_get.mob-view,.whatsapp-call,.sidebar-chat,#sticky_form{display:none!important}' });

const meta = await page.evaluate(() => {
	const top = s => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return { y: Math.round(b.top + scrollY), x: Math.round(b.left), w: Math.round(b.width), h: Math.round(b.height) }; };
	const cs = getComputedStyle;
	return {
		headerH: Math.ceil(document.querySelector('#primusMobileNav').getBoundingClientRect().height),
		strip: top('.pc-strip'), stripBtn: top('.pc-strip .pc-btn'),
		about: top('#about-us'), services: top('#services'),
		pcVisit: top('#pc-visit'), steps: top('#pc-visit .pc-steps'), card: top('#pc-booking'),
		name: top('#pc-name'), phone: top('#pc-phone'), cont: top('#pc-booking button[type=submit]'),
		amenities: top('#amenities'), gallery: top('#gallery'), location: top('#location'),
		end: top('#master_plans').y,
		brand: {
			plum: cs(document.querySelector('#services .top-title')).color,
			heading: cs(document.querySelector('#services .top-title')).fontFamily,
			body: cs(document.querySelector('#services .sub-lead')).fontFamily,
		},
	};
});
await writeFile(new URL('page.jpg', OUT), await page.screenshot({
	type: 'jpeg', quality: 90, captureBeyondViewport: true,
	clip: { x: 0, y: 0, width: 375, height: meta.end },
}));
// Step 2 of the booking form (pickup area + date), shown by un-hiding it in the DOM only: nothing is typed or submitted.
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const s2 = await page.evaluate(() => {
	const f = document.getElementById('pc-visit-form');
	f.querySelector('[data-pc-step="1"]').hidden = true;
	f.querySelector('[data-pc-step="2"]').hidden = false;
	const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left, y: b.top + scrollY, w: b.width, h: b.height }; };
	return { label: r('label[for="pc-area"]'), area: r('#pc-area'), date: r('#pc-date') };
});
const top = Math.floor(s2.label.y - 16), height = Math.ceil(s2.date.y + s2.date.h + 16 - top);
await writeFile(new URL('step2.png', OUT), await page.screenshot({ clip: { x: 0, y: top, width: 375, height }, captureBeyondViewport: true }));
const rel = b => ({ x: Math.round(b.x), y: Math.round(b.y - top), w: Math.round(b.w), h: Math.round(b.h) });
meta.step2 = { w: 375, h: height, area: rel(s2.area), date: rel(s2.date) };

// The first visible gallery photo, as the original file (a screenshot would include the theme's carousel arrows).
const photoSrc = await page.evaluate(() => [...document.querySelectorAll('#gallery img')].find(i => { const b = i.getBoundingClientRect(); return b.width > 200 && b.left >= 0 && b.left < 375; }).currentSrc);
await writeFile(new URL('meta.json', OUT), JSON.stringify(meta, null, 1));

// Real brand logo: the 216x46 PNG the site's header uses (the JSON-LD SVG URL returns 404). Mod_Security needs browser headers.
const logo = await fetch('https://www.primuslife.in/wp-content/themes/primus/assets/images/primus-logo.png', {
	headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
});
if (logo.ok) await writeFile(new URL('primus-logo.png', OUT), Buffer.from(await logo.arrayBuffer()));
const photo = await fetch(photoSrc, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', Accept: 'image/webp,image/*,*/*;q=0.8' } });
if (!photo.ok) throw new Error(`gallery photo ${photo.status}: ${photoSrc}`);
await writeFile(new URL('gallery.webp', OUT), Buffer.from(await photo.arrayBuffer()));
console.log('captured', meta.end, 'px of page + step 2 crop; logo', logo.status);
await browser.close();
