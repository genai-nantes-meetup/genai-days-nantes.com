# /// script
# dependencies = ["numpy", "scipy"]
# ///
"""Hybrid M2, "V1 réharmonisée French": the original score re-voiced with French-touch timbres.

Same chords as the V1 score (Am, F, C, G, then Am, F, G, E on the finale, bars counted in source time),
same offbeat bass rhythm, same 16th arp pattern and the same stab placements. The supersaw becomes
filtered disco strings with a phaser, the plucks a clean guitar, the stabs muted guitar and string hits,
the bass an octave disco bass, and the noise risers become filter sweeps on the strings themselves.
score(with_hook=True) is reused by music_M4.py.
"""
import numpy as np

import music_lab as cues
from french_kit import (
    crash, filter_swoosh, guitar_chord, kick_duck, metal_hat, phaser, pluck_string, saw, string_section, talkbox,
    v1_drums,
)
from music_lab import (
    BAR, BEAT, CUT_HITS, DROP, DURATION, FINALE, FINALE_SRC, GLITCH, LAND_HITS, LAST_HIT, LAYS, NIGHT, S, T,
    TRANSITION_PEAKS, WORD_HITS, echo, grid, lowpass, master, midi_hz, new_bus, place, place_clock_foley, place_intro_foley,
    place_peels, reverb, room_ir, samples, secs, sweep_filter, t, timeline,
)

# the V1 score harmony, unchanged.
PROGRESSION = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
FINALE_PROGRESSION = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 56, 59, 64]]
ARP = [0, 2, 1, 2, 0, 2, 1, 3]
# The V1 motif, sung: the arp's contour slowed to a phrase. (beat, length in beats, arp index, vowels)
HOOK = [(0, 0.5, 3, "oa"), (0.75, 0.25, 2, "ai"), (1.5, 0.5, 1, "ao"), (2.5, 0.25, 2, "ea"), (3.0, 0.75, 0, "ou")]
# the V1 score noise risers, now filter sweeps on the strings: (start, end).
SWEEPS = [(0.0, DROP), (T(7.0) - 0.5, T(7.0)), (T(12.0) - 0.5, T(12.0)), (FINALE - 1.0, FINALE)]


def chord_at(time):
    source = S(time)
    if source >= FINALE_SRC:
        return FINALE_PROGRESSION[int((source - FINALE_SRC) // BAR) % 4]
    return PROGRESSION[int(max(0, source - DROP) // BAR) % 4]


def octave_bass(note, length_s, cutoff):
    length = secs(length_s)
    rt = timeline(length)
    freq = midi_hz(note)
    tone = lowpass(saw(freq, length) * 0.6 + np.sin(2 * np.pi * freq * rt), cutoff)
    return tone * np.minimum(1, rt / 0.004) * np.exp(-rt * 5)


def score(with_hook=False, out_name="music-M2.wav"):
    drums = new_bus()
    strings = new_bus()
    music = new_bus()
    hook = new_bus()
    fx = new_bus()

    # Strings: one chord per bar, an octave up, in place of the supersaw pad.
    for position, _ in grid(DROP, DURATION, BAR):
        chord = chord_at(position + 0.01)
        voicing = [n + 12 for n in chord] + [chord[0]]
        place(strings, string_section(voicing, BAR * 1.02, attack=0.06), position, gain=0.55)

    cutoff = 900 + 2200 * np.clip(np.array([S(x) for x in t[::441]]) / 16, 0, 1)
    cutoff = np.repeat(cutoff, 441)[:samples]
    cutoff[t >= FINALE] = 5200
    cutoff[(t >= NIGHT[0]) & (t < NIGHT[1])] = 650
    for begin, end in SWEEPS:
        mask = (t >= begin) & (t < end)
        cutoff[mask] = np.maximum(cutoff[mask], 400 * (25 ** ((t[mask] - begin) / (end - begin))) ** 1.3)
    for time in CUT_HITS:
        mask = (t >= time) & (t < time + BEAT)
        cutoff[mask] = np.maximum(cutoff[mask], 8000 * np.exp(-(t[mask] - time) * 3))
    for c in range(2):
        filtered = sweep_filter(strings[:, c], cutoff, q=1.4, stages=2)
        strings[:, c] = phaser(filtered, rate_hz=0.2, mix=0.45, phase=c * 1.4)

    # Bass: the V1 offbeat eighths, alternating octaves like a disco bass.
    for position, k in grid(DROP, LAST_HIT + BEAT, BEAT):
        note_time = position + BEAT / 2
        if note_time >= LAST_HIT + BEAT:
            continue
        night = NIGHT[0] <= position < NIGHT[1]
        root = chord_at(position)[0] - 24 + (12 if k % 2 else 0)
        level = 520 if position < T(3.0) else (380 if night else 1100)
        place(music, octave_bass(root, BEAT * 0.48, level), note_time, gain=0.5)

    # Arp: the V1 16th pattern on a clean guitar, same sections.
    for position, index in grid(T(7.0), LAST_HIT, BEAT / 4):
        if T(7.0) <= position < T(9.0) or T(12.0) <= position < T(15.0) or FINALE <= position:
            chord = chord_at(position)
            notes = chord + [chord[0] + 12]
            note = notes[ARP[index % 8] % len(notes)] + 12
            place(music, pluck_string(note, 0.2, 0.75, 0.993), position, gain=0.2, pan=0.45 if index % 2 else -0.45)

    # Stabs: same placements as V1.
    for time in WORD_HITS + LAND_HITS:
        chord = chord_at(time)
        place(music, guitar_chord([n + 12 for n in chord], 0.16, 0.9, muted=True), time, gain=0.55, pan=0.25)
        place(music, string_section([n + 12 for n in chord], 0.22, attack=0.004), time, gain=0.3, pan=-0.2)
    for time in CUT_HITS:
        chord = chord_at(time)
        place(music, string_section([n + 12 for n in chord] + [chord[0] + 24], 0.5, attack=0.004), time, gain=0.5)
        place(music, guitar_chord([n + 12 for n in chord], 0.5, 0.9), time, gain=0.45, pan=0.3)
        place(fx, crash(1.6), time, gain=0.4, pan=0.2)

    if with_hook:
        sung = [(T(3.0), T(7.0)), (FINALE, LAST_HIT)]
        for bar_start, _ in grid(DROP, LAST_HIT, BAR):
            for beat, length, arp_index, vowels in HOOK:
                time = bar_start + beat * BEAT
                if not any(begin <= time < end for begin, end in sung) or time >= LAST_HIT - 0.01:
                    continue
                chord = chord_at(time + 0.01)
                notes = chord + [chord[0] + 12]
                note = notes[arp_index % len(notes)] + 12
                place(hook, talkbox(note, length * BEAT, list(vowels)), time, gain=0.3, pan=0.05)
        place(hook, talkbox(81, (DURATION - LAST_HIT) * 0.6, list("oaa"), glide_from=76, vibrato=0.35), LAST_HIT, gain=0.32)

    # Transitions: resonant filter swooshes where V1 had its whooshes.
    for peak in TRANSITION_PEAKS:
        place(fx, filter_swoosh(0.6, 0.2, q=3.5), peak - 0.6, gain=0.26)
    place(fx, filter_swoosh(1.0, 0.3, q=3.5), FINALE - 1.0, gain=0.4)
    place(fx, crash(3.0), FINALE, gain=0.65, pan=-0.2)
    for time in LAYS:
        place(fx, metal_hat(), time + 0.28, gain=0.3, pan=0.2)

    # V1 finale chord, voiced for strings and guitar, ringing out.
    ring = DURATION - LAST_HIT
    final = string_section([57, 64, 69, 72, 76], ring - 0.2, attack=0.01)
    final *= np.exp(-timeline(len(final)) * 1.1)
    place(music, final, LAST_HIT, gain=0.75)
    place(music, guitar_chord([57, 64, 69, 72, 76], 1.6, 0.9), LAST_HIT, gain=0.55, pan=0.3)
    place(music, octave_bass(33, ring * 0.7, 600), LAST_HIT, gain=0.5)
    place(fx, crash(3.0), LAST_HIT, gain=0.5, pan=0.2)

    kick_times = v1_drums(drums, place, cues, disco_hats=True)
    music += strings
    music *= kick_duck(kick_times, samples, depth=0.2)[:, None]

    chop = secs(BEAT / 4)
    begin = secs(GLITCH)
    segment = music[begin : begin + chop].copy() * np.minimum(1, np.arange(chop) / 80)[:, None]
    for i in range(4):
        music[begin + i * chop : begin + (i + 1) * chop] = segment

    place_intro_foley(fx)
    place_clock_foley(fx)
    place_peels(fx)

    room = room_ir(1.2, 5.0, 7000)
    music = echo(music, BEAT * 0.75, 0.3, 0.14, repeats=3, tone=3000)
    music = reverb(music, room, 0.12)
    hook = reverb(echo(hook, BEAT * 0.75, 0.35, 0.2, repeats=4, tone=3500), room, 0.2)
    drums = reverb(drums, room_ir(0.4, 14, 8000), 0.08)
    fx = reverb(fx, room, 0.18)
    mix = drums * 0.85 + music + hook + fx
    mix = np.tanh(mix * 1.25) / np.tanh(1.25)
    master(mix, out_name)


if __name__ == "__main__":
    score()
