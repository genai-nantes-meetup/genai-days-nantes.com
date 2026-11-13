---
paths:
  - "videos/**"
---

# Vidéos GENAI DAYS · règles pour l'agent

Ce dossier est hors du site : Astro et le `tsconfig` l'ignorent. Les règles du `CLAUDE.md` racine qui portent sur le texte s'appliquent au texte à l'écran : pas de tiret cadratin, espace insécable avant `:` `;` `!` `?`, wordmark GENAI DAYS (Garamond, `GENAI` gras, `DAYS` régulier, seul `AI` en italique). La double maintenance FR/EN ne s'applique pas : les vidéos sont en français.

Le guide humain est `GUIDE.html`. Le brief final du film est `film/BRIEF.md`. Cette règle, chargée dès qu'on travaille dans `videos/`, contient les commandes et les règles d'exécution.

## Direction artistique vidéo

Sources : revue du film par la direction artistique le 21/10/2026, puis décisions de Dorian au montage final du 04/11/2026. Ces règles priment sur le vocabulaire print de `DESIGN.md` (papier, trame, défauts d'impression), qui décrit le site. Chaque règle dit ce qu'elle vise : appliquée hors de son but, une règle a déjà produit de mauvais choix (liseré orange sur l'étiquette, aucun temps laissé sur le fond crème, mosaïque montée sans déplacement).

- La charte est print et digitale. Deux éléments seulement ont un aspect fait main : les illustrations Midjourney et l'étiquette argentée. Tout le reste est digital : glitch en barres orange et bleues, zoom caméra, grilles nettes.
- Interdits : texture papier ou grain, risographie, trames de points, effets d'impression bichromie (plaques en repérage), raclette (balayage façon sérigraphie), page qui se tourne, barre 3D, horloge ou montre à aiguilles, ombres portées lourdes, typographie qui occupe tout l'écran.
- Liseré orange fin : seulement pour distinguer une image parmi d'autres, par exemple la case de la mosaïque qu'on vient de voir en plein cadre. Jamais autour de l'étiquette argentée ni d'un objet détouré, jamais par défaut (Dorian, 04/11/2026).
- Couleurs : palette de la charte. Un orange qui tire vers le rose plutôt que vers le jaune, images comprises. Pas de rouge dans les photos.
- Pour passer d'un plan à un autre : le zoom vers un point, le glitch en barres ou une coupe franche sur le temps.
  - Zoom vers un point : la caméra avance dans l'axe vers un point précis de l'image (un écran, une lumière, une porte, un point de fuite) et le plan suivant se découvre dans ce point. Ce qui est interdit, c'est un flash blanc ou un cadre vide qui n'appartient à aucun des deux plans. Le fond du plan suivant peut tenir seul un ou deux temps avant ses éléments : Dorian a demandé plus de temps sur le crème des intervenants.
  - Glitch en barres : de longues barres horizontales plates, orange `#FE4D1B` et bleu `#3D43CE` (jamais de carrés, jamais de crème ni de blanc), sur une grille de lignes. Chaque barre flashe en aplat puis s'ouvre sur le plan suivant. Les barres s'ouvrent éparpillées dans le cadre (`fragment()` en mode `scatter`), sans front qui balaie l'écran (Dorian, 04/11/2026 : « sans le balayage »). Au pic, l'encre couvre au plus 40 à 50 % du cadre. Rapide : 0,4 à 0,6 s, sur le temps. Des éléments qui arrivent ensemble, comme les tuiles des temps forts, s'ouvrent presque en même temps, pas un par temps.
- Pas de glissement générique d'un plan à l'autre : ni calques qui s'écartent, ni plan qui monte ou descend, ni tranches décalées, ni séparation RVB, ni petits pixels carrés (Dorian, 04/11/2026). Un déplacement reste permis quand il parcourt une composition que le spectateur va voir en entier : la caméra qui va de case en case dans la mosaïque de Q3 avant de dézoomer, le carrousel des intervenants qui avance par pages comme celui du site (Dorian, 04/11/2026).
- Le zoom à travers une lettre (passage par le I) reste permis, dans l'axe.
- Gestes validés : typo en deux couches décalées qui se recalent ; étiquette argentée qui arrive, se colle puis voit son coin se décoller, une seule fois, sur l'affiche finale avec la date. C'est l'étiquette de l'affiche d'accueil du site (`src/components/Label.astro`) : métal brossé, bords clair et foncé d'origine, aucun liseré orange. Aucune info pratique (date, lieu, horaires) avant le CTA : le début du film est un hook, pas une annonce (Dorian, 04/11/2026).
- Composition validée au montage final (04/11/2026) :
  - un bloc de texte et d'images se centre verticalement dans le cadre utile, au-dessus de la barre du lecteur ;
  - l'affiche finale reprend l'affiche d'accueil du site : bloc en bas à gauche avec le mot-symbole, la tagline du site, la ligne d'infos et le bouton, étiquette en haut à droite ;
  - les partenaires forment trois blocs par niveau, découpés et dimensionnés comme sur la page partenaires du site ;
  - le carrousel ne montre que les speakers des conférences, cinq par page comme sur le site, chaque page assez longtemps pour lire les noms (environ 3,5 s) ; le titre ne donne pas de chiffre puisqu'on ne montre pas tous les intervenants.
- Images : un visuel en dessous du niveau des autres se régénère. Les images sont produites hors du repo (Midjourney) : l'agent fournit des prompts courts et abstraits, il ne les génère pas. Quand Dorian demande une image entière, elle se montre sans recadrage (la boule à facettes des temps forts).
- Son : contraste entre une musique classique et une image digitale (revue du 21/10, choix de Dorian le 04/11/2026). Piste : W1, symphonie en sol mineur dans l'esprit de Mozart, orchestre devant, simple renfort de sub-basse et de pulsation, régénérée avec Lyria 3.5. Les prompts décrivent une pièce classique ; nommer un genre électro (house, techno, garage...) donne de l'électro avec un thème plaqué, rejeté. La musique vient d'abord, le montage se cale ensuite sur son BPM. Aucune piste ni aucun bruitage des bibliothèques HyperFrames ou HeyGen.

## Skills

Les skills HyperFrames sont versionnés dans `.claude/skills/` à la racine (verrouillés par `skills-lock.json`). Pour toute demande vidéo, passer par le skill `hyperframes`, qui oriente vers `general-video` (le workflow du film) et les skills `hyperframes-*`. Mise à jour : `pnpm dlx skills update -p` depuis la racine du repo.

Pour la méthode (récit, composition, direction artistique, transitions, son, erreurs déjà faites), charger aussi le skill `motion-design` s'il est installé (il n'est pas versionné dans ce repo). Il prime sur les défauts de `hyperframes-creative` quand ils divergent, par exemple sur la taille des titres ou l'ancrage aux bords.

HyperFrames est figé en `0.8.140` dans `film/package.json` pour que le film rende à l'identique. Toujours passer par `pnpm run <script>` ou `pnpm dlx hyperframes@0.8.140`, jamais `npx`. Ne monter de version qu'avec un rendu de comparaison juste après.

## Film (`film/`)

Tout le film tient dans `film/index.html` : CSS, une section `.clip.scene` par séquence (`#q1` hook, `#q3` enjeux, `#q4` parcours et temps forts, `#q5` intervenants, `#q7` partenaires et affiche finale ; l'intro `#q2` et la soirée `#q6` ont été retirées le 04/11), timeline GSAP écrite en secondes de sortie. Les commandes se lancent depuis `videos/film`.

```bash
pnpm run dev                                   # Studio HyperFrames
pnpm run check                                 # attendu : 0 erreur ; les 8 avertissements de structure (sections dans un seul fichier) sont assumés
pnpm run render                                # ../renders/film.mp4, le rendu final à partager ; refuse d'écraser : archiver l'ancien d'abord
pnpm run render -d                             # brouillon rapide ; -o <fichier> pour une autre sortie
python3 tools/reading.py                       # audit des temps de lecture
```

Timing et lecture :

- Chaque texte reste immobile au moins le temps de lecture : 17 caractères/s, jamais moins de 0,83 s, au facteur 0,8 (tempo rapide validé). On allonge le carton trop court plutôt que d'accélérer l'entrée.
- Après une modification de texte ou de temps dans `index.html`, mettre à jour `BEATS` dans `tools/reading.py` et relancer l'audit.
- Durées provisoires : à l'étape musique, chaque coupe se recale sur le BPM du morceau choisi.

Musique : W1 (symphonie en sol mineur), régénérée avec Lyria 3.5 (`models/lyria-3.5`, API Gemini `generateContent`, offre payante requise ; Lyria RealTime grésille) : `assets/audio/music-W1-lyria35-<durée>s.wav` dans `<audio id="music">`. Mesurée à 120,03 BPM, stable ; tête coupée de 0,115 s pour poser le premier temps sur t=0 : chaque 0,5 s tombe sur un temps, chaque 2 s sur une mesure. Pour une autre durée, recouper depuis `videos/renders/music-lab-classique-v4/W1-lyria35-master.wav` (67 s) avec un fondu de sortie de 1,5 s. Lyria 3.5 ne prend pas de BPM en paramètre : l'écrire dans le prompt, puis mesurer et recaler. Ne pas utiliser les SFX fournis par le skill `media-use` sans demande explicite.

Visuels :

- Les transitions sont construites dans `index.html`, sans bloc du catalogue : allumage de l'hémicycle à 2,5 s par le glitch en barres (`fragment()` en mode `scatter`), zoom dans l'écran à la fin du hook, voyage de case en case puis dézoom dans la mosaïque de Q3, glitch en barres vers Q4, ouverture des tuiles des temps forts (`fragmentTile()`), poussée dans la lumière des rails vers les intervenants (`lightGate()`). De Q4 à Q7, les temps sont écrits en temps d'origine dans une sous-timeline décalée de `Q3_EXTRA - INTRO_HOLD_TRIM` : ne jamais ajouter ce décalage une seconde fois. Texte en deux couches : classe `.lay` et `layIn()`. Étiquette argentée : `.pass`, remplie par `fillPass()`, et `stick()` ; la variable `--fold` règle le coin décollé.
- La carte soirée (ancienne C10) est supprimée : le DJ set est un temps fort de C08, illustré par la boule à facettes entière (`mirror-ball-v1`). Les deux vues de l’hémicycle sont intégrées sans bordures d’affiche ; les originaux Midjourney restent hors du repo. La puce au cœur orange retenue le 04/11 est intégrée à l’écran et en plein cadre.
- Logos partenaires : `DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib uv run --with cairosvg --with pillow --with numpy python -I tools/partners_mono.py <dossier-logos>` (nécessite `brew install cairo`). Reporter dans `PARTNER_ROWS` le ratio affiché et le `logoOpticalScale` du partenaire sur le site (1 s’il n’en a pas) : la taille des logos suit la même formule que la page partenaires du site. Sources : le `monochromeLogo` du partenaire, sinon son `logo`.
- Les assets du film sont une copie figée et élaguée, sauf les portraits : `film/assets/speakers` et `film/assets/team` sont des liens symboliques vers `public/speakers/` et `public/organisateurs/` du site, pour ne pas dupliquer les photos. Pour le reste, toujours copier la version `-optimized` depuis `public/` et ne jamais référencer un fichier hors de `film/assets/`.

Formats verticaux : à refaire depuis le film final. L'ancien script de lab, écrit pour le premier film, a été retiré le 04/11.

## Données

Speakers, partenaires, sessions, prix et horaires viennent du site : `src/content/` (speakers, partners, sessions), `src/content/event.json`, `src/content/pricing.json`, images dans `public/`. Ne rien inventer. Pas de chiffre de places restantes qui ne viendrait pas de Billetweb.

Le film (`SPEAKERS`, `PARTNER_ROWS` dans `index.html`) et l'habillage (`SESSIONS` dans `habillage-captation/bumpers.html`, `PARTNER_LOGOS` dans `board.html`) sont des copies figées. Ils prennent du retard sur le site et sont régénérés depuis `src/content/` sur demande. Portraits du film : rien à copier, `film/assets/speakers` pointe sur `public/speakers/` ; `SPEAKERS` reprend le nom de fichier du champ `photo` de chaque speaker.

## Habillage captation (`habillage-captation/`)

Pages HTML ouvertes dans un navigateur ou chargées comme source navigateur dans OBS. Pas de rendu vidéo.

```bash
python3 -m http.server 8000                                        # board.html, deroule.html (rendu final écran par écran), bumpers.html?session=<slug>
uv run --with pillow python scripts/build_single_html.py .         # fichier unique hors ligne, ignoré par git
```

Portraits : source unique, le site. `scripts/normalise_faces.py [slug ...]` (OpenCV) lit le champ `photo` de chaque speaker dans `src/content/speakers/` et écrit seulement les recadrages dérivés dans `assets/speakers/norm/`, à taille de visage et ligne des yeux constantes. Sans argument, il traite tous les speakers de `SESSIONS`. L'habillage ne garde aucune copie des photos : pour changer un portrait, on change la photo du site puis on relance le script. Commande : `uv run --with "opencv-python-headless<5" --with numpy --with pyyaml python videos/habillage-captation/scripts/normalise_faces.py`.

## Sorties et git

- On ne produit que la version à partager (H.264 deux passes à 3 Mb/s, environ 23 Mo pour une minute, -14 LUFS) : `tools/render.sh` rend le master HyperFrames (~300 Mo) dans un dossier temporaire et le supprime. Pas de suffixe `-light`, pas de master conservé.
- Tous les rendus, aperçus et fichiers de contrôle vont dans `videos/renders/`, ignoré par git. Les MP4 se partagent par Drive, jamais dans le repo.
- Un seul rendu final, sans numéro de version : `videos/renders/film.mp4`, avec sa vignette LinkedIn `videos/renders/vignette-linkedin.jpg` (dernière image de l'affiche finale, 1920 × 1080). Le reste n'est que du travail temporaire (Dorian, 04/11/2026). Une fois la version finale validée, les essais, captures, labos, variantes de films et anciens rendus se suppriment ; seule la source de la musique en cours reste (`music-lab-classique-v4/`).
- Quand une décision du film change, mettre à jour `film/BRIEF.md` (brief final, sans historique). Quand l'outillage change, mettre à jour cette règle (`.claude/rules/videos.md`) et `GUIDE.html`.
