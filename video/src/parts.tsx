import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile } from 'remotion';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';
import { loadFont as loadLato } from '@remotion/google-fonts/Lato';
import meta from '../public/meta.json';

export { meta };

// Brand tokens measured on primuslife.in/bangalore/olympia (see public/meta.json + README).
export const C = {
	plum: '#8B2F5C',
	plumDark: '#821A52',
	tint: '#F2E1E8',
	text: '#212529',
	text2: '#4A4A4A',
	line: '#DEE2E6',
	white: '#FFFFFF',
	ok: '#2E7D4F', // only for the "confirmed" tick the brief asks for
};
export const HEAD = loadMontserrat('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily;
export const BODY = loadLato('normal', { weights: ['400', '700'], subsets: ['latin'] }).fontFamily;
loadLato('italic', { weights: ['400'], subsets: ['latin'] });

export const FPS = 30;
/** Calm, critically damped spring starting at `start`. 0 before start, settles to 1. */
export const sp = (frame: number, start: number, cfg: { damping?: number; mass?: number; stiffness?: number } = {}) =>
	spring({ frame: frame - start, fps: FPS, config: { damping: 200, mass: 1, stiffness: 100, ...cfg } });
export const fadeOut = (frame: number, end: number, len = 10) =>
	interpolate(frame, [end - len, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/* ---------- Phone ---------- */

export const SCREEN_W = 430;
export const CSS = SCREEN_W / 375; // page css px -> screen px
const STATUS_H = 40;
const VIEW_H = Math.round(812 * CSS);
export const SCREEN_H = STATUS_H + VIEW_H;
const BEZEL = 18;
export const PHONE_W = SCREEN_W + BEZEL * 2;
export const PHONE_H = SCREEN_H + BEZEL * 2;
/** y (screen px, from screen top) of a page css y when the page is scrolled to `scroll`. */
export const pageY = (cssY: number, scroll: number) => STATUS_H + (cssY - scroll) * CSS;

export type Pose = { x: number; y: number; s: number; r?: number };

/** Phone mockup. `children` render in screen coordinates (430 x SCREEN_H). */
export const Phone: React.FC<{ pose: Pose; children: React.ReactNode }> = ({ pose, children }) => (
	<div
		style={{
			position: 'absolute', left: pose.x - PHONE_W / 2, top: pose.y - PHONE_H / 2, width: PHONE_W, height: PHONE_H,
			transform: `scale(${pose.s}) rotate(${pose.r ?? 0}deg)`, transformOrigin: '50% 50%',
			borderRadius: 74, background: 'linear-gradient(145deg,#3a3d42 0%,#141919 40%,#0d0f10 100%)',
			boxShadow: '0 40px 90px rgba(107,27,77,.28), 0 12px 30px rgba(0,0,0,.25), inset 0 0 0 2px rgba(255,255,255,.08)',
		}}
	>
		<div style={{ position: 'absolute', left: BEZEL, top: BEZEL, width: SCREEN_W, height: SCREEN_H, borderRadius: 56, overflow: 'hidden', background: C.white }}>
			{children}
			<StatusBar />
		</div>
	</div>
);

const StatusBar = () => (
	<div style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: STATUS_H, background: C.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 34px 0', boxSizing: 'border-box', fontFamily: BODY, fontWeight: 700, fontSize: 17, color: C.text }}>
		<span>9:41</span>
		<div style={{ position: 'absolute', left: SCREEN_W / 2 - 58, top: 8, width: 116, height: 30, borderRadius: 20, background: '#0d0f10' }} />
		<svg width="58" height="14" viewBox="0 0 58 14" aria-hidden>
			<g fill={C.text}>
				<rect x="0" y="9" width="3" height="5" rx="1" /><rect x="5" y="6" width="3" height="8" rx="1" /><rect x="10" y="3" width="3" height="11" rx="1" /><rect x="15" y="0" width="3" height="14" rx="1" />
				<rect x="28" y="1" width="24" height="12" rx="3" fill="none" stroke={C.text} strokeWidth="1.5" /><rect x="30.5" y="3.5" width="18" height="7" rx="1.5" /><rect x="53.5" y="5" width="2" height="4" rx="1" />
			</g>
		</svg>
	</div>
);

/** The captured Olympia page, scrolled to `scroll` (css px), with the real fixed header pinned on top. */
export const Page: React.FC<{ scroll: number; zoom?: number }> = ({ scroll, zoom = 1 }) => (
	<AbsoluteFill style={{ top: STATUS_H, height: VIEW_H, overflow: 'hidden', transform: `scale(${zoom})`, transformOrigin: '50% 40%' }}>
		<Img src={staticFile('page.jpg')} style={{ position: 'absolute', left: 0, top: -scroll * CSS, width: SCREEN_W }} />
		<Img src={staticFile('header.png')} style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W }} />
	</AbsoluteFill>
);

/* ---------- Touch ---------- */

/** Soft thumb touch: dot fades in, presses, ripple expands. `at` is the press frame. */
export const Tap: React.FC<{ frame: number; at: number; x: number; y: number }> = ({ frame, at, x, y }) => {
	const t = frame - at;
	if (t < -12 || t > 24) return null;
	const appear = interpolate(t, [-12, -2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
	const press = t >= 0 ? interpolate(t, [0, 4, 10], [1, 0.82, 1], { extrapolateRight: 'clamp' }) : 1;
	const leave = interpolate(t, [12, 24], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
	const ring = interpolate(t, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
	return (
		<>
			{t >= 0 && (
				<div style={{ position: 'absolute', left: x - 20 - ring * 60, top: y - 20 - ring * 60, width: 40 + ring * 120, height: 40 + ring * 120, borderRadius: '50%', border: `3px solid rgba(139,47,92,${0.45 * (1 - ring)})`, background: `rgba(139,47,92,${0.12 * (1 - ring)})` }} />
			)}
			<div style={{ position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: '50%', opacity: appear * leave, transform: `scale(${press})`, background: 'radial-gradient(circle, rgba(255,255,255,.85) 0%, rgba(255,255,255,.55) 55%, rgba(255,255,255,0) 72%)', boxShadow: '0 6px 18px rgba(0,0,0,.18)', border: '2px solid rgba(255,255,255,.9)' }} />
		</>
	);
};

/* ---------- Icons (inline SVG, brand plum) ---------- */

export const Car: React.FC<{ size?: number; wheel?: number; color?: string }> = ({ size = 120, wheel = 0, color = C.plum }) => (
	<svg width={size} height={size * 0.5} viewBox="0 0 120 60" aria-hidden>
		<path d="M8 40 C8 32 14 30 22 29 L34 16 C37 13 41 12 45 12 L74 12 C79 12 83 14 86 18 L96 29 C106 30 114 33 114 40 L114 44 C114 46 112 47 110 47 L10 47 C9 47 8 46 8 44 Z" fill={color} />
		<path d="M40 18 L36 28 L58 28 L58 18 Z M64 18 L64 28 L88 28 L80 19 C79 18 77 18 75 18 Z" fill="#fff" opacity=".85" />
		{[30, 92].map(cx => (
			<g key={cx} transform={`rotate(${wheel} ${cx} 47)`}>
				<circle cx={cx} cy={47} r={10} fill={C.text} /><circle cx={cx} cy={47} r={4} fill="#fff" />
				<rect x={cx - 1} y={38} width={2} height={18} fill="#fff" opacity=".6" />
			</g>
		))}
	</svg>
);

export const Calendar: React.FC<{ size?: number }> = ({ size = 40 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.plum} strokeWidth="2" strokeLinecap="round" aria-hidden>
		<rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" />
	</svg>
);
export const Pin: React.FC<{ size?: number }> = ({ size = 40 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
		<path d="M12 22s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12z" fill={C.plum} /><circle cx="12" cy="10" r="2.6" fill="#fff" />
	</svg>
);
export const Handset: React.FC<{ size?: number }> = ({ size = 56 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
		<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z" fill={C.plum} />
	</svg>
);
export const Tick: React.FC<{ size?: number; draw: number }> = ({ size = 56, draw }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
		<circle cx="12" cy="12" r="11" fill={C.ok} />
		<path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="20" strokeDashoffset={20 * (1 - draw)} />
	</svg>
);
export const Gate: React.FC<{ size?: number }> = ({ size = 110 }) => (
	<svg width={size} height={size * 0.8} viewBox="0 0 110 88" aria-hidden>
		<rect x="4" y="20" width="16" height="68" rx="3" fill={C.plum} /><rect x="90" y="20" width="16" height="68" rx="3" fill={C.plum} />
		<path d="M12 22 Q55 -6 98 22" fill="none" stroke={C.plum} strokeWidth="7" strokeLinecap="round" />
		<rect x="2" y="14" width="20" height="8" rx="2" fill={C.plumDark} /><rect x="88" y="14" width="20" height="8" rx="2" fill={C.plumDark} />
		<path d="M20 86 H90" stroke={C.line} strokeWidth="4" />
	</svg>
);
export const Arrow: React.FC<{ size?: number; color?: string }> = ({ size = 44, color = '#fff' }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M5 12h14M13 6l6 6-6 6" />
	</svg>
);
