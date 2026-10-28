import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Arrow, BODY, C, Car, Gate, HEAD, Handset, Tap, Tick, meta, sp } from './parts';
import { CLIPS } from './clips';
import voJson from './vo.json';

// Written by scripts/voiceover.mjs; file stays null (no VO, no captions) until a voiceover is generated.
const VO = voJson as { file: string | null; start: number; words: { text: string; start: number; end: number }[] };

/* 15s Meta ad. Times are in seconds; scene changes sit on the 80 BPM beat of scripts/make_audio.py (music15/sfx15). */
const T = { hook: 0, steps: [2.25, 4.0, 5.75], clips: 7.5, clipLen: 1.125, end: 12, ctaTap: 13.2, total: 15 };

export const HOOKS = {
	1: "Want to see a senior home for your parents? We'll drive them there. Free.",
	2: "Free doorstep pickup to visit Bangalore's senior living homes.",
	3: 'Visiting senior homes with your parents? Leave the driving to us.',
} as const;
const OFFER = 'Free Complimentary Doorstep Chauffeur Pickup & Drop';
const DISCLAIMER = 'Chauffeur service across Bangalore is subject to location, schedule, and team confirmation.';
const RERA = 'PRM/KA/RERA/1251/310/PR/171208/000986';
const AUDIENCE = 'For your parents · Bangalore';
const TRUST = 'Only 112 homes · 24/7 healthcare';
const PRICE = '2 BHK from ₹98 L';
const CTA = 'Book your free pickup';
const STEPS = ['Pick a date & pickup area', 'We confirm by call', 'Visit Primus Olympia'];

export type Ad15Props = { hook: keyof typeof HOOKS; price: boolean };

/* Every text block must be readable: total time on screen >= 0.5s + 1s per 3.5 words. Throws at render time if a retime breaks it. */
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
export const assertReadable = (blocks: [string, number, number][]) => {
	const shown = new Map<string, number>();
	for (const [text, from, to] of blocks) shown.set(text, (shown.get(text) ?? 0) + (to - from));
	for (const [text, secs] of shown) {
		const need = 0.5 + words(text) / 3.5;
		if (secs + 1e-6 < need) throw new Error(`Too fast to read (${secs.toFixed(2)}s < ${need.toFixed(2)}s): "${text}"`);
	}
};
for (const hook of Object.values(HOOKS)) {
	assertReadable([
		[hook, 0, T.clips], [OFFER, 0, T.clips], [DISCLAIMER, 0, T.clips], [DISCLAIMER, T.end + 0.3, T.total],
		[STEPS[0], T.steps[0], T.clips], [STEPS[1], T.steps[1], T.clips], [STEPS[2], T.steps[2], T.clips],
		[AUDIENCE, T.clips + 0.1, T.end], [TRUST, T.clips + 0.4, T.end], [PRICE, T.clips + 0.7, T.end],
		[CTA, T.end + 0.2, T.total], [RERA, T.end + 0.3, T.total],
	]);
}

/* ---------- layout per format ---------- */

type L = {
	W: number; H: number; pad: number;
	hookBig: number; hookSmall: number; hookTop: number; chipBig: number; chipSmall: number;
	band: number; cardsTop: number; cardW: number; collapsed: number; expanded: number;
	caption: number; legal: number; legalSize: number; endLegal: number;
	trust: number; endLogo: number; cta: number; ctaSize: number; photo: number; photoH: number;
};
const V: L = {
	W: 1080, H: 1920, pad: 80, hookBig: 100, hookSmall: 54, hookTop: 280, chipBig: 40, chipSmall: 30,
	band: 660, cardsTop: 700, cardW: 920, collapsed: 100, expanded: 540,
	caption: 1300, legal: 1490, legalSize: 28, endLegal: 1430, trust: 62, endLogo: 330, cta: 470, ctaSize: 56, photo: 860, photoH: 520,
};
const S: L = {
	W: 1080, H: 1080, pad: 60, hookBig: 70, hookSmall: 40, hookTop: 56, chipBig: 32, chipSmall: 24,
	band: 330, cardsTop: 352, cardW: 960, collapsed: 84, expanded: 390,
	caption: 880, legal: 958, legalSize: 24, endLegal: 958, trust: 50, endLogo: 56, cta: 150, ctaSize: 48, photo: 410, photoH: 500,
};

export const Ad15: React.FC<Ad15Props> = ({ hook, price }) => {
	const frame = useCurrentFrame();
	const { fps, height } = useVideoConfig();
	const t = frame / fps;
	const L = height === 1080 ? S : V;
	const at = (start: number, cfg?: Parameters<typeof sp>[2]) => sp(t * 30, start * 30, cfg); // springs are tuned in 30fps beats

	return (
		<AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.white} 0%, ${C.tint} 100%)`, fontFamily: BODY, color: C.text, overflow: 'hidden' }}>
			<Sound />
			{t < T.clips && <HookAndSteps t={t} L={L} hook={HOOKS[hook]} at={at} />}
			{t >= T.clips && t < T.end && <Lifestyle t={t} L={L} price={price} at={at} />}
			{t >= T.end && <EndCard t={t} L={L} at={at} />}
			<Captions t={t} L={L} />
		</AbsoluteFill>
	);
};

type At = (start: number, cfg?: Parameters<typeof sp>[2]) => number;

/* ---------- audio: music ducks under the voiceover when there is one ---------- */

const Sound: React.FC = () => {
	const { fps } = useVideoConfig();
	if (!VO.file) return <Audio src={staticFile('audio/soundtrack-15.wav')} />;
	const duck = (f: number) => {
		const s = f / fps - VO.start; // seconds into the voiceover
		const gap = Math.min(...VO.words.map(w => (s < w.start ? w.start - s : s > w.end ? s - w.end : 0)));
		return interpolate(gap, [0, 0.35], [0.32, 1], { extrapolateRight: 'clamp' });
	};
	return (
		<>
			<Audio src={staticFile('audio/music-15.wav')} volume={duck} />
			<Audio src={staticFile('audio/sfx-15.wav')} volume={0.8} />
			<Sequence from={Math.round(VO.start * fps)}>
				<Audio src={staticFile(VO.file)} />
			</Sequence>
		</>
	);
};

/* ---------- footage (Primus clips, or a labelled placeholder until they arrive) ---------- */

const Clip: React.FC<{ name: keyof typeof CLIPS; label: string; zoom: number }> = ({ name, label, zoom }) => (
	<AbsoluteFill style={{ overflow: 'hidden' }}>
		{CLIPS[name] ? (
			<OffthreadVideo src={staticFile(`clips/${CLIPS[name]}`)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }} />
		) : (
			<AbsoluteFill style={{ background: 'repeating-linear-gradient(135deg, #4a2338 0 40px, #552a41 40px 80px)', alignItems: 'center' }}>
				{/* One line in the top 5%: the only band no scene puts text in, in both formats */}
				{label && (
					<div style={{ marginTop: '5%', fontFamily: BODY, fontWeight: 700, fontSize: 26, color: 'rgba(255,255,255,.55)', letterSpacing: 1, whiteSpace: 'nowrap' }}>
						PRIMUS CLIP NEEDED: {label}
					</div>
				)}
			</AbsoluteFill>
		)}
	</AbsoluteFill>
);

/* ---------- 0-7.5s: hook (full plum) then the band shrinks to a header over three step cards ---------- */

const HookAndSteps: React.FC<{ t: number; L: L; hook: string; at: At }> = ({ t, L, hook, at }) => {
	const k = at(T.steps[0] - 0.15, { mass: 1.1 }); // 0 = full-screen hook, 1 = header
	const band = L.H + (L.band - L.H) * k;
	const hookSize = L.hookBig + (L.hookSmall - L.hookBig) * k;
	const chipSize = L.chipBig + (L.chipSmall - L.chipBig) * k;
	const hookTop = (L === V ? 330 : 120) + (L.hookTop - (L === V ? 330 : 120)) * k;
	return (
		<>
			<div style={{ position: 'absolute', left: 0, top: 0, width: L.W, height: band, overflow: 'hidden' }}>
				<div style={{ position: 'absolute', inset: 0, height: L.H }}>
					<Clip name="car" label="car arriving at a family's door" zoom={1.08 - t * 0.008} />
				</div>
				<div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(130,26,82,.94) 0%, rgba(139,47,92,.82) 55%, rgba(130,26,82,.94) 100%)' }} />
				<div style={{ position: 'absolute', left: L.pad, top: hookTop, width: L.W - L.pad * 2 }}>
					<div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: hookSize, lineHeight: 1.08, color: C.white, letterSpacing: 0.3 }}>{hook}</div>
					<div style={{ display: 'inline-block', marginTop: hookSize * 0.42, padding: `${chipSize * 0.4}px ${chipSize * 0.6}px`, borderRadius: 14, background: C.white, color: C.plum, fontFamily: HEAD, fontWeight: 700, fontSize: chipSize, lineHeight: 1.15 }}>
						{OFFER}
					</div>
				</div>
			</div>
			{/* Disclaimer: always visible while the offer is on screen */}
			<div style={{ position: 'absolute', left: L.pad, top: L.legal, width: L.W - L.pad * 2, fontFamily: BODY, fontStyle: 'italic', fontSize: L.legalSize, lineHeight: 1.35, color: k > 0.5 ? C.text2 : 'rgba(255,255,255,.9)' }}>
				{DISCLAIMER}
			</div>
			{STEPS.map((title, i) => (
				<StepCard key={title} t={t} L={L} i={i} title={title} at={at} />
			))}
		</>
	);
};

const StepCard: React.FC<{ t: number; L: L; i: number; title: string; at: At }> = ({ t, L, i, title, at }) => {
	const open = (j: number) => at(T.steps[j], { damping: 20 }) - (j < 2 ? at(T.steps[j + 1], { damping: 20 }) : 0);
	const h = (j: number) => L.collapsed + (L.expanded - L.collapsed) * open(j);
	const y = L.cardsTop + Array.from({ length: i }, (_, j) => h(j) + 16).reduce((a, b) => a + b, 0);
	const appear = at(T.steps[i], { damping: 16, mass: 0.8 });
	const o = open(i);
	if (appear <= 0) return null;
	return (
		<div style={{ position: 'absolute', left: (L.W - L.cardW) / 2, top: y, width: L.cardW, height: h(i), boxSizing: 'border-box', padding: '18px 26px', borderRadius: 24, background: C.white, boxShadow: '0 5px 20px rgba(107,27,77,.25)', overflow: 'hidden', opacity: Math.min(1, appear * 1.5), transform: `translateX(${(1 - appear) * 120}px)` }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 20, height: L.collapsed - 36 }}>
				<div style={{ flex: '0 0 60px', height: 60, borderRadius: '50%', background: C.plum, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 700, fontSize: 30 }}>{i + 1}</div>
				<div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: L === V ? 52 : 44, color: C.text, whiteSpace: 'nowrap' }}>{title}</div>
			</div>
			<div style={{ position: 'absolute', left: 26, right: 26, top: L.collapsed - 6, bottom: 18, opacity: o, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				{i === 0 && <FieldsCrop t={t} height={L.expanded - L.collapsed - 30} at={at} />}
				{i === 1 && <CallConfirm t={t} />}
				{i === 2 && <DriveToGate t={t} at={at} width={L.cardW - 52} />}
			</div>
		</div>
	);
};

/* Real step-2 UI from the page (public/step2.png), zoomed so it is readable; dummy values are an overlay only. */
const FieldsCrop: React.FC<{ t: number; height: number; at: At }> = ({ height, at }) => {
	const s2 = meta.step2;
	const scale = height / s2.h;
	const value = (box: typeof s2.area, text: string, start: number) => {
		const a = at(start, { damping: 14 });
		return (
			<div style={{ position: 'absolute', left: (box.x + 6) * scale, top: (box.y + 4) * scale, width: (box.w - 50) * scale, height: (box.h - 9) * scale, background: C.white, display: 'flex', alignItems: 'center', paddingLeft: 6 * scale, boxSizing: 'border-box', fontFamily: BODY, fontWeight: 700, fontSize: 19 * scale, color: C.plum, opacity: a, transform: `translateY(${(1 - a) * 12}px)` }}>
				{text}
			</div>
		);
	};
	const trim = 20; // css px of the page card's side shadow to hide on each side
	return (
		<div style={{ position: 'relative', width: (s2.w - trim * 2) * scale, height, overflow: 'hidden' }}>
			<Img src={staticFile('step2.png')} style={{ position: 'absolute', left: -trim * scale, width: s2.w * scale, height }} />
			<div style={{ position: 'absolute', left: -trim * scale, top: 0 }}>
				{value(s2.area, 'Jayanagar', 2.9)}
				{value(s2.date, 'Sat, 8 Nov', 3.2)}
			</div>
		</div>
	);
};

const CallConfirm: React.FC<{ t: number }> = ({ t }) => {
	const ring = t >= 4.25 && t < 5.05 ? Math.sin((t - 4.25) * 48) * 14 : 0;
	const tick = interpolate(t, [5.05, 5.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
	return (
		<div style={{ position: 'relative', width: 180, height: 180 }}>
			<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 - tick, transform: `rotate(${ring}deg)` }}>
				<Handset size={150} />
			</div>
			<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: tick, transform: `scale(${0.6 + tick * 0.4})` }}>
				<Tick size={170} draw={tick} />
			</div>
		</div>
	);
};

const DriveToGate: React.FC<{ t: number; at: At; width: number }> = ({ at, width }) => {
	const go = at(5.85, { damping: 22, mass: 1.2 });
	return (
		<div style={{ position: 'relative', width, height: 170 }}>
			<div style={{ position: 'absolute', left: 0, right: 150, bottom: 6, borderBottom: `4px dashed ${C.line}` }} />
			<div style={{ position: 'absolute', right: 10, bottom: 0 }}>
				<Gate size={160} />
			</div>
			<div style={{ position: 'absolute', bottom: 0, left: -200 + (width - 330 + 200) * go }}>
				<Car size={200} wheel={go * 900} />
			</div>
		</div>
	);
};

/* ---------- 7.5-12s: lifestyle clips with audience, trust and (optional) price lines ---------- */

const SHOTS: [keyof typeof CLIPS, string][] = [
	['family', 'family greeting a parent'],
	['clubhouse', 'seniors in the clubhouse or at the pool'],
	['staff', 'a smiling staff member'],
	['exterior', 'Primus Olympia homes / exterior'],
];

const Lifestyle: React.FC<{ t: number; L: L; price: boolean; at: At }> = ({ t, L, price, at }) => {
	const i = Math.min(SHOTS.length - 1, Math.floor((t - T.clips) / T.clipLen));
	const local = t - T.clips - i * T.clipLen;
	const fadeIn = i > 0 ? Math.min(1, local / 0.15) : 1;
	const line = (start: number) => ({ opacity: Math.min(1, at(start, { damping: 18 }) * 1.4), transform: `translateY(${(1 - at(start, { damping: 18 })) * 30}px)` });
	return (
		<>
			{i > 0 && <Clip name={SHOTS[i - 1][0]} label="" zoom={1.04 + (T.clipLen + local) * 0.02} />}
			<AbsoluteFill style={{ opacity: fadeIn }}>
				<Clip name={SHOTS[i][0]} label={SHOTS[i][1]} zoom={1.04 + local * 0.02} />
			</AbsoluteFill>
			{/* soft dark band behind the centered text so it stays readable over any footage */}
			<AbsoluteFill style={{ background: 'radial-gradient(ellipse 95% 38% at 50% 50%, rgba(50,12,32,.8) 0%, rgba(50,12,32,0) 100%), rgba(20,5,12,.18)' }} />
			<AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: `0 ${L.pad}px` }}>
				<div style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 999, background: C.plum, color: C.white, fontFamily: HEAD, fontWeight: 700, fontSize: L === V ? 34 : 28, marginBottom: 22, ...line(T.clips + 0.1) }}>{AUDIENCE}</div>
				<div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: L.trust, lineHeight: 1.12, color: C.white, ...line(T.clips + 0.4) }}>
					{TRUST.split(' · ').map(part => <div key={part}>{part}</div>)}
				</div>
				{price && <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: L.trust * 0.9, color: C.tint, marginTop: 14, ...line(T.clips + 0.7) }}>{PRICE}</div>}
			</AbsoluteFill>
		</>
	);
};

/* ---------- 12-15s: end card ---------- */

const EndCard: React.FC<{ t: number; L: L; at: At }> = ({ t, L, at }) => {
	const rise = (start: number) => ({ opacity: Math.min(1, at(start, { damping: 18 }) * 1.5), transform: `translateY(${(1 - at(start, { damping: 18 })) * 36}px)` });
	const press = t >= T.ctaTap ? interpolate(t, [T.ctaTap, T.ctaTap + 0.1, T.ctaTap + 0.25], [1, 0.95, 1], { extrapolateRight: 'clamp' }) : 1;
	const btnW = L.W - L.pad * 2, btnH = L === V ? 150 : 120;
	return (
		<AbsoluteFill>
			<div style={{ position: 'absolute', top: L.endLogo, width: L.W, display: 'flex', justifyContent: 'center', ...rise(T.end) }}>
				<Img src={staticFile('primus-logo.png')} style={{ width: 324 }} />
			</div>
			<div style={{ position: 'absolute', top: L.cta, left: L.pad, width: btnW, height: btnH, borderRadius: 14, background: C.plum, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, fontFamily: HEAD, fontWeight: 700, fontSize: L.ctaSize, boxShadow: '0 14px 34px rgba(107,27,77,.35)', ...rise(T.end + 0.2), transform: `${rise(T.end + 0.2).transform} scale(${press})` }}>
				{CTA} <Arrow size={L.ctaSize} />
			</div>
			<Tap frame={t * 30} at={T.ctaTap * 30} x={L.W / 2 + btnW * 0.25} y={L.cta + btnH / 2} />
			<div style={{ position: 'absolute', top: L.cta + btnH + (L === V ? 34 : 22), left: L.pad, width: btnW, textAlign: 'center', fontFamily: HEAD, fontWeight: 700, fontSize: L === V ? 40 : 32, lineHeight: 1.2, color: C.plumDark, ...rise(T.end + 0.25) }}>
				{OFFER}
			</div>
			<div style={{ position: 'absolute', top: L.photo, left: L.pad, width: btnW, height: L.photoH, borderRadius: 24, overflow: 'hidden', boxShadow: '0 5px 20px rgba(107,27,77,.3)', ...rise(T.end + 0.35) }}>
				<Img src={staticFile('gallery.webp')} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.04 + (t - T.end) * 0.015})` }} />
			</div>
			<div style={{ position: 'absolute', top: L.endLegal, left: L.pad, width: btnW, textAlign: 'center', fontFamily: BODY, fontSize: L.legalSize, lineHeight: 1.4, color: C.text2, ...rise(T.end + 0.3) }}>
				{DISCLAIMER}
				<br />
				{RERA}
			</div>
		</AbsoluteFill>
	);
};

/* ---------- burned-in captions from the voiceover's word timings (none until a voiceover exists) ---------- */

const PHRASES = (() => {
	const out: { text: string; start: number; end: number }[] = [];
	let cur: typeof VO.words = [];
	for (const w of VO.words) {
		cur.push(w);
		if (cur.length >= 5 || /[.,?!]$/.test(w.text)) {
			out.push({ text: cur.map(x => x.text).join(' '), start: cur[0].start, end: cur[cur.length - 1].end });
			cur = [];
		}
	}
	if (cur.length) out.push({ text: cur.map(x => x.text).join(' '), start: cur[0].start, end: cur[cur.length - 1].end });
	return out;
})();

const Captions: React.FC<{ t: number; L: L }> = ({ t, L }) => {
	const s = t - VO.start;
	const p = PHRASES.find(x => s >= x.start - 0.05 && s <= x.end + 0.15);
	if (!p) return null;
	return (
		<div style={{ position: 'absolute', top: L.caption, left: 0, width: L.W, display: 'flex', justifyContent: 'center' }}>
			<div style={{ maxWidth: L.W - L.pad * 2, padding: '12px 26px', borderRadius: 14, background: 'rgba(20,25,25,.78)', color: C.white, fontFamily: BODY, fontWeight: 700, fontSize: L === V ? 44 : 36, lineHeight: 1.25, textAlign: 'center' }}>{p.text}</div>
		</div>
	);
};
