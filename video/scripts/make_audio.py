"""Original soundtrack for the Olympia launch video: warm music bed + SFX synced to the visuals.

Everything is synthesised here (no samples, no licensed music), so it is safe for Meta ads.
Output: public/audio/soundtrack.wav (mixed, -14 LUFS, peaks <= -1.5 dBFS) plus music.wav / sfx.wav stems.
Run: python3 -I scripts/make_audio.py
"""
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, lfilter, sosfilt
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 48000
DUR = 20.0
N = int(SR * DUR)
OUT = Path(__file__).resolve().parent.parent / 'public' / 'audio'
rng = np.random.default_rng(7)  # fixed seed: same audio every run


def beat(b):  # video timeline is authored in 30fps beats (see src/Video.tsx); keep these in sync
    return b / 30


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def env(n, a, d, sustain=None):
    """Attack (s) then exponential decay with time-constant d (s)."""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
    return e if sustain is None else np.maximum(e, 0)


def place(buf, sig, t, pan=0.0, gain=1.0):
    """Add mono or stereo `sig` into stereo `buf` at time t (s), equal-power pan -1..1."""
    i = int(t * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    if sig.ndim == 1:
        ang = (pan + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(ang), sig * np.sin(ang)], 1) * np.sqrt(2)
    buf[i : i + len(sig)] += sig * gain


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)


# ---------------- instruments ----------------

def pluck(midi, dur=1.6, bright=3500):
    """Karplus-Strong plucked string (harp/guitar-like), as one IIR filter."""
    f = hz(midi)
    p = int(round(SR / f))
    n = int(dur * SR)
    burst = np.zeros(n)
    burst[:p] = lp(rng.uniform(-1, 1, p), bright)
    a = np.zeros(p + 2)
    a[0], a[p], a[p + 1] = 1, -0.4985, -0.4985
    y = lfilter([1], a, burst)
    return y / (np.abs(y).max() + 1e-9) * env(n, 0.002, dur / 3)


def pad(midis, dur, attack=0.9, release=1.2):
    """Soft detuned-saw pad, heavily low-passed, stereo spread."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for m in midis:
        for k, cents in enumerate((-8, 0, 7)):
            f = hz(m) * 2 ** (cents / 1200)
            ph = rng.uniform(0, 1)
            saw = 2 * ((t * f + ph) % 1) - 1
            if cents == 0:
                out += saw[:, None] * 0.5
            else:
                out[:, 0 if cents < 0 else 1] += saw  # detuned voices split left/right for width
    out = lp(out, 1400, 4)
    shape = np.minimum(1, t / attack) * np.minimum(1, np.maximum(0, (dur - t) / release))
    return out * shape[:, None] / len(midis) * 0.35


def bass(midi, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(midi)
    # fundamental + 2nd/3rd harmonics so it is still heard on phone speakers
    s = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)
    shape = np.minimum(1, t / 0.04) * np.exp(-t / (dur * 0.9)) * np.minimum(1, (dur - t) / 0.05)
    return s * shape


def bell(midi, dur=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(midi)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (dur * d)) for r, a, d in ((1, 1, 0.45), (2.0, 0.35, 0.25), (2.76, 0.25, 0.12), (5.4, 0.12, 0.05)))
    return s * np.minimum(1, t / 0.003)


def shaker(dur=0.09):
    n = int(dur * SR)
    return hp(rng.uniform(-1, 1, n), 6000) * env(n, 0.012, 0.025)


def soft_kick(dur=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 95 * np.exp(-t / 0.05) + 48
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.09)


# ---------------- music bed: 90 BPM, D major, 2.667 s bars (bar 6 lands exactly on the 16 s end card) ----------------

BAR = 60 / 90 * 4
CHORDS = [  # (pad voicing, bass root, arpeggio tones)
    ([62, 66, 69, 76], 50, [62, 66, 69, 74, 76]),  # Dadd9
    ([59, 62, 66, 69], 47, [59, 62, 66, 69, 74]),  # Bm7
    ([55, 59, 62, 66], 43, [55, 59, 62, 66, 71]),  # Gmaj7
    ([57, 62, 64, 69], 45, [57, 62, 64, 69, 76]),  # Asus4
    ([59, 62, 66, 69], 47, [59, 62, 66, 69, 74]),  # Bm7
    ([55, 59, 62, 69], 43, [55, 59, 62, 67, 69]),  # G6/9 -> lift
    ([62, 66, 69, 74, 78], 50, [62, 66, 69, 74, 78]),  # D (resolve on end card)
    ([62, 66, 69, 76], 50, [66, 69, 74, 78]),  # Dadd9 tail
]


def music():
    buf = np.zeros((N, 2))
    pattern = [0, 2, 1, 3, 2, 4, 3, 2]  # gentle rising/falling eighth-note arpeggio
    for i, (voicing, root, arp) in enumerate(CHORDS):
        t0 = i * BAR
        place(buf, pad(voicing, BAR + 1.2, attack=0.25 if i == 0 else 0.9), t0, gain=0.55)  # fast in on the hook
        if i >= 1:
            place(buf, bass(root, BAR), t0, gain=0.22)
        for k in range(8):
            if i == 7 and k > 3:
                break
            note = arp[pattern[k] % len(arp)] + 12
            place(buf, pluck(note), t0 + k * BAR / 8, pan=(-0.35 if k % 2 else 0.35), gain=0.16 + 0.03 * (k == 0))
        if 1 <= i <= 5:  # light pulse under the explainer, building into the lift
            for b in (0, 2):
                place(buf, soft_kick(), t0 + b * BAR / 4, gain=0.22)
            for k in range(8):
                place(buf, shaker(), t0 + (k + 0.5) * BAR / 8, pan=0.4, gain=0.05 + 0.012 * i)
    place(buf, bell(86), 6 * BAR, gain=0.10)  # sparkle on the resolve
    place(buf, bell(90), 6 * BAR + 0.33, gain=0.07)
    t = np.arange(N) / SR
    buf *= np.minimum(1, np.maximum(0, (DUR - t) / 1.2))[:, None]  # fade out over the last 1.2 s
    return buf


# ---------------- SFX ----------------

def noise(n):
    return rng.uniform(-1, 1, n)


def tap():
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    click = hp(noise(n), 2500) * env(n, 0.0005, 0.004)
    body = np.sin(2 * np.pi * 1700 * t) * env(n, 0.001, 0.012)
    return click * 0.6 + body * 0.5


def pop(f0=700):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 0.6 * np.exp(-t / 0.015))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.03)


def whoosh(dur=0.6, lo=300, hi=4000, pan_from=0.0, pan_to=0.0):
    """Band-limited noise swell; brightness rises then falls; pans across."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = noise(n)
    low, mid, high = bp(x, lo, lo * 3), bp(x, lo * 3, hi / 2), bp(x, hi / 2, min(hi * 2, 20000))
    shape = np.sin(np.pi * t) ** 2
    s = low * (1 - t) + mid + high * np.sin(np.pi * t)
    s = s * shape
    pan = pan_from + (pan_to - pan_from) * t
    ang = (pan + 1) * np.pi / 4
    return np.stack([s * np.cos(ang), s * np.sin(ang)], 1) * np.sqrt(2)


def car_pass(dur=0.9, pan_from=-0.9, pan_to=0.9, settle=False):
    """Soft electric-car pass-by: tonal hum with doppler drop + tyre noise. Calm, not a revving engine."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    f = 160 * (1.12 - 0.24 * t) if not settle else 150 * (1.05 - 0.15 * t)
    hum = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    tyre = bp(noise(n), 400, 1800)
    shape = np.sin(np.pi * t) ** 1.5 if not settle else np.sin(np.pi * np.minimum(t * 1.4, 1)) ** 1.5 * (1 - 0.6 * t)
    s = (hum * 0.5 + tyre * 0.7) * shape
    pan = pan_from + (pan_to - pan_from) * t
    ang = (pan + 1) * np.pi / 4
    return np.stack([s * np.cos(ang), s * np.sin(ang)], 1) * np.sqrt(2)


def ring():
    """Gentle two-note marimba trill: suggests a call without sounding like the viewer's own phone."""
    out = np.zeros(int(0.9 * SR))
    for k in range(6):
        n = int(0.11 * SR)
        tt = np.arange(n) / SR
        m = 81 if k % 2 == 0 else 78
        note = (np.sin(2 * np.pi * hz(m) * tt) + 0.25 * np.sin(2 * np.pi * hz(m) * 4 * tt)) * env(n, 0.002, 0.05)
        i = int((k * 0.075 + (0.225 if k >= 3 else 0)) * SR)  # two trills of three notes
        out[i : i + n] += note
    return out


def chime(notes, gap=0.09, dur=1.4):
    out = np.zeros(int((dur + gap * len(notes)) * SR))
    for k, m in enumerate(notes):
        b = bell(m, dur)
        i = int(k * gap * SR)
        out[i : i + len(b)] += b * (0.8 ** k)
    return out


def type_tick():
    n = int(0.02 * SR)
    return bp(noise(n), 2500, 7000) * env(n, 0.0005, 0.004) * rng.uniform(0.6, 1.0)


def swell(dur=0.8):
    """Reverse-cymbal style swell into the end card."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return hp(noise(n), 3000) * t ** 3


def bloom():
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    f = 70 * np.exp(-t / 0.2) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.01, 0.35)


def sfx():
    buf = np.zeros((N, 2))
    # Scene 1: phone rises in, pill + headline lines land
    place(buf, whoosh(1.1, 200, 3000, -0.2, 0.0), beat(0), gain=0.42)
    place(buf, bloom(), beat(28), gain=0.22)  # phone settles
    place(buf, pop(900), beat(2), gain=0.22)
    for b in (8, 26, 44):
        place(buf, pop(620), beat(b), gain=0.12)
    # Scene 2: scroll, tap "Book a site visit", offer card, car drives across
    place(buf, whoosh(0.5, 500, 5000, 0.2, -0.2), beat(96), gain=0.14)
    place(buf, tap(), beat(130), gain=0.55)
    place(buf, whoosh(0.45, 400, 6000), beat(136), gain=0.22)
    place(buf, chime([74, 81]), beat(140), gain=0.20)
    place(buf, car_pass(0.95), beat(149), gain=0.22)
    # Scene 3: move to "How it works", three cards, chips, call -> tick, typing, car arrives
    place(buf, whoosh(0.6, 250, 4000, 0.3, -0.4), beat(178), gain=0.26)
    for b in (192, 248, 304):
        place(buf, whoosh(0.35, 600, 7000, 0.5, 0.2), beat(b - 2), gain=0.16)
    place(buf, pop(660), beat(206), gain=0.16)
    place(buf, pop(880), beat(218), gain=0.16)
    place(buf, ring(), beat(256), gain=0.17)
    place(buf, chime([74, 78, 81]), beat(283), gain=0.22)
    place(buf, tap(), beat(282), gain=0.35)
    place(buf, tap(), beat(312), gain=0.35)
    for k in range(len('Ramesh K')):
        place(buf, type_tick(), beat(286 + k * 2.5), pan=-0.3, gain=0.18)
    for k in range(len('98XXXXXX10')):
        place(buf, type_tick(), beat(316 + k * 2.5), pan=-0.3, gain=0.18)
    place(buf, car_pass(1.0, -0.8, 0.5, settle=True), beat(312), gain=0.22)
    place(buf, chime([69, 76]), beat(342), gain=0.14)
    # Scene 4: into the destination, soft swish on each gallery cut
    place(buf, whoosh(0.7, 250, 4000, -0.4, 0.3), beat(356), gain=0.26)
    for b in (390, 420, 450):
        place(buf, whoosh(0.28, 900, 8000, 0.2, -0.2), beat(b - 3), gain=0.12)
    # Scene 5: swell into the end card, warm bloom, CTA lands, tap + success
    place(buf, swell(0.75), beat(480) - 0.75, gain=0.10)
    place(buf, bloom(), beat(480), gain=0.30)
    place(buf, pop(520), beat(504), gain=0.16)
    place(buf, tap(), beat(540), gain=0.5)
    place(buf, chime([81, 86, 90]), beat(541), gain=0.22)
    return buf


# ---------------- space, loudness, limiting ----------------

def reverb(x, secs=2.0, wet=0.22):
    n = int(secs * SR)
    t = np.arange(n) / SR
    ir = np.stack([lp(noise(n), 6000) * np.exp(-t / (secs / 5)), lp(noise(n), 6000) * np.exp(-t / (secs / 5))], 1)
    ir /= np.sqrt((ir ** 2).sum(0))
    tail = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - wet) + tail * wet


def lufs(x):
    """Integrated loudness per ITU-R BS.1770-4 (K-weighting, 400 ms blocks, -70 LUFS / -10 LU gates)."""
    s1 = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    k = lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], s1, axis=0)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = np.array([(k[i : i + blk] ** 2).mean(0).sum() for i in range(0, len(k) - blk + 1, hop)])
    loud = -0.691 + 10 * np.log10(ms + 1e-12)
    ms = ms[loud > -70]
    rel = -0.691 + 10 * np.log10(ms.mean()) - 10
    ms = ms[-0.691 + 10 * np.log10(ms) > rel]
    return -0.691 + 10 * np.log10(ms.mean())


def limit(x, ceiling_db=-1.5, look=0.005):
    """Look-ahead peak limiter: never lets a sample exceed the ceiling."""
    thr = 10 ** (ceiling_db / 20)
    peak = np.abs(x).max(1)
    g = np.minimum(1, thr / np.maximum(peak, 1e-9))
    w = int(look * SR)
    g = minimum_filter1d(g, 2 * w + 1)
    g = np.minimum(g, uniform_filter1d(g, w))  # smooth but stay at or under the instantaneous need
    return np.clip(x * g[:, None], -thr, thr)


def write(path, x):
    wavfile.write(path, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))


def self_check():
    # BS.1770: a 0 dBFS 1 kHz sine in one channel of a stereo pair reads -3.01 LUFS.
    t = np.arange(10 * SR) / SR
    sine = np.stack([np.sin(2 * np.pi * 1000 * t), np.zeros_like(t)], 1)
    got = lufs(sine)
    assert abs(got - (-3.01)) < 0.1, f'LUFS meter off: {got:.2f}'
    loud = limit(sine * 4)
    assert np.abs(loud).max() <= 10 ** (-1.5 / 20) + 1e-9, 'limiter let a peak through'


if __name__ == '__main__':
    self_check()
    OUT.mkdir(parents=True, exist_ok=True)
    m = reverb(music(), 2.4, 0.25)
    s = reverb(sfx(), 1.2, 0.12)
    write(OUT / 'music.wav', m)
    write(OUT / 'sfx.wav', s)
    mix = m * 0.85 + s
    target = -14.0  # common social/Meta delivery loudness
    for _ in range(3):  # limiting lowers loudness a little; iterate to land on target
        mix = limit(mix * 10 ** ((target - lufs(mix)) / 20))
    write(OUT / 'soundtrack.wav', mix)
    print(f'soundtrack.wav  {lufs(mix):.1f} LUFS  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  {len(mix) / SR:.1f}s')
