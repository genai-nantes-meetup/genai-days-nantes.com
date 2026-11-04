"""Reading-time audit for the film.

Metric: subtitle norm for French, 17 characters per second, never under 0.83 s, scaled by SPEED
(0.8: the fast tempo the user validated). A card's text is readable from the moment its first line
lands (entry tween done) to the moment it starts leaving, in output seconds of index.html.
Lines that arrive one after another count together: the reader starts on the first one.

    python3 tools/reading.py

After changing a text or a time in index.html, update BEATS and rerun. Durations stay provisional
until the edit is locked to the music's BPM.
"""

CPS = 17.0
MIN_STILL = 0.83
SPEED = 0.8
TOLERANCE = 0.02

# (card, text that must be read, first line lands, text starts leaving)
BEATS = [
    ("C01 hook", "Sur l’IA, tout le monde a un avis.", 0.5, 2.15),
    ("C02 invitation", "Venez vous faire le vôtre.", 3, 4.25),  # lands 2.95, ink bars of the power-on cross it until 3.0

    # Q3: the camera travels to the next cell in one beat centred on each cut, so each quote holds still 0.5 s less.
    ("Q3 POCs", "« Nos POCs ne passent jamais en production »", 6, 8.5),
    ("Q3 budget", "« J’ai consommé mon budget IA en mai »", 9, 11.5),
    ("Q3 démo", "« En démo, mon agent IA vocal ne se trompe jamais »", 12, 14.5),
    ("Q3 otage", "« Les Américains ont pris en otage mon SI »", 15, 17.75),
    ("Q3 déjà entendues", "Ces phrases, vous les avez déjà entendues.", 22.45, 25),
    ("C07 deux parcours", "Deux parcours, une journée pour y répondre : Pour celles et ceux qui décident Pour celles et ceux qui implémentent", 26.05, 32),
    ("C08 temps forts", "Des temps forts à partager. Keynotes Startup Contest Podcast en public DJ set", 32.5, 35.85),
    ("C09 intervenants", "Intervenants de premier plan.", 37.75, 52.25),
    ("C11 partenaires", "Nos partenaires rendent cette journée possible.", 52.8, 55.75),
    ("Q7 affiche finale", "GENAI DAYS LA Conf Gen AI dédiée aux décideurs et leurs équipes techs 2 tracks pour décider où investir et comprendre comment déployer Mardi 17 novembre 2026 · Hôtel de Région, Nantes · 08 h 30 à 22 h Prenez votre place genai-days-nantes.com", 57.2, 61.75),
]


def need_of(text):
    return max(MIN_STILL, len(text) / CPS) * SPEED


print(f"reading speed factor {SPEED:g}")
print(f"{'card':22} {'chars':>5} {'need':>6} {'still':>6}")
too_fast = 0
for name, text, lands, leaves in BEATS:
    need = need_of(text)
    still = leaves - lands
    flag = ""
    if still < need - TOLERANCE:
        flag = "  TOO FAST"
        too_fast += 1
    print(f"{name:22} {len(text):5d} {need:6.2f} {still:6.2f}{flag}")
print(f"{too_fast} card(s) too fast")
