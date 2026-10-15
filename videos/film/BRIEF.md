---
workflow: general-video
flow: automation
storyboard: no
message: "GENAI DAYS, 17.11.2026 à l'Hôtel de Région, Nantes : l'intelligence artificielle, ici et maintenant."
destination: web
aspect: 1920x1080
language: fr
audience: décideurs et équipes techniques de l'écosystème IA nantais
length: 43,5 s
angle: showreel
---

# Film GENAI DAYS · brief

## Intention

Film d'annonce sans voix off de 43,5 s pour GENAI DAYS 2026. Il dit l'essentiel de l'événement : date, lieu, enjeux, parcours, intervenant·es, billet, temps forts, partenaires. Il sert aussi de vitrine motion design : chaque scène montre une technique différente, toutes calées sur la musique. Le langage visuel est celui du site, de la sérigraphie et des objets imprimés.

## Contraintes

- Marque : `DESIGN.md` et `CLAUDE.md` à la racine du repo font foi. Papier crème et trois encres (bleu électrique, orange signal, charbon). Mot-symbole GENAI DAYS en Garamond, GENAI gras, DAYS régulier, seul AI en italique.
- Texte à l'écran en français. Jamais de tiret cadratin. Espace insécable avant « : », « ; », « ! », « ? ».
- Aucun fait inventé. Speakers, partenaires, chiffres et horaires viennent du site (`src/content/`). Les listes `SPEAKERS` et `PARTNER_ROWS` d'`index.html` sont un instantané figé du site : elles seront régénérées depuis `src/content/`.
- Assets : copie figée et élaguée dans `assets/`, images toujours en version `-optimized`. Le film rend à l'identique même si le site change.
- HyperFrames figé en 0.8.140 (`package.json`). Rendu hors ligne, sans télémétrie.
- Mode d'emploi complet : `videos/GUIDE.html`.

## Décisions validées

### Scène par scène (temps de sortie)

- **S1 · Le tirage (0 à 3,8 s).** La raclette pose la plaque bleue de la cover, puis la plaque orange directement en repérage. La fin de la 2e passe tombe sur le drop à 1 s. Le mot-symbole se construit, le pass métal se pose, se lisse au pouce et reste collé. La variable `origFade` (défaut `true`) fond l'illustration d'origine sur les deux plaques.
- **S2 · Tagline (3,3 à 10,3 s).** « L'IA générative » vue à travers le contre-poinçon du I, « est déjà chez vous. » sur l'affiche du château en miroir, puis « C'est maintenant que ça se complique. » sur papier nu.
- **S3 · Quatre enjeux (9,8 à 15,3 s).** Coûts, Shadow AI, Souveraineté, Production. Mise en page fixe : kicker « Quatre enjeux » et compteur, nom de l'enjeu en grand, titre de session du programme en sous-titre, barre en 4 segments, image cadrée à droite. Seuls les mots et l'image changent.
- **S4 · Deux parcours (14,05 à 19,75 s).** « Deux parcours, une journée. » sur l'illustration des rails vers le soleil. Une légende par rail : « Parcours 01 · Pour ceux qui décident » (DSI, DG, innovation) et « Parcours 02 · Pour ceux qui implémentent » (Ingénieurs, data, archi). Sortie par un zoom traversant vers le soleil.
- **S5 · Intervenant·es (19,75 à 25,3 s).** Travelling sur le fond speaker, les trois premières têtes d'affiche arrivent en photos qui grandissent, puis l'avalanche des autres portraits se pose sur une table. Compteur final : 20 intervenant·es.
- **S6 · Jauge et billet (24,85 à 28,3 s).** Sur l'affiche du château, compteur jusqu'à 400 places. Le billet se pose, prix compté jusqu'à 147 € TTC, date, lieu et accueil à 08:30.
- **S7 · Temps forts (27,8 à 35,05 s).** L'affiche se décolle par le coin bas droit et découvre l'Hôtel de Région. « Une journée ponctuée de temps forts. » Une horloge parcourt la journée et s'arrête sur chaque moment : Startup Contest à midi, Podcast « Message à caractère informatique » à 18:00, Apéro networking de 18:00 à 22:00 avec boule à facettes et DJ set.
- **S9 · Partenaires et lockup (34,5 à 43,5 s).** « Nos partenaires » sur l'affiche du château : 17 logos en 3 rangées par niveau, différenciés par la taille seule, sans nom de niveau. Les tuiles s'envolent, puis le mot-symbole se pose avec « L'intelligence artificielle, ici et maintenant. », « 17.11.2026 · Hôtel de Région, Nantes », genai-days-nantes.com, #GenAIDaysNantes et « Avec le soutien de » + logo de la Région. La plaque orange se recale sur le dernier impact.

### Transverse

- **Sérigraphie.** Chaque illustration est séparée en plaque bleue (key) et plaque orange (signal) par `tools/plates.py`, dans `assets/plates/`. Le décalage puis le recalage des plaques est le geste de mise en mouvement du film. Grain animé sur toute la durée.
- **Rythme et temps de lecture.** La chorégraphie est écrite en secondes source (28 s). `tools/holds.json` insère 13 pauses, appliquées par `T()` dans `index.html` : 15,5 s de plus, soit 43,5 s. Norme des sous-titres : 17 caractères/s, minimum 0,83 s de texte immobile. On garde le tempo rapide et on ne corrige que les textes trop courts (`python3 tools/reading.py --outliers`, facteurs 0,6 stockés dans `holds.json`). Pauses en multiples de 0,25 s, sur la grille de 120 BPM. En S3, seul le nom de l'enjeu est mesuré.
- **Musique.** `assets/audio/music-M2.wav`, générée par `uv run music/music_M2.py` : partition d'origine réorchestrée French touch (cordes disco filtrées, guitare, basse octave), bruitages de sérigraphie synthétisés, impacts calés sur les coupes. Elle lit la même table de temps que le film : après tout changement de pauses, la régénérer.
- **Export.** Master via `pnpm run render`, puis fichier à partager via `tools/export-web.sh` : H.264 deux passes à 7 Mb/s, audio à -14 LUFS, environ 37 Mo.
- **Contrôle.** `pnpm run check` finit sur 9 alertes `text_occluded` en S9 : la couche d'encre double le mot-symbole final. Faux positif connu.
