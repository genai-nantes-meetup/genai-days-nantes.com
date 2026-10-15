# /// script
# dependencies = ["numpy", "scipy"]
# ///
"""Variant B1, "Filter house": the late-90s Paris filtered-disco loop.

A one-bar "sampled" disco phrase (strings, muted guitar stabs and its own bass) repeats like a sample
and goes through one slow, wide filter: low-pass opening across the whole film, a high-pass thinning
during the night, then fully open on the finale. A phaser drifts on top. Four on the floor with a
swung shuffle hat. Cue sheet and T() mapping come from music_lab, so every hit stays on the picture.
"""
import numpy as np

from french_kit import (
    disco_kick, filter_swoosh, guitar_chord, handclap, humanize, metal_hat, phaser, pluck_string, crash,
    snare_body, string_section, tambourine,
)
from music_lab import (
    BAR, BEAT, CUT_HITS, DROP, DURATION, FINALE, GLITCH, LAND_HITS, LAST_HIT, LAYS, NIGHT, T,
    TRANSITION_PEAKS, WORD_HITS, bar_index, echo, grid, highpass, lowpass, master, midi_hz, new_bus,
    noise, place, place_clock_foley, place_intro_foley, place_peels, reverb, room_ir, samples, secs, sweep_filter, t, timeline,
)

drums = new_bus()
loop = new_bus()
fx = new_bus()

# D minor disco: Dm9, G9, Bbmaj7, A7sus4 to A7.
CHORDS = [[50, 53, 57, 60, 64], [47, 53, 57, 62], [46, 53, 57, 62], [45, 52, 55, 62]]
FINALE_CHORDS = [[46, 53, 57, 62], [45, 52, 55, 61], [50, 53, 57, 60, 64], [47, 53, 57, 62]]
# Muted guitar stabs in the phrase, (beat, length in beats, velocity).
GUITAR = [(0.5, 0.2, 0.9), (1.25, 0.15, 0.5), (1.5, 0.2, 0.8), (2.5, 0.2, 0.9), (3.25, 0.15, 0.5), (3.5, 0.25, 0.85)]
# Bass inside the sample, (beat, interval, length in beats).
SAMPLE_BASS = [(0, 0, 0.4), (0.5, 12, 0.25), (1.0, 0, 0.4), (1.5, 12, 0.25), (2.0, 0, 0.4), (2.5, 12, 0.25),
               (3.0, 10, 0.3), (3.5, 12, 0.25)]


def chord_at(time):
    if time >= FINALE:
        return FINALE_CHORDS[int((time - FINALE + 1e-6) // BAR) % 4]
    return CHORDS[bar_index(time) % 4]


def sample_bass(note, length_s):
    length = secs(length_s + 0.03)
    rt = timeline(length)
    freq = midi_hz(note)
    tone = np.sin(2 * np.pi * freq * rt) + 0.35 * np.sin(4 * np.pi * freq * rt) * np.exp(-rt * 8)
    return tone * np.minimum(1, rt / 0.004) * np.clip((length_s + 0.03 - rt) / 0.03, 0, 1)


def build_phrase(chord):
    """One bar of the 'record': rendered once per chord and then looped like a sample."""
    phrase = np.zeros((secs(BAR + 0.4), 2))

    def add(signal, start, gain, pan):
        begin = secs(start)
        end = min(len(phrase), begin + len(signal))
        phrase[begin:end, 0] += signal[: end - begin] * gain * np.sqrt(1 - pan)
        phrase[begin:end, 1] += signal[: end - begin] * gain * np.sqrt(1 + pan)

    strings = string_section([n + 12 for n in chord[1:]], BAR * 0.95, attack=0.08)
    add(strings * (1 - 0.35 * np.sin(np.pi * np.clip(timeline(len(strings)) / BAR, 0, 1))), 0, 0.5, -0.3)
    for beat, length, velocity in GUITAR:
        stab = guitar_chord([n + 12 for n in chord[1:4]], length * BEAT, 0.7, muted=True)
        add(stab, beat * BEAT, 0.9 * velocity, 0.35)
    for beat, interval, length in SAMPLE_BASS:
        add(sample_bass(chord[0] - 12 + interval, length * BEAT), beat * BEAT, 0.45, 0)
    return phrase


phrases = {}
for bar_start, _ in grid(DROP, LAST_HIT, BAR):
    if FINALE - BEAT <= bar_start < FINALE:
        continue
    chord = chord_at(bar_start + 0.01)
    key = tuple(chord)
    if key not in phrases:
        phrases[key] = build_phrase(chord)
    phrase = phrases[key]
    begin = secs(bar_start)
    end = min(samples, begin + len(phrase), secs(LAST_HIT))
    if bar_start + BAR > FINALE - BEAT and bar_start < FINALE:
        end = min(end, secs(FINALE - BEAT))
    loop[begin:end] += phrase[: end - begin]

# The chop: a sixteenth of the record repeated four times.
chop = secs(BEAT / 4)
begin = secs(GLITCH)
segment = loop[begin : begin + chop].copy() * np.minimum(1, np.arange(chop) / 80)[:, None]
for i in range(4):
    loop[begin + i * chop : begin + (i + 1) * chop] = segment

# ---------------------------------------------------------------- the filter is the arc of the film

low_pass = np.full(samples, 300.0)
anchors = [(DROP, 260), (T(3.0), 450), (T(7.0), 900), (T(9.0), 1300), (T(12.0), 1900), (T(15.0), 2600),
           (NIGHT[0], 3200), (NIGHT[1], 3000), (FINALE - BEAT, 9000), (FINALE, 16000), (DURATION, 16000)]
times, values = zip(*anchors)
low_pass = np.exp(np.interp(t, times, np.log(values)))
low_pass *= 1 + 0.18 * np.sin(2 * np.pi * t / (2 * BAR))
for time in CUT_HITS:
    mask = (t >= time) & (t < time + BEAT * 1.5)
    low_pass[mask] = np.maximum(low_pass[mask], 9000 * np.exp(-(t[mask] - time) * 3))
high_pass = np.full(samples, 30.0)
night = (t >= NIGHT[0]) & (t < NIGHT[1])
high_pass[night] = 200 * (6 ** np.sin(np.pi * (t[night] - NIGHT[0]) / (NIGHT[1] - NIGHT[0])))
for c in range(2):
    channel = sweep_filter(loop[:, c], low_pass, q=1.5, stages=2)
    channel = sweep_filter(channel, high_pass, q=0.9, kind="high")
    loop[:, c] = phaser(channel, rate_hz=0.18, depth=1.0, mix=0.45, phase=c * 1.3)

# ---------------------------------------------------------------- drums

GROOVE_START = T(3.0)
SWING = 0.04  # late sixteenths: the shuffle

for time, k in grid(DROP, LAST_HIT + 0.01, BEAT):
    if FINALE - BEAT <= time < FINALE:
        continue
    if NIGHT[0] <= time < NIGHT[1] and k % 2:
        continue
    place(drums, disco_kick(), time, gain=0.92)
for time, k in grid(GROOVE_START, LAST_HIT, BEAT):
    if k % 2 and not NIGHT[0] <= time < NIGHT[1] and not FINALE - BEAT <= time < FINALE:
        place(drums, handclap() * 0.7 + snare_body() * 0.6, humanize(time, 0.003), gain=0.48)
for time, k in grid(DROP, LAST_HIT, BEAT / 4):
    step = k % 4
    if FINALE - BEAT <= time < FINALE:
        continue
    swing = SWING if step % 2 else 0.0
    if step == 2:
        place(drums, metal_hat(open_hat=True), humanize(time, 0.003), gain=0.3, pan=0.3)
    elif time >= GROOVE_START and not NIGHT[0] <= time < NIGHT[1]:
        accent = 1.0 if step == 0 else 0.65
        place(drums, metal_hat(), humanize(time + swing, 0.003), gain=0.2 * accent, pan=-0.3)
    if (T(12.0) <= time < NIGHT[0] or time >= FINALE) and step in (1, 3):
        place(drums, tambourine(), humanize(time + swing, 0.004), gain=0.2, pan=0.55)

# ---------------------------------------------------------------- hits and transitions

for time in WORD_HITS:
    place(fx, guitar_chord([n + 12 for n in chord_at(time)[1:4]], 0.12, 0.9, muted=True), time, gain=0.5, pan=0.25)
for time in LAND_HITS:
    place(fx, pluck_string(chord_at(time)[-1] + 12, 0.4, 0.8), time, gain=0.35, pan=-0.3)
for peak in TRANSITION_PEAKS:
    place(fx, filter_swoosh(0.7, 0.2, q=3.0), peak - 0.7, gain=0.26)
for time in CUT_HITS:
    place(fx, crash(1.6), time, gain=0.45, pan=0.2)
for time in LAYS:
    place(fx, metal_hat(), time + 0.28, gain=0.3, pan=0.2)

place(fx, filter_swoosh(1.0, 0.3, q=3.0), FINALE - 1.0, gain=0.45)
place(fx, crash(3.0), FINALE, gain=0.7, pan=-0.2)
place(drums, disco_kick(), FINALE, gain=1.0)
ring = DURATION - LAST_HIT
final = string_section([50, 57, 62, 65, 69, 74], ring - 0.2, attack=0.01)
final *= np.exp(-timeline(len(final)) * 0.9)
place(fx, final, LAST_HIT, gain=0.5)
place(fx, guitar_chord([62, 65, 69, 74], 1.5, 0.9), LAST_HIT, gain=0.6, pan=0.3)
place(fx, sample_bass(38, ring * 0.7), LAST_HIT, gain=0.5)
place(fx, crash(3.0), LAST_HIT, gain=0.55, pan=0.2)
place(drums, disco_kick(), LAST_HIT, gain=0.95)

place_intro_foley(fx)
place_clock_foley(fx)
place_peels(fx)

# ---------------------------------------------------------------- mix

room = room_ir(1.2, 5.0, 7000)
loop = echo(loop, BEAT * 0.75, 0.3, 0.1, repeats=3, tone=3000)
loop = reverb(loop, room, 0.12)
drums = reverb(drums, room_ir(0.4, 14, 8000), 0.1)
fx = reverb(fx, room, 0.18)

mix = drums * 0.9 + loop * 1.25 + fx
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
master(mix, "music-B1.wav")
