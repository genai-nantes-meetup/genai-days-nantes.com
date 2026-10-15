# /// script
# dependencies = ["numpy", "scipy"]
# ///
"""Hybrid M1, "B1 + énergie V1": B1's looped disco phrase and filter arc, driven by the original score.

The record loop (strings, muted guitar, octave bass) and its slow filter arc come from music_B1.py.
The drums and arrangement come from the V1 score: 16th hats from the tagline, claps on 2 and 4, snare rolls
into 7 s, 12 s and the finale, half-time night, booms on the drops and the finale chord ring-out.
A light kick ducking on the loop gives the French compressor feel, never an EDM pump.
score(arc="dj") is reused by music_M3.py for the DJ-style filter.
"""
import numpy as np

import music_lab as cues
from french_kit import (
    crash, filter_swoosh, guitar_chord, kick_duck, metal_hat, phaser, pluck_string, string_section, tambourine,
    v1_drums, v1_snare,
)
from music_lab import (
    BAR, BEAT, CUT_HITS, DROP, DURATION, FINALE, GLITCH, LAND_HITS, LAST_HIT, LAYS, NIGHT, T,
    TRANSITION_PEAKS, WORD_HITS, bar_index, echo, grid, master, midi_hz, new_bus, place, place_clock_foley, place_intro_foley,
    place_peels, reverb, room_ir, samples, secs, sweep_filter, t, timeline,
)

# D minor disco (as B1): Dm9, G9, Bbmaj7, A7sus4. Finale: Bbmaj7, A7, Dm9, G9.
CHORDS = [[50, 53, 57, 60, 64], [47, 53, 57, 62], [46, 53, 57, 62], [45, 52, 55, 62]]
FINALE_CHORDS = [[46, 53, 57, 62], [45, 52, 55, 61], [50, 53, 57, 60, 64], [47, 53, 57, 62]]
GUITAR = [(0.5, 0.2, 0.9), (1.25, 0.15, 0.5), (1.5, 0.2, 0.8), (2.5, 0.2, 0.9), (3.25, 0.15, 0.5), (3.5, 0.25, 0.85)]
SAMPLE_BASS = [(0, 0, 0.4), (0.5, 12, 0.25), (1.0, 0, 0.4), (1.5, 12, 0.25), (2.0, 0, 0.4), (2.5, 12, 0.25),
               (3.0, 10, 0.3), (3.5, 12, 0.25)]
SECTION_CUTS = [DROP] + CUT_HITS + [FINALE, LAST_HIT]


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
    """One bar of the 'record', rendered once per chord and looped like a sample."""
    phrase = np.zeros((secs(BAR + 0.4), 2))

    def add(signal, start, gain, pan):
        begin = secs(start)
        end = min(len(phrase), begin + len(signal))
        phrase[begin:end, 0] += signal[: end - begin] * gain * np.sqrt(1 - pan)
        phrase[begin:end, 1] += signal[: end - begin] * gain * np.sqrt(1 + pan)

    strings = string_section([n + 12 for n in chord[1:]], BAR * 0.95, attack=0.08)
    add(strings * (1 - 0.35 * np.sin(np.pi * np.clip(timeline(len(strings)) / BAR, 0, 1))), 0, 0.5, -0.3)
    for beat, length, velocity in GUITAR:
        add(guitar_chord([n + 12 for n in chord[1:4]], length * BEAT, 0.7, muted=True), beat * BEAT, 0.9 * velocity, 0.35)
    for beat, interval, length in SAMPLE_BASS:
        add(sample_bass(chord[0] - 12 + interval, length * BEAT), beat * BEAT, 0.45, 0)
    return phrase


def smooth_arc():
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
    return low_pass, high_pass


def dj_arc():
    """Per scene: the cut throws the filter wide open, it falls back, then climbs through the scene;
    the last half bar before each cut thins out with a rising high-pass, like a DJ riding the EQ."""
    low_pass = np.full(samples, 300.0)
    high_pass = np.full(samples, 30.0)
    low_pass[t < DROP] = 220 * (6 ** np.clip(t[t < DROP] / DROP, 0, 1))
    for index, (begin, end) in enumerate(zip(SECTION_CUTS[:-1], SECTION_CUTS[1:])):
        mask = (t >= begin) & (t < end)
        local = t[mask] - begin
        span = max(end - begin, 1e-6)
        floor = 450 + 120 * index
        climb = floor * ((7000 + 400 * index) / floor) ** np.clip(local / span, 0, 1) ** 1.6
        burst = 14000 * np.exp(-local / 0.35)
        low_pass[mask] = np.maximum(climb, burst)
        build = np.clip((local - (span - BAR / 2)) / (BAR / 2), 0, 1)
        high_pass[mask] = 30 + 900 * build**2
    night = (t >= NIGHT[0]) & (t < NIGHT[1])
    low_pass[night] = np.minimum(low_pass[night], 700)
    finale = t >= FINALE
    low_pass[finale] = np.maximum(low_pass[finale], 12000)
    return low_pass, high_pass


def score(arc="smooth", out_name="music-M1.wav"):
    drums = new_bus()
    loop = new_bus()
    fx = new_bus()

    phrases = {}
    for bar_start, _ in grid(DROP, LAST_HIT, BAR):
        if FINALE - BEAT <= bar_start < FINALE:
            continue
        chord = chord_at(bar_start + 0.01)
        if tuple(chord) not in phrases:
            phrases[tuple(chord)] = build_phrase(chord)
        phrase = phrases[tuple(chord)]
        begin = secs(bar_start)
        end = min(samples, begin + len(phrase), secs(LAST_HIT))
        if bar_start < FINALE <= bar_start + BAR:
            end = min(end, secs(FINALE - BEAT))
        loop[begin:end] += phrase[: end - begin]

    chop = secs(BEAT / 4)
    begin = secs(GLITCH)
    segment = loop[begin : begin + chop].copy() * np.minimum(1, np.arange(chop) / 80)[:, None]
    for i in range(4):
        loop[begin + i * chop : begin + (i + 1) * chop] = segment

    low_pass, high_pass = dj_arc() if arc == "dj" else smooth_arc()
    for c in range(2):
        channel = sweep_filter(loop[:, c], low_pass, q=1.6 if arc == "dj" else 1.5, stages=2)
        channel = sweep_filter(channel, high_pass, q=0.9, kind="high")
        loop[:, c] = phaser(channel, rate_hz=0.18, depth=1.0, mix=0.45, phase=c * 1.3)

    kick_times = v1_drums(drums, place, cues, disco_hats=True)
    if arc == "dj":
        # V1 only rolls into 7 s, 12 s and the finale: here every scene cut gets its own short build.
        for cut in CUT_HITS:
            if cut in (T(7.0), T(12.0)):
                continue
            for i in range(8):
                place(drums, v1_snare(), cut - 0.5 + i * BEAT / 8, gain=0.12 + 0.4 * i / 8, pan=0.15)
    loop *= kick_duck(kick_times, samples, depth=0.2 if arc == "smooth" else 0.25)[:, None]
    for time, k in grid(T(12.0), LAST_HIT, BEAT / 4):
        if (time < NIGHT[0] or time >= FINALE) and k % 2:
            place(drums, tambourine(), time + 0.03, gain=0.16, pan=0.55)

    # Hits: stabs on every word slam and landing as in V1, a longer open stab on every cut.
    for time in WORD_HITS:
        place(fx, guitar_chord([n + 12 for n in chord_at(time)[1:4]], 0.14, 0.9, muted=True), time, gain=0.55, pan=0.25)
        place(fx, string_section([n + 12 for n in chord_at(time)[1:]], 0.2, attack=0.004), time, gain=0.3, pan=-0.2)
    for time in LAND_HITS:
        place(fx, pluck_string(chord_at(time)[-1] + 12, 0.4, 0.8), time, gain=0.38, pan=-0.3)
        place(fx, guitar_chord([n + 12 for n in chord_at(time)[1:4]], 0.1, 0.8, muted=True), time, gain=0.35, pan=0.3)
    for time in CUT_HITS:
        place(fx, string_section([n + 12 for n in chord_at(time)[1:]] + [chord_at(time)[1] + 24], 0.45, attack=0.004), time, gain=0.5)
        place(fx, crash(1.6), time, gain=0.45, pan=0.2)

    # Builds into the cuts: a resonant swoosh on every transition, bigger before the finale.
    for peak in TRANSITION_PEAKS:
        place(fx, filter_swoosh(0.8 if arc == "dj" else 0.7, 0.2, q=3.0), peak - (0.8 if arc == "dj" else 0.7), gain=0.3 if arc == "dj" else 0.26)
    for time in LAYS:
        place(fx, metal_hat(), time + 0.28, gain=0.3, pan=0.2)
    place(fx, filter_swoosh(1.0, 0.3, q=3.0), FINALE - 1.0, gain=0.5)
    place(fx, crash(3.0), FINALE, gain=0.7, pan=-0.2)

    # The V1 finale ring-out: a wide D minor chord (strings and guitar) decaying to the end.
    ring = DURATION - LAST_HIT
    final = string_section([50, 57, 62, 65, 69, 74, 77], ring - 0.2, attack=0.01)
    final *= np.exp(-timeline(len(final)) * 1.1)
    place(fx, final, LAST_HIT, gain=0.6)
    place(fx, guitar_chord([62, 65, 69, 74], 1.5, 0.9), LAST_HIT, gain=0.6, pan=0.3)
    place(fx, sample_bass(38, ring * 0.7), LAST_HIT, gain=0.5)
    place(fx, crash(3.0), LAST_HIT, gain=0.55, pan=0.2)

    place_intro_foley(fx)
    place_clock_foley(fx)
    place_peels(fx)

    room = room_ir(1.2, 5.0, 7000)
    loop = echo(loop, BEAT * 0.75, 0.3, 0.1, repeats=3, tone=3000)
    loop = reverb(loop, room, 0.12)
    drums = reverb(drums, room_ir(0.4, 14, 8000), 0.08)
    fx = reverb(fx, room, 0.18)
    mix = drums * 0.85 + loop * 1.25 + fx
    mix = np.tanh(mix * 1.25) / np.tanh(1.25)
    master(mix, out_name)


if __name__ == "__main__":
    score()
