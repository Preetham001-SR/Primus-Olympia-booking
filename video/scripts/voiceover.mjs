// ElevenLabs voiceover for the 15s ad -> public/audio/vo.mp3 + src/vo.json (word timings drive captions and music ducking).
// Setup: put ELEVENLABS_API_KEY=... (and optionally ELEVENLABS_VOICE_ID=...) in video/.env. Never commit .env.
//   node scripts/voiceover.mjs --voices     list voices on your account (Indian-English accents first)
//   node scripts/voiceover.mjs              generate with ELEVENLABS_VOICE_ID
//   node scripts/voiceover.mjs --self-test  check the character->word timing conversion offline
import { readFile, writeFile } from 'node:fs/promises';

// 31 words: calm pace that fits 15s. "we can" (not "we'll") so the voice doesn't promise what the disclaimer qualifies.
const SCRIPT = 'Senior living for your parents? Visit Primus Olympia the easy way. Pick a date and your pickup area, and we can drive you there and back, free. Book your free pickup today.';
const START = 0.3; // seconds into the ad
const MAX_END = 14.6; // must finish before the 15s ad ends

/** ElevenLabs character alignment -> [{ text, start, end }] per word. */
export function toWords({ characters, character_start_times_seconds: s, character_end_times_seconds: e }) {
	const words = [];
	let cur = null;
	characters.forEach((ch, i) => {
		if (/\s/.test(ch)) { if (cur) words.push(cur); cur = null; return; }
		if (!cur) cur = { text: '', start: s[i], end: e[i] };
		cur.text += ch;
		cur.end = e[i];
	});
	if (cur) words.push(cur);
	return words.map(w => ({ ...w, start: +w.start.toFixed(3), end: +w.end.toFixed(3) }));
}

function selfTest() {
	const chars = [...'Hi there,  you.'];
	const w = toWords({ characters: chars, character_start_times_seconds: chars.map((_, i) => i * 0.1), character_end_times_seconds: chars.map((_, i) => i * 0.1 + 0.1) });
	const want = [{ text: 'Hi', start: 0, end: 0.2 }, { text: 'there,', start: 0.3, end: 0.9 }, { text: 'you.', start: 1.1, end: 1.5 }];
	if (JSON.stringify(w) !== JSON.stringify(want)) throw new Error('toWords failed: ' + JSON.stringify(w));
	console.log('toWords self-test passed');
}

async function env() {
	const text = await readFile(new URL('../.env', import.meta.url), 'utf8').catch(() => '');
	return Object.fromEntries(text.split('\n').map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^['"]|['"]$/g, '')]));
}

async function api(path, key, init = {}) {
	const res = await fetch(`https://api.elevenlabs.io${path}`, { ...init, headers: { 'xi-api-key': key, 'Content-Type': 'application/json', ...(init.headers || {}) } });
	if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
	return res.json();
}

if (process.argv.includes('--self-test')) {
	selfTest();
} else {
	const { ELEVENLABS_API_KEY: key, ELEVENLABS_VOICE_ID: voice, ELEVENLABS_SPEED: speed = '1.0' } = await env();
	if (!key) throw new Error('Add ELEVENLABS_API_KEY=... to video/.env first.');
	if (process.argv.includes('--voices')) {
		const { voices } = await api('/v1/voices', key);
		const indian = v => /indian|hindi|kannada/i.test(JSON.stringify(v.labels || {}) + v.name + (v.description || ''));
		for (const v of voices.sort((a, b) => indian(b) - indian(a)))
			console.log(`${v.voice_id}  ${v.name}  ${JSON.stringify(v.labels || {})}`);
	} else {
		if (!voice) throw new Error('Pick a voice: run with --voices, then add ELEVENLABS_VOICE_ID=... to video/.env.');
		const out = await api(`/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, key, {
			method: 'POST',
			body: JSON.stringify({ text: SCRIPT, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: Number(speed) } }),
		});
		const words = toWords(out.alignment);
		const end = START + words[words.length - 1].end;
		if (end > MAX_END) throw new Error(`Voiceover ends at ${end.toFixed(2)}s (limit ${MAX_END}s). Set ELEVENLABS_SPEED=1.1 in .env and rerun.`);
		await writeFile(new URL('../public/audio/vo.mp3', import.meta.url), Buffer.from(out.audio_base64, 'base64'));
		await writeFile(new URL('../src/vo.json', import.meta.url), JSON.stringify({ file: 'audio/vo.mp3', start: START, words }, null, 1) + '\n');
		console.log(`vo.mp3 written: ${words.length} words, ends at ${end.toFixed(2)}s`);
	}
}
