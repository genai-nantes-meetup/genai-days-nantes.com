"""Reading-time audit for the showreel.

Metric: subtitle norm for French, 17 characters per second, never under 0.83 s (5/6 s).
Measured on the still time of the text that must be read: from the moment its entry tween
lands to the moment it starts leaving, in output seconds after the holds of tools/holds.json.

`python3 tools/reading.py --outliers` keeps the base tempo (BASE holds) and only tops up
the outliers: beats whose still time is under `--outlier` x the norm (default 0.6) get a hold bringing them
to `--speed` x the norm (default 0.8). Both factors are stored in holds.json.

`python3 tools/reading.py` prints the audit. `--speed 0.8` scales every required reading time by 0.8
(20 % shorter); the factor is stored in holds.json so later audits keep it unless a new one is passed. `--fix` rewrites the holds so every beat passes,
placing each hold just before its exit and rounding up to 0.25 s (an eighth note at 120 BPM).
"""
import json
import math
import sys
from pathlib import Path

CPS = 17.0
MIN_STILL = 0.83
GRID = 0.25
HOLDS_PATH = Path(__file__).resolve().parent / "holds.json"

# (beat, text that must be read, entry start, entry duration, exit), source seconds from index.html.
BEATS = [
    ("S1 wordmark + pass", "GENAI DAYS 17 novembre 2026", 1.9, 0.42, 2.55),
    ("S2 L'IA générative", "L'IA générative", 3.5, 0.42, 3.72),
    ("S2 est déjà chez vous", "est déjà chez vous.", 4.57, 0.42, 5.0),
    ("S2 C'est maintenant", "C'est maintenant que ça se complique.", 5.877, 0.3, 6.55),
    # Issues: the name must be read; the session title under it is a skim line (user: the issues must not drag).
    ("S3 Coûts", "Coûts.", 7.06, 0.36, 7.28),
    ("S3 Shadow AI", "Shadow AI.", 7.56, 0.36, 7.78),
    ("S3 Souveraineté", "Souveraineté.", 8.06, 0.36, 8.28),
    ("S3 Production", "Production.", 8.56, 0.36, 8.72),
    ("S4 Deux parcours", "Deux parcours, une journée. décident implémentent", 10.6, 0.45, 11.5),
    ("S6 400 places, billet", "400 places 147 € TTC", 16.0, 0.5, 17.5),
    # S7: measured from the last clock stop (Apéro networking lands at 21.0) to the cut.
    ("S7 temps forts", "Une journée ponctuée de temps forts. Startup Contest Podcast Apéro networking", 21.0, 0.45, 21.5),
]
# Base tempo: the original v4 cut, no reading holds; only the structural holds (speaker corridor,
# partners board, lockup). User 2026-10-12: "revenir sur le tempo du début et juste corriger les outliers".
BASE = [[14.55, 4.0], [24.6, 0.5], [27.4, 2.0]]
# Holds that are not reading holds (speaker corridor, partners board, final lockup) are kept as they are.
FIXED = [[14.55, 4.0], [24.6, 0.5], [27.4, 2.0]]


def factor_from_args(stored):
    if "--speed" in sys.argv:
        return float(sys.argv[sys.argv.index("--speed") + 1])
    return stored


def need_of(text, speed):
    return max(MIN_STILL, len(text) / CPS) * speed


def arg(name, stored, default):
    if name in sys.argv:
        return float(sys.argv[sys.argv.index(name) + 1])
    return stored if stored is not None else default


def outlier_holds(speed, outlier):
    holds = [list(h) for h in BASE]
    for name, text, start, dur, exit_ in BEATS:
        norm = max(MIN_STILL, len(text) / CPS)
        still = T(exit_, holds) - (T(start, holds) + dur)
        if still < outlier * norm:
            extra = math.ceil((speed * norm - still) / GRID - 1e-9) * GRID
            holds.append([round(exit_ - 0.005, 3), extra])
    return sorted(holds)


def T(x, holds):
    return x + sum(extra for at, extra in holds if x >= at)


def audit(holds, speed):
    rows = []
    for name, text, start, dur, exit_ in BEATS:
        need = need_of(text, speed)
        still = T(exit_, holds) - (T(start, holds) + dur)
        rows.append((name, len(text), need, still))
    return rows


def fixed_holds(speed):
    holds = [list(h) for h in FIXED]
    for name, text, start, dur, exit_ in BEATS:
        need = need_of(text, speed)
        base = exit_ - (start + dur)
        extra = max(0.0, math.ceil((need - base) / GRID - 1e-9) * GRID)
        if extra:
            holds.append([round(exit_ - 0.005, 3), extra])
    return sorted(holds)


data = json.loads(HOLDS_PATH.read_text())
holds = data["holds"]
speed = factor_from_args(data.get("speed", 1.0))
if "--fix" in sys.argv:
    holds = fixed_holds(speed)
    data["holds"] = holds
    data["speed"] = speed
if "--outliers" in sys.argv:
    speed = arg("--speed", data.get("speed"), 0.8)
    outlier = arg("--outlier", data.get("outlier"), 0.6)
    holds = outlier_holds(speed, outlier)
    data.update({"holds": holds, "speed": speed, "outlier": outlier, "why": "r2 holds (the tempo the user prefers) plus top-ups for outliers only, from tools/reading.py --outliers."})
    data["why"] = "Reading holds from tools/reading.py (17 chars/s, min 0.83 s of still text), plus fixed holds for the speaker corridor, partners and lockup. Multiples of 0.25 s stay on the eighth-note grid at 120 BPM."
    HOLDS_PATH.write_text(json.dumps(data, indent=1))
print(f"{'beat':24} {'chars':>5} {'need':>6} {'still':>6}")
print(f"reading speed factor {speed:g}")
for name, chars, need, still in audit(holds, speed):
    flag = "" if still >= need - 0.02 else "  TOO FAST"
    print(f"{name:24} {chars:5d} {need:6.2f} {still:6.2f}{flag}")
print(f"total {T(28, holds):.2f} s")
