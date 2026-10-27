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
await writeFile(new URL('meta.json', OUT), JSON.stringify(meta, null, 1));

// Real brand logo (SVG from the site's Organization JSON-LD).
const logo = await fetch('https://www.primuslife.in/wp-content/uploads/2025/07/primus-main-logo.svg', { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) Chrome/130' } });
if (logo.ok) await writeFile(new URL('primus-logo.svg', OUT), Buffer.from(await logo.arrayBuffer()));
console.log('captured', meta.end, 'px of page; logo', logo.status);
await browser.close();
