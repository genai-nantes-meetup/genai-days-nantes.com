"""Shared voices for the French-touch variants (music_B1.py and the M hybrids). All synthesized."""
import numpy as np
from scipy.signal import lfilter

from music_lab import RNG, bandpass, highpass, lowpass, midi_hz, noise, secs, sweep_filter, timeline

VOWELS = {
    "a": (800, 1150, 2900),
    "o": (450, 800, 2830),
    "e": (400, 2000, 2700),
    "u": (325, 700, 2530),
    "i": (300, 2300, 3000),
}


def humanize(time, amount=0.005):
    return time + RNG.normal(0, amount)


def saw(freq, length, phase=0.0):
    return 2 * ((np.arange(length) * freq / 44100 + phase) % 1) - 1


def release(length, length_s, fade=0.03):
    return np.clip((length_s - timeline(length)) / fade, 0, 1)


# ---------------------------------------------------------------- drums

def disco_kick(drive=1.3, decay=8.0):
    length = secs(0.38)
    rt = timeline(length)
    body = np.sin(2 * np.pi * np.cumsum(50 + 95 * np.exp(-rt * 28)) / 44100) * np.exp(-rt * decay)
    beater = lowpass(noise(length), 3500) * np.exp(-rt * 180) * 0.2
    return np.tanh((body + beater) * drive)


def handclap(spread=0.009, hands=3):
    length = secs(0.3)
    rt = timeline(length)
    env = np.zeros(length)
    for i in range(hands):
        offset = i * spread * RNG.uniform(0.8, 1.2)
        env += np.exp(-np.maximum(0, rt - offset) * (190 if i < hands - 1 else 22)) * (rt >= offset)
    return bandpass(noise(length), 900, 5200) * env


def snare_body(tone_hz=205):
    length = secs(0.3)
    rt = timeline(length)
    return np.sin(2 * np.pi * tone_hz * rt) * np.exp(-rt * 30) * 0.5 + highpass(noise(length), 2500) * np.exp(-rt * 24) * 0.45


def metal_hat(open_hat=False):
    """808-style hat: six detuned square waves, high-passed."""
    length = secs(0.32 if open_hat else 0.06)
    rt = timeline(length)
    tone = sum(np.sign(np.sin(2 * np.pi * f * rt)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    tone = highpass(bandpass(tone, 3000, 14000) + noise(length) * 0.3, 7000)
    return tone * np.exp(-rt * (14 if open_hat else 75)) * 0.25


def tambourine():
    length = secs(0.12)
    rt = timeline(length)
    env = sum(np.exp(-np.maximum(0, rt - o) * 55) * (rt >= o) for o in (0, 0.012, 0.022))
    return bandpass(noise(length), 5500, 12000) * env * 0.5


def brush(length_s=0.22):
    """Brush sweep on a snare: soft filtered noise swelling and fading."""
    length = secs(length_s)
    rt = timeline(length)
    env = np.minimum(1, rt / (length_s * 0.4)) * np.exp(-np.maximum(0, rt - length_s * 0.4) * 14)
    return bandpass(noise(length), 1500, 7000) * env * 0.6


def crash(length_s=1.8, darkness=1.0):
    length = secs(length_s)
    rt = timeline(length)
    shimmer = sum(np.sign(np.sin(2 * np.pi * f * rt + i)) for i, f in enumerate((321, 447, 589, 742, 873, 1121, 1385)))
    body = highpass(shimmer * 0.15 + noise(length), 4500 / darkness)
    return body * np.exp(-rt * 2.2) * np.minimum(1, rt / 0.003) * 0.35


def filter_swoosh(rise_s=0.6, fall_s=0.2, q=4.0):
    """Noise through a resonant band-pass swept up to the cut, panned across, then falling away."""
    length = secs(rise_s + fall_s)
    rt = timeline(length)
    progress = np.clip(rt / rise_s, 0, 1)
    cutoff = np.where(rt < rise_s, 250 * (36**progress), 9000 * np.exp(-(rt - rise_s) * 6))
    swept = sweep_filter(noise(length), cutoff, q=q, kind="band")
    env = progress**1.8 * np.exp(-np.maximum(0, rt - rise_s) * 14)
    pan = np.clip(-0.8 + 1.6 * rt / (rise_s + fall_s), -1, 1)
    return np.stack([swept * env * np.sqrt((1 - pan) / 2), swept * env * np.sqrt((1 + pan) / 2)], axis=1) * 1.4


# ---------------------------------------------------------------- tonal voices

def pluck_string(note, length_s, brightness=0.6, damping=0.996):
    """Karplus-Strong string: a noise burst through a tuned, damped comb."""
    length = secs(length_s + 0.05)
    period = 44100 / midi_hz(note)
    delay = int(period)
    excitation = np.zeros(length)
    burst = lowpass(noise(delay), 1500 + 9000 * brightness)
    excitation[:delay] = burst
    a = np.zeros(delay + 2)
    a[0] = 1
    a[delay] = -damping / 2
    a[delay + 1] = -damping / 2
    out = lfilter([1.0], a, excitation)
    return out * release(length, length_s + 0.05, 0.04)


def guitar_chord(notes, length_s, brightness=0.6, strum=0.008, muted=False):
    out = np.zeros(secs(length_s + 0.2))
    for i, note in enumerate(notes):
        string = pluck_string(note, length_s, brightness, 0.985 if muted else 0.997)
        start = secs(i * strum)
        out[start : start + len(string)] += string[: len(out) - start]
    return highpass(out, 150) / len(notes)


def string_section(notes, length_s, attack=0.04):
    """Disco strings: two saws per note with slow vibrato, band-limited like an old sample."""
    length = secs(length_s + 0.15)
    rt = timeline(length)
    vibrato = 1 + 0.003 * np.sin(2 * np.pi * 5.2 * rt)
    voice = np.zeros(length)
    for note in notes:
        for detune, phase in ((1.003, 0.0), (0.997, 0.4)):
            voice += 2 * ((np.cumsum(midi_hz(note) * detune * vibrato) / 44100 + phase) % 1) - 1
    env = np.minimum(1, rt / attack) * release(length, length_s + 0.15, 0.15)
    return bandpass(voice / (2 * len(notes)), 300, 5000) * env


def formant_filter(source, vowel_from, vowel_to, morph=None, gains=(1.0, 0.55, 0.25)):
    morph = np.linspace(0, 1, len(source)) if morph is None else morph
    out = np.zeros(len(source))
    for index, (start, end), gain in zip(range(3), zip(VOWELS[vowel_from], VOWELS[vowel_to]), gains):
        centre = start + (end - start) * morph
        out += sweep_filter(source, centre, q=centre / (70 + 30 * index), kind="band", block=64) * gain
    return out


def talkbox(note, length_s, vowels, glide_from=None, vibrato=0.2):
    """A saw spoken through moving formants. `vowels` is the vowel path across the note."""
    length = secs(length_s + 0.06)
    rt = timeline(length)
    start_note = glide_from if glide_from is not None else note - 1
    semitones = note + (start_note - note) * np.exp(-rt * 35)
    semitones = semitones + vibrato * np.sin(2 * np.pi * 5.8 * rt) * np.clip((rt - 0.15) / 0.15, 0, 1)
    source = 2 * ((np.cumsum(midi_hz(semitones)) / 44100) % 1) - 1 + 0.05 * noise(length)
    out = np.zeros(length)
    segments = len(vowels) - 1
    for i in range(max(segments, 1)):
        begin, end = (i * length // max(segments, 1), (i + 1) * length // max(segments, 1))
        a, b = (vowels[i], vowels[min(i + 1, len(vowels) - 1)])
        part = formant_filter(source[begin:end], a, b)
        out[begin:end] = part
    env = np.minimum(1, rt / 0.012) * release(length, length_s + 0.06, 0.06)
    return np.tanh(out * env * 3.0)


def phaser(signal, rate_hz=0.25, depth=1.0, stages=4, mix=0.5, block=64, phase=0.0):
    """Swept first-order all-pass chain mixed with the dry signal (one channel)."""
    t_block = np.arange(0, len(signal), block) / 44100
    centre = 300 * (12 ** (depth * 0.5 * (1 + np.sin(2 * np.pi * rate_hz * t_block + phase))))
    wet = signal.astype(float).copy()
    for _ in range(stages):
        state = np.zeros(1)
        out = np.zeros_like(wet)
        for index, begin in enumerate(range(0, len(wet), block)):
            tangent = np.tan(np.pi * centre[index] / 44100)
            coefficient = (tangent - 1) / (tangent + 1)
            out[begin : begin + block], state = lfilter([coefficient, 1.0], [1.0, coefficient], wet[begin : begin + block], zi=state)
        wet = out
    return signal * (1 - mix) + wet * mix


# ---------------------------------------------------------------- V1 drum energy, for the M hybrids

def v1_kick():
    length = secs(0.42)
    kt = timeline(length)
    body = np.sin(2 * np.pi * np.cumsum(48 + 150 * np.exp(-kt * 38)) / 44100) * np.exp(-kt * 7.5)
    click = highpass(noise(length), 3000) * np.exp(-kt * 260) * 0.35
    return np.tanh((body + click) * 1.6)


def v1_snare():
    length = secs(0.22)
    st = timeline(length)
    return np.sin(2 * np.pi * 190 * st) * np.exp(-st * 30) * 0.5 + highpass(noise(length), 1500) * np.exp(-st * 22) * 0.7


def v1_hat(open_hat=False):
    length = secs(0.18 if open_hat else 0.045)
    ht = timeline(length)
    return highpass(noise(length), 7500) * np.exp(-ht * (22 if open_hat else 110))


def v1_tick():
    length = secs(0.012)
    return bandpass(noise(length), 2500, 9000) * np.exp(-timeline(length) * 420)


def v1_boom(gain=1.0, length_s=2.4):
    length = secs(length_s)
    bt = timeline(length)
    sub = np.sin(2 * np.pi * np.cumsum(32 + 90 * np.exp(-bt * 9)) / 44100) * np.exp(-bt * 1.8)
    air = lowpass(noise(length), 2400) * np.exp(-bt * 4.5) * 0.5
    return np.tanh((sub + air) * 1.4) * gain


def v1_drums(drums, place, cues, roll_gain=1.0, disco_hats=False):
    """The V1 drum arrangement, with claps on the beat grid. Returns the kick times.

    `cues` is the music_lab module. disco_hats swaps the plain hats for 808-style metal hats with a shuffle.
    """
    DROP, BEAT, NIGHT, FINALE, LAST_HIT, T = cues.DROP, cues.BEAT, cues.NIGHT, cues.FINALE, cues.LAST_HIT, cues.T
    kick_times = []
    for i in range(16):
        time = DROP - BEAT * 2 + i * (BEAT / 8)
        place(drums, v1_tick(), time, gain=0.03 + 0.15 * (i / 15), pan=0.4 if i % 2 else -0.4)
    for time, k in cues.grid(DROP, LAST_HIT + 0.01, BEAT):
        if (NIGHT[0] <= time < NIGHT[1] and k % 2) or FINALE - 0.5 <= time < FINALE:
            continue
        kick_times.append(time)
        place(drums, v1_kick(), time, gain=0.95)
    clap_from = T(3.0)
    for time, k in cues.grid(clap_from, LAST_HIT, BEAT):
        if k % 2 == 0 or NIGHT[0] <= time < NIGHT[1]:
            continue
        if T(7.0) - 0.5 <= time < T(7.0) or FINALE - 1.0 <= time < FINALE:
            continue
        place(drums, handclap(0.011, 3) * 0.8, time, gain=0.55)
    tail = handclap(0.011, 3) * 0.8
    place(drums, tail, T(19.0), gain=0.7)
    for repeat in range(1, 5):
        place(drums, tail, T(19.0) + repeat * BEAT * 0.75, gain=0.7 * 0.45**repeat, pan=0.5 if repeat % 2 else -0.5)
    for time, k in cues.grid(DROP, LAST_HIT + 0.01, BEAT / 4):
        swing = 0.03 if (disco_hats and k % 2) else 0.0
        if k % 4 == 2:
            hat = metal_hat(True) if disco_hats else v1_hat(True)
            place(drums, hat, time, gain=0.22 if disco_hats else 0.13, pan=0.25)
        elif time >= T(3.0) and not NIGHT[0] <= time < NIGHT[1]:
            hat = metal_hat() if disco_hats else v1_hat()
            place(drums, hat, time + swing, gain=(0.07 + (0.04 if k % 2 == 0 else 0.0)) * (1.6 if disco_hats else 1), pan=-0.2)
    for roll_start, roll_end in ((T(7.0) - 0.5, T(7.0)), (T(12.0) - 0.5, T(12.0)), (FINALE - 1.0, FINALE)):
        count = int(round((roll_end - roll_start) / (BEAT / 8)))
        for i in range(count):
            progress = i / count
            if progress < 0.5 and i % 2:
                continue
            place(drums, v1_snare(), roll_start + i * (BEAT / 8), gain=(0.18 + 0.5 * progress) * roll_gain, pan=0.15)
    for time, gain, length in ((DROP, 0.8, 2.4), (T(9.0), 0.6, 1.4), (FINALE, 0.95, 3.0), (LAST_HIT, 0.55, 1.2)):
        place(drums, v1_boom(1.0, length), time, gain=gain * 0.8)
    return kick_times


def kick_duck(kick_times, samples, depth=0.2, recovery=0.12):
    """Light, musical kick ducking (a French-touch compressor feel), far shallower than an EDM pump."""
    gain = np.ones(samples)
    length = secs(recovery * 2.5)
    curve = 1 - depth * np.exp(-timeline(length) / recovery * 2.5) * np.minimum(1, timeline(length) / 0.004 + 0.3)
    for time in kick_times:
        begin = secs(time)
        end = min(samples, begin + length)
        gain[begin:end] = np.minimum(gain[begin:end], curve[: end - begin])
    return gain
