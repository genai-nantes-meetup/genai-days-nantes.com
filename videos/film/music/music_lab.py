"""Shared cue sheet, DSP helpers and mastering for the music-lab variants (music_M1.py to music_M4.py, music_B1.py).

Sync mechanism: the cue sheet is written in source seconds and T() maps it to
output seconds with the reading holds from tools/holds.json, so every variant follows the picture.
No stock samples: every sound is synthesized here, except the brand's own peeling-sticker.mp3.
"""
import json
import re
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d
from scipy.signal import butter, fftconvolve, lfilter, resample_poly, sosfilt

ROOT = Path(__file__).resolve().parents[1]
SAMPLE_RATE = 44100
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
DROP = 1.0

HOLDS = json.loads((ROOT / "tools/holds.json").read_text())["holds"]


def T(x):
    return x + sum(extra for at, extra in HOLDS if x >= at)


def S(y):
    shift = 0.0
    for at, extra in HOLDS:
        if y < at + shift:
            break
        if y < at + shift + extra:
            return at
        shift += extra
    return y - shift


DURATION = T(28.0)
samples = int(DURATION * SAMPLE_RATE)
t = np.arange(samples) / SAMPLE_RATE

# Edit points, kept in sync with T() (kept in sync with the scene table in index.html).
CUT_HITS = [T(x) for x in (3.0, 7.0, 9.0, 12.0, 15.0, 18.0, 20.0)]
WORD_HITS = [T(x) for x in (3.5, 4.0, 4.5, 5.0, 5.75, 7.5, 8.0, 8.5)]
LAND_HITS = [T(x) for x in (12.4, 16.0, 18.55, 19.18, 22.35, 22.6, 22.85, 25.5, 26.0, 26.5)]
FINALE_SRC = 22.0
FINALE = T(FINALE_SRC)
LAST_HIT = T(27.0)
NIGHT = (T(18.0), T(20.0))
# v6 r6: the S1 hero pass has its own label-press foley (place_intro_foley), so it left LAYS.
LAYS = [T(x) for x in [12.4, 15.5]]
# Peak-velocity frame of each transition (where the V1 score peaked its whooshes).
TRANSITION_PEAKS = [T(x) for x in (2.9, 6.8, 8.95, 11.9, 14.9, 17.95, 21.9)]
GLITCH = T(6.0)
# v6 r6: the S1 pass stays stuck, only the château poster is peeled off (S6 to S7).
PEELS = [T(17.5)]

RNG = np.random.default_rng(1117)


def midi_hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def secs(n_seconds):
    return int(n_seconds * SAMPLE_RATE)


def timeline(length):
    return np.arange(length) / SAMPLE_RATE


def noise(length):
    return RNG.standard_normal(length)


def lowpass(signal, cutoff, order=2):
    sos = butter(order, min(cutoff, SAMPLE_RATE / 2 - 100), btype="low", fs=SAMPLE_RATE, output="sos")
    return sosfilt(sos, signal, axis=0)


def highpass(signal, cutoff, order=2):
    sos = butter(order, cutoff, btype="high", fs=SAMPLE_RATE, output="sos")
    return sosfilt(sos, signal, axis=0)


def bandpass(signal, low, high, order=2):
    sos = butter(order, [low, min(high, SAMPLE_RATE / 2 - 100)], btype="band", fs=SAMPLE_RATE, output="sos")
    return sosfilt(sos, signal, axis=0)


def biquad(kind, cutoff, q):
    w0 = 2 * np.pi * min(max(cutoff, 20), SAMPLE_RATE * 0.45) / SAMPLE_RATE
    alpha = np.sin(w0) / (2 * q)
    cos = np.cos(w0)
    if kind == "low":
        b = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2]
    elif kind == "high":
        b = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2]
    else:
        b = [alpha, 0.0, -alpha]
    a = [1 + alpha, -2 * cos, 1 - alpha]
    return np.array(b) / a[0], np.array(a) / a[0]


def sweep_filter(signal, cutoffs, q=0.707, kind="low", block=32, stages=1):
    """Time-varying resonant biquad. `cutoffs` and `q` hold one value per sample (or a scalar)."""
    cutoffs = np.broadcast_to(np.asarray(cutoffs, dtype=float), signal.shape[:1])
    qs = np.broadcast_to(np.asarray(q, dtype=float), signal.shape[:1])
    out = signal.astype(float).copy()
    for stage in range(stages):
        state = np.zeros(2)
        result = np.zeros_like(out)
        for begin in range(0, len(out), block):
            b, a = biquad(kind, cutoffs[begin], qs[begin] if stage == 0 else 0.707)
            result[begin : begin + block], state = lfilter(b, a, out[begin : begin + block], zi=state)
        out = result
    return out


def place(bus, signal, start, gain=1.0, pan=0.0):
    """Mono or stereo signal into a stereo bus, equal-power pan."""
    begin = int(round(start * SAMPLE_RATE))
    if begin >= samples or begin + len(signal) <= 0:
        return
    offset = max(0, -begin)
    begin = max(0, begin)
    end = min(samples, begin + len(signal) - offset)
    chunk = signal[offset : offset + end - begin] * gain
    if chunk.ndim == 2:
        bus[begin:end] += chunk
        return
    bus[begin:end, 0] += chunk * np.sqrt((1 - pan) / 2) * np.sqrt(2)
    bus[begin:end, 1] += chunk * np.sqrt((1 + pan) / 2) * np.sqrt(2)


def new_bus():
    return np.zeros((samples, 2))


def grid(start, end, step):
    """Positions on the output beat grid (anchored on DROP) in [start, end)."""
    first = int(np.ceil((start - DROP) / step - 1e-6))
    last = int(np.ceil((end - DROP) / step - 1e-6))
    return [(DROP + k * step, k) for k in range(first, last)]


def bar_index(time):
    return int((time - DROP + 1e-6) // BAR)


def room_ir(length_s, decay, brightness, predelay=0.012):
    """Synthetic stereo reverb impulse: decorrelated decaying noise, darker over time."""
    length = secs(length_s)
    rt = timeline(length)
    channels = []
    for _ in range(2):
        tail = noise(length) * np.exp(-rt * decay)
        dark = lowpass(tail, brightness * 0.25)
        mix = np.clip(rt / length_s * 2, 0, 1)
        tail = lowpass(tail, brightness) * (1 - mix) + dark * mix
        tail[: secs(predelay)] = 0
        channels.append(tail)
    ir = np.stack(channels, axis=1)
    return ir / np.sqrt(np.sum(ir**2) / 2)


def reverb(bus, ir, wet):
    tail = np.stack([fftconvolve(bus[:, c], ir[:, c])[: len(bus)] for c in range(2)], axis=1)
    return bus + tail * wet


def echo(bus, delay_s, feedback, wet, repeats=6, pingpong=True, tone=4000):
    """Tape-ish feedback delay: each repeat is darker, optionally bouncing between channels."""
    delay = secs(delay_s)
    out = bus.copy()
    tap = bus
    for repeat in range(1, repeats + 1):
        tap = lowpass(tap, tone)
        shifted = np.zeros_like(bus)
        shifted[delay * repeat :] = tap[: len(bus) - delay * repeat]
        if pingpong and repeat % 2:
            shifted = shifted[:, ::-1]
        out += shifted * wet * feedback ** (repeat - 1)
    return out


def load_audio(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-"],
        check=True,
        capture_output=True,
    ).stdout
    signal = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    return signal / (np.max(np.abs(signal)) + 1e-9)


def peak_time(signal):
    envelope = lowpass(np.abs(signal), 30)
    return int(np.argmax(envelope)) / SAMPLE_RATE


def place_peels(bus, gain=0.55):
    """The brand's own peel sound on every peel (17.5: the château poster comes off the wall)."""
    peel = load_audio(ROOT / "assets/audio/peeling-sticker.mp3")
    for time in PEELS:
        place(bus, peel, time + 0.2 - peak_time(peel), gain=gain, pan=0.25)


# ---------------------------------------------------------------- mastering

def measure(path):
    """Integrated loudness (LUFS) and true peak (dBTP) via ffmpeg ebur128."""
    log = subprocess.run(
        ["ffmpeg", "-nostats", "-i", str(path), "-filter_complex", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True,
        text=True,
    ).stderr
    summary = log[log.rfind("Summary:") :]
    integrated = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
    true_peak = float(re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS", summary).group(1))
    return integrated, true_peak


def limit(mix, ceiling_db):
    """Lookahead brickwall on the 4x oversampled peak, smooth gain so it never overshoots."""
    ceiling = 10 ** (ceiling_db / 20)
    oversampled = resample_poly(mix, 4, 1, axis=0)
    peak = np.abs(oversampled).max(axis=1)[: len(mix) * 4].reshape(len(mix), 4).max(axis=1)
    gain = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    half = secs(0.006)
    gain = minimum_filter1d(gain, size=2 * half + 1)
    kernel = np.hanning(2 * half + 3)[1:-1]
    gain = np.convolve(gain, kernel / kernel.sum(), mode="same")
    return mix * gain[:, None]


def write_wav(path, mix):
    path.parent.mkdir(parents=True, exist_ok=True)
    dither = (RNG.random(mix.shape) - RNG.random(mix.shape)) / 32768
    data = np.clip(mix + dither, -1, 1)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes((data * 32767).astype(np.int16).tobytes())


def master(mix, out_name, target_lufs=-14.0, ceiling_db=-2.0):
    """Fade, loudness-match to target LUFS and brickwall the true peak, then report ffmpeg's numbers."""
    mix = highpass(mix, 24)
    mix *= np.clip((DURATION - t) / 0.9, 0, 1)[:, None]
    mix /= np.max(np.abs(mix))
    scratch = Path(tempfile.mkdtemp())
    for _ in range(6):
        probe = scratch / "probe.wav"
        wavfile.write(probe, SAMPLE_RATE, limit(mix, ceiling_db).astype(np.float32))
        integrated, _ = measure(probe)
        if abs(integrated - target_lufs) < 0.15:
            break
        mix *= 10 ** ((target_lufs - integrated) / 20)
    out = ROOT / "assets/audio" / out_name
    write_wav(out, limit(mix, ceiling_db))
    integrated, true_peak = measure(out)
    print(f"wrote {out} ({DURATION}s) {integrated} LUFS, {true_peak} dBTP")
    return integrated, true_peak


# ---------------------------------------------------------------- S1 screen print foley (v6 r6, same sync as the V1 score)
# Two squeegee coats, the second ending on the drop, then the hero pass pressed on at 2.2 s and smoothed.
# User feedback "too violent" (squeegee only): the coats are now a soft papery brush, no rubber mesh buzz,
# no low drag, slow edges, about 10 dB down. The label stick and smoothing are unchanged.
COATS = [(0.08, 0.42, 0.15), (DROP - 0.4, 0.4, 0.1)]  # start, duration (power1.inOut), gain
STICK = 2.2  # the pass drops flat on frame 66
SMOOTH = (2.22, 0.25)
PASS_PAN = 0.6


def place_curve(bus, signal, start, gain, pans):
    begin = int(round(start * SAMPLE_RATE))
    end = min(samples, begin + len(signal))
    chunk = signal[: end - begin] * gain
    pan = pans[: end - begin]
    bus[begin:end, 0] += chunk * np.sqrt((1 - pan) / 2) * np.sqrt(2)
    bus[begin:end, 1] += chunk * np.sqrt((1 + pan) / 2) * np.sqrt(2)


def swept_bandpass(signal, lows, highs, block=512):
    out = np.zeros(len(signal))
    for i in range(0, len(signal), block):
        piece = signal[i : i + block + 256]
        out[i : i + block] = bandpass(piece, lows[i], highs[i])[: len(out[i : i + block])]
    return out


def squeegee_curves(duration):
    length = secs(duration)
    progress = np.arange(length) / length
    eased = np.where(progress < 0.5, 2 * progress**2, 1 - (-2 * progress + 2) ** 2 / 2)
    speed = np.where(progress < 0.5, progress, 1 - progress) * 2
    pan = np.clip((-120 + 2110 * eased + 27 - 960) / 960, -0.9, 0.9) * 0.7
    return speed, pan


def squeegee_scrape(speed):
    """A soft brush over paper: a band of air that brightens a little with the blade speed, slow edges."""
    length = len(speed)
    brush = swept_bandpass(noise(length), 1400 + 900 * speed, 4200 + 3000 * speed)
    grain = 0.85 + 0.15 * lowpass(RNG.random(length), 60)
    edge = np.minimum(1, np.arange(length) / secs(0.06)) * np.minimum(1, (length - np.arange(length)) / secs(0.06))
    return brush * grain * speed**1.2 * edge


def label_press():
    length = secs(0.3)
    st = timeline(length)
    attack = np.minimum(1, st / 0.0015)
    thud = np.sin(2 * np.pi * np.cumsum(70 + 50 * np.exp(-st * 60)) / SAMPLE_RATE) * np.exp(-st * 28)
    muffle = lowpass(noise(length), 220, order=4) * np.exp(-st * 40) * 2.0
    tack = np.zeros(length)
    for offset, level in ((0.0, 1.0), (0.007, 0.55), (0.016, 0.4), (0.028, 0.22)):
        begin = secs(offset)
        click = bandpass(noise(secs(0.004)), 1800, 7000) * np.exp(-timeline(secs(0.004)) * 900)
        tack[begin : begin + len(click)] += click * level
    return np.tanh((thud * 0.9 + muffle * 0.6) * attack * 1.4) + tack * 0.8


def thumb_swipe(duration):
    length = secs(duration)
    speed = 1 - np.arange(length) / length
    rub = swept_bandpass(noise(length), 900 + 900 * speed, 3000 + 4000 * speed)
    return rub * speed**1.2 * np.minimum(1, np.arange(length) / secs(0.006))


def place_intro_foley(bus):
    for start, duration, gain in COATS:
        speed, pan = squeegee_curves(duration)
        place_curve(bus, squeegee_scrape(speed), start, gain, pan)
    place(bus, label_press(), STICK, gain=0.55, pan=PASS_PAN)
    smooth_pan = PASS_PAN - 0.12 + 0.24 * np.linspace(0, 1, secs(SMOOTH[1]))
    place_curve(bus, thumb_swipe(SMOOTH[1]), SMOOTH[0], 0.16, smooth_pan)


# ---------------------------------------------------------------- disco ball drop (S7 clock)

def disco_shimmer(length_s=0.9):
    """A short glittery shimmer: a cloud of tiny high bell grains thinning out, no low end."""
    length = secs(length_s)
    out = np.zeros((length, 2))
    grain_length = secs(0.05)
    gt = timeline(grain_length)
    for _ in range(48):
        onset = (RNG.random() ** 1.8) * (length_s - 0.06)
        freq = 2600 * 2 ** (RNG.random() * 2.2)
        grain = np.sin(2 * np.pi * freq * gt) * np.exp(-gt * 70) * (1 - onset / length_s)
        begin = secs(onset)
        pan = RNG.uniform(-0.8, 0.8)
        out[begin : begin + grain_length, 0] += grain * np.sqrt((1 - pan) / 2)
        out[begin : begin + grain_length, 1] += grain * np.sqrt((1 + pan) / 2)
    air = highpass(noise(length), 6000) * np.exp(-timeline(length) * 6) * 0.08
    out += air[:, None]
    return out / np.max(np.abs(out))


def place_disco_ball(bus, arrival, gain=0.12):
    """Discreet shimmer landing on the ball's arrival (the first grains hit on the frame)."""
    place(bus, disco_shimmer(), arrival, gain=gain)


# ---------------------------------------------------------------- S7 "temps forts" clock foley
# Same restrained palette as the softened squeegee and the label stick: small, papery and mechanical,
# no low thud, levels under the music. Cue times arrive in source seconds and go through T().

def tiny_click(bright=1.0, length_s=0.004):
    length = secs(length_s)
    return bandpass(noise(length), 1800 * bright, min(6500 * bright, 16000)) * np.exp(-timeline(length) * 900)


def clock_appear():
    """The clock settling in: two soft mechanical clicks over a faint wooden knock."""
    length = secs(0.12)
    st = timeline(length)
    out = bandpass(noise(length), 300, 1200) * np.exp(-st * 60) * 0.35
    for offset, level in ((0.0, 1.0), (0.035, 0.6)):
        click = tiny_click(0.9)
        begin = secs(offset)
        out[begin : begin + len(click)] += click * level
    return out


EASES = {
    "linear": lambda p: p,
    "power2.inOut": lambda p: np.where(p < 0.5, 2 * p**2, 1 - (-2 * p + 2) ** 2 / 2),
    "power3.inOut": lambda p: np.where(p < 0.5, 4 * p**3, 1 - (-2 * p + 2) ** 3 / 2),
    "power3.out": lambda p: 1 - (1 - p) ** 3,
}


def ease_speed(length, ease):
    """Normalized speed (0 to 1) of a GSAP ease over `length` samples."""
    position = EASES[ease](np.arange(length) / max(length - 1, 1))
    speed = np.gradient(position)
    return speed / max(speed.max(), 1e-12)


def hand_sweep(duration, ease="power2.inOut"):
    """A light ratchet run: tick rate and level follow the hand speed across the sweep."""
    length = secs(duration)
    speed = ease_speed(length, ease)
    rate = 10 + 46 * speed
    phase = np.cumsum(rate) / SAMPLE_RATE
    out = np.zeros(length)
    for tick_index in np.flatnonzero(np.diff(np.floor(phase)) > 0):
        click = tiny_click(1.1 + 0.1 * RNG.random()) * (0.35 + 0.65 * speed[tick_index]) * RNG.uniform(0.8, 1.0)
        end = min(length, tick_index + len(click))
        out[tick_index:end] += click[: end - tick_index]
    return out


def hand_stop():
    """The hand landing on a time: a firm but soft muted clunk with one tick on top."""
    length = secs(0.14)
    st = timeline(length)
    knock = bandpass(noise(length), 250, 1400) * np.exp(-st * 45) * np.minimum(1, st / 0.003)
    click = tiny_click(1.0)
    knock[: len(click)] += click * 0.7
    return knock


def label_tap():
    """A highlight label appearing: a tiny paper or marker tap."""
    length = secs(0.04)
    st = timeline(length)
    return bandpass(noise(length), 900, 3500) * np.exp(-st * 140) * np.minimum(1, st / 0.002)


def logo_pop():
    """A partner logo popping in: a tiny soft rounded pop, lighter than a label tap."""
    length = secs(0.05)
    st = timeline(length)
    body = np.sin(2 * np.pi * np.cumsum(900 + 700 * np.exp(-st * 120)) / SAMPLE_RATE) * np.exp(-st * 90)
    return body * np.minimum(1, st / 0.003) + bandpass(noise(length), 2000, 6000) * np.exp(-st * 300) * 0.15


def arc_swish(duration):
    """The orange arc filling: a soft swish rising in pitch and level, then a quick fade."""
    length = secs(duration + 0.12)
    st = timeline(length)
    progress = np.clip(st / duration, 0, 1)
    swish = swept_bandpass(noise(length), 700 + 1800 * progress, 2400 + 4500 * progress)
    env = progress**1.5 * np.exp(-np.maximum(0, st - duration) * 30) * np.minimum(1, st / 0.03)
    return swish * env


def ball_creak(duration, ease="power3.out"):
    """The disco ball dropping on its string: a small stick-slip creak, faster while the ball falls fast."""
    length = secs(duration)
    st = timeline(length)
    speed = ease_speed(length, ease)
    rate = 45 + 70 * speed + 8 * np.sin(2 * np.pi * 3.1 * st)
    phase = np.cumsum(rate) / SAMPLE_RATE
    pulses = (np.diff(np.floor(phase), prepend=0) > 0).astype(float) * RNG.uniform(0.5, 1.0, length)
    creak = sweep_filter(pulses, 1500 + 400 * np.sin(2 * np.pi * 2.3 * st), q=6, kind="band")
    env = np.minimum(1, st / 0.05) * np.clip((duration - st) / 0.08, 0, 1) * (0.4 + 0.6 * speed)
    return creak * env * 4


# S7 clock cues from index.html, in source seconds. Tweens run in real time from their mapped start, so
# durations are output seconds. Cues inside the 21.495 hold are given directly in output seconds.
CLOCK_CUES = {
    "appear": 18.05,
    "sweeps": [(18.3, 0.7, "power3.inOut"), (19.55, 0.65, "power3.inOut"), (21.2, 0.9, "power2.inOut")],
    "stops": [19.0, 20.2],
    "stops_output": [32.35],  # 22:00, end of sweep 3, inside the 21.495 hold
    "labels": [19.0, 20.2, 21.0],
    "logo_pops": [20.55],  # Clever Cloud, next to Podcast
    "arc": (21.2, 0.9),
    "ball_drop": (21.2, 0.7, "power3.out"),
    "ball_arrival_output": 32.15,
    # Sway peaks during the hold, output seconds (they sit inside the 21.495 hold, so T() cannot reach them).
    "sway_peaks_output": [(32.43, 1.0), (33.73, 0.5)],
}


def place_clock_foley(bus, cues=CLOCK_CUES):
    """S7 "temps forts": every cue time in source seconds through T(), durations in output seconds."""
    if "appear" in cues:
        place(bus, clock_appear(), T(cues["appear"]), gain=0.25)
    for start, duration, ease in cues.get("sweeps", []):
        place(bus, hand_sweep(duration, ease), T(start), gain=0.2, pan=-0.1)
    for time in cues.get("stops", []):
        place(bus, hand_stop(), T(time), gain=0.3)
    for time in cues.get("stops_output", []):
        place(bus, hand_stop(), time, gain=0.3)
    for time in cues.get("labels", []):
        place(bus, label_tap(), T(time), gain=0.2, pan=0.3)
    for time in cues.get("logo_pops", []):
        place(bus, logo_pop(), T(time), gain=0.07, pan=0.35)
    if "arc" in cues:
        start, duration = cues["arc"]
        place(bus, arc_swish(duration), T(start), gain=0.1, pan=0.2)
    if "ball_drop" in cues:
        start, duration, ease = cues["ball_drop"]
        place(bus, ball_creak(duration, ease), T(start), gain=0.45, pan=-0.2)
    if "ball_arrival" in cues:
        place_disco_ball(bus, T(cues["ball_arrival"]))
    if "ball_arrival_output" in cues:
        place_disco_ball(bus, cues["ball_arrival_output"])
    for peak, strength in cues.get("sway_peaks_output", []):
        # A very faint creak of the string turning back, centred on the sway peak.
        place(bus, ball_creak(0.3, "power2.inOut"), peak - 0.15, gain=0.16 * strength, pan=-0.2)
