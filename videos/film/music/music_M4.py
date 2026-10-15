# /// script
# dependencies = ["numpy", "scipy"]
# ///
"""Hybrid M4, "Vocoder hook": M2 (V1 re-voiced French) plus a talkbox-style formant lead.

The lead sings the V1 arp contour as a short hook on the tagline and the finale, and holds the last
note over the ring-out. The score itself lives in music_M2.score().
"""
from music_M2 import score

score(with_hook=True, out_name="music-M4.wav")
