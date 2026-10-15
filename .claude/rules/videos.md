---
paths:
  - "videos/**"
---

# Vidéos GENAI DAYS · règles pour l'agent

Ce dossier est hors du site : Astro et le `tsconfig` l'ignorent. Les règles du `CLAUDE.md` racine qui portent sur le texte s'appliquent au texte à l'écran : pas de tiret cadratin, espace insécable avant `:` `;` `!` `?`, wordmark GENAI DAYS (Garamond, `GENAI` gras, `DAYS` régulier, seul `AI` en italique). La double maintenance FR/EN ne s'applique pas : les vidéos sont en français.

Le guide humain est `GUIDE.html`. Le brief final du film est `film/BRIEF.md`. Cette règle, chargée dès qu'on travaille dans `videos/`, contient les commandes et les règles d'exécution.

## Skills

Les skills HyperFrames sont versionnés dans `.claude/skills/` à la racine (verrouillés par `skills-lock.json`). Pour toute demande vidéo, passer par le skill `hyperframes`, qui oriente vers `general-video` (le workflow du film) et les skills `hyperframes-*`. Mise à jour : `pnpm dlx skills update -p` depuis la racine du repo.

HyperFrames est figé en `0.8.140` dans `film/package.json` pour que le film rende à l'identique. Toujours passer par `pnpm run <script>` ou `pnpm dlx hyperframes@0.8.140`, jamais `npx`. Ne monter de version qu'avec un rendu de comparaison juste après.

## Film (`film/`)

Tout le film tient dans `film/index.html` : CSS, scènes `#s1` à `#s9` (pas de `#s8`), timeline GSAP. Les commandes se lancent depuis `videos/film`.

```bash
pnpm run dev                                   # Studio HyperFrames
pnpm run check                                 # attendu : 9 text_occluded sur le wordmark final (S9), faux positifs
pnpm run render                                # ../renders/film.mp4, ~38 Mo, prêt à partager
pnpm run render -m M3                          # variante musicale : ../renders/film-M3.mp4
pnpm run render -d                             # brouillon rapide ; -o <fichier> pour une autre sortie
```

Timing et lecture :

- Chaque texte reste immobile au moins le temps de lecture : 17 caractères/s, jamais moins de 0,83 s. Les pauses sont dans `tools/holds.json`, multiples de 0,25 s (grille de 120 BPM).
- Après une modification de texte ou de timing : `python3 tools/reading.py` (audit), `python3 tools/reading.py --outliers` (corrige seulement les textes trop courts, c'est le choix validé), puis `python3 tools/apply-holds.py`.
- La musique est calée sur `holds.json`. Après tout changement de pauses, régénérer : `uv run music/music_M2.py`. Sinon les impacts tombent à côté des coupes.

Musique : synthétisée en Python (`music/french_kit.py` pour les instruments, `music/music_lab.py` pour la table des temps, les bruitages et le mastering). Seule `assets/audio/music-M2.wav` est versionnée. Les variantes M1, M3, M4 et B1 se régénèrent à la demande et restent hors git.

Visuels :

- Plaques sérigraphie : `uv run tools/plates.py [nom]` les calcule depuis `public/` du site vers `assets/plates/`. Une nouvelle illustration s'ajoute dans `SOURCES`.
- Logos partenaires : `DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib uv run --with cairosvg --with pillow --with numpy python -I tools/partners_mono.py <dossier-logos>` (nécessite `brew install cairo`). Reporter le ratio et la densité affichés dans `PARTNER_ROWS`.
- Les assets du film sont une copie figée et élaguée. Toujours copier la version `-optimized` depuis `public/`, ne jamais référencer un fichier hors de `film/assets/`.

Formats verticaux (lab) : `uv run tools/make-vertical-lab.py`, puis `pnpm dlx hyperframes@0.8.140 render -c tools/labs/vertical/vertical-4x5.html -q draft -f 24 -o ../renders/vertical-4x5.mp4` (ou `9x16`). C'est une recomposition des scènes : le lab recopie le CSS et les fonctions d'`index.html` à chaque génération.

## Données

Speakers, partenaires, sessions, prix et horaires viennent du site : `src/content/` (speakers, partners, sessions), `src/content/event.json`, `src/content/pricing.json`, images dans `public/`. Ne rien inventer. Pas de chiffre de places restantes qui ne viendrait pas de Billetweb.

Le film (`SPEAKERS`, `PARTNER_ROWS` dans `index.html`) et l'habillage (`SESSIONS` dans `habillage-captation/bumpers.html`, `PARTNER_LOGOS` dans `board.html`) sont des copies figées. Ils prennent du retard sur le site et sont régénérés depuis `src/content/` sur demande. Portraits du film : `public/speakers/<slug>-optimized.webp` vers `film/assets/speakers/`.

## Habillage captation (`habillage-captation/`)

Pages HTML ouvertes dans un navigateur ou chargées comme source navigateur dans OBS. Pas de rendu vidéo.

```bash
python3 -m http.server 8000                                        # board.html, bumpers.html?session=<slug>[&layout=c]
uv run --with pillow python scripts/build_single_html.py .         # fichier unique hors ligne, ignoré par git
```

Portraits : `scripts/normalise_faces.py <source> <sortie>` (OpenCV) recadre les originaux de `assets/speakers/` vers `assets/speakers/norm/` à taille de visage et ligne des yeux constantes.

## Sorties et git

- On ne produit que la version à partager (H.264 deux passes à 7 Mb/s, -14 LUFS) : `tools/render.sh` rend le master HyperFrames (~300 Mo) dans un dossier temporaire et le supprime. Pas de suffixe `-light`, pas de master conservé.
- Tous les rendus, aperçus et fichiers de contrôle vont dans `videos/renders/`, ignoré par git. Les MP4 se partagent par Drive, jamais dans le repo.
- Variantes : courtes, numérotées à partir de 1, on ne garde que les deux dernières.
- Quand une décision du film change, mettre à jour `film/BRIEF.md` (brief final, sans historique). Quand l'outillage change, mettre à jour cette règle (`.claude/rules/videos.md`) et `GUIDE.html`.
