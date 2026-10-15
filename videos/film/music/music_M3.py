# /// script
# dependencies = ["numpy", "scipy"]
# ///
"""Hybrid M3, "B1 accéléré": M1 (B1's record loop with the V1 drums and builds) with a DJ filter.

Every scene cut throws the filter wide open, it falls back and climbs again through the scene, and the
last half bar before each cut thins out on a rising high-pass over the V1 snare roll and swoosh.
The most dynamic of the hybrids. The score itself lives in music_M1.score().
"""
from music_M1 import score

score(arc="dj", out_name="music-M3.wav")
