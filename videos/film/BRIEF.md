---
workflow: general-video
flow: automation
storyboard: yes
message: "GENAI DAYS, 17.11.2026 à l'Hôtel de Région, Nantes : l'intelligence artificielle, ici et maintenant."
destination: web
aspect: 1920x1080
language: fr
audience: décideurs et équipes techniques de l'écosystème IA nantais
length: 54 s
angle: teaser
---

# Film GENAI DAYS · brief

## Intention

Film d'annonce sans voix off d'environ 54 s pour GENAI DAYS 2026. Il invite à se faire son propre avis sur l'IA en venant vivre une journée au cœur du sujet. L'hémicycle ouvre le film, son écran s'allume puis la caméra entre dans l'image projetée. La signature reste « L'intelligence artificielle, ici et maintenant ».

Structure en quatre blocs : **Hook** (une accroche, pas d'information), **Intro** (l'événement prend son nom), **Features** (ce que la journée apporte, les preuves), **CTA** (l'appel à l'action et la fiche pratique). Date, lieu et horaires vont à la fin : la vignette de la publication les porte aussi. Pas de logo sur la première image.

La direction artistique est celle de la section « Direction artistique vidéo » de `.claude/rules/videos.md`. Elle remplace le langage sérigraphie de la version précédente du film.

## Statut

Récit validé le 31/10/2026, sur la base du storyboard v1 (artifact « Storyboard GENAI DAYS »). Étapes suivantes, dans l'ordre : visuels séquence par séquence, puis transitions, puis musique. Le montage se recale ensuite sur le BPM de la piste retenue.

Ouverture en essai le 04/11/2026 dans `index.html` : hémicycle éteint, allumage avec reflets orange à 2,5 s, puis zoom dans l'écran de 4,25 à 5 s. Le visuel de la puce au cœur orange, validé et reçu le 04/11, est partagé entre l'écran et le plein cadre. Musique retenue : F3 synthwave nuit (Lyria, 120 BPM), en place dans le film. Durée totale : 54 s, 27 mesures. Second zoom de 8,25 à 9,25 s vers les enjeux ; coupes franches ailleurs en attendant.

## Décisions validées

- Concept « ici et maintenant ».
- Structure Hook, Intro, Features, CTA (04/11).
- Ordre des features : problèmes, programme, intervenants, soirée, partenaires.
- Les problèmes sont trois vrais titres de sessions du programme. Shadow AI reste en réserve.
- « Intervenants de premier plan. », sans chiffre : le carrousel ne montre que les speakers des conférences, pas tous les intervenants (Dorian, 04/11/2026).
- Vouvoiement partout.
- Durée : 54 s (27 mesures) une fois les temps de lecture appliqués (17 car/s, facteur 0,8). Pour raccourcir, on coupe C08 ou C05.
- Tempo 120 BPM : un temps 0,5 s, une mesure 2 s. Toutes les durées sont des multiples de 0,25 s (croches).
- Musique : W1, symphonie en sol mineur dans l'esprit de Mozart (Lyria, 120 BPM), orchestre devant, renfort discret de sub-basse et de pulsation : contraste entre une musique classique et une image digitale (04/11/2026). Remplace F3 (synthwave nocturne).

## Séquences et cartes

Durées provisoires, contrôlées par `tools/reading.py`, recalées sur la musique à la fin.

| Carte | Bloc | Début | Durée | À l'écran |
|---|---|---|---|---|
| C01 | Hook | 0 | 2,5 | « Sur l’IA, tout le monde a un avis. » Écran éteint. |
| C02 | Hook | 2,5 | 2,5 | « Venez vous faire le vôtre. » Écran allumé et reflets orange, puis zoom dans l’écran. |
| C03 | Intro | 5,0 | 3,25 | Mot-symbole GENAI DAYS, « Une journée entière au cœur de l'IA. » Aucune info pratique. |
| C04-C06 (essai) | Features · problèmes | 9,75 | 20,0 | Repris de film-alt-2 : quatre titres de sessions en plein écran sur leur illustration (« Nos POCs ne passent jamais en production », « J’ai consommé mon budget IA en mai », « Mes GPUs chauffent et ma facture grimpe », « Les Américains ont pris en otage mon SI »), 3 s chacun, puis dézoom vers la mosaïque 2×2, puis 4×4 (16 titres), puis « Ces phrases, vous les avez déjà entendues. ». Tout ce qui suit est décalé de +8 s. La musique est `music-F3-64s.wav`, avec les mesures 12-20 s répétées. Depuis la suppression de C10 et l'affiche finale raccourcie, le film dure 56 s : `music-F3-64s-cut56.wav` est cette même version coupée à 56 s, avec un fondu de 1,5 s. |
| C07 | Features · réponse | 17,5 | 6,5 | « Deux parcours, une journée pour y répondre : » puis les deux légendes (celles et ceux qui décident, celles et ceux qui implémentent) |
| C08 | Features · réponse | 24,0 | 5,0 | « rythmés par des temps forts communs : » keynotes, Startup Contest, podcast en public |
| C09 | Features · intervenants | 29,0 | 12,0 | « Intervenants de premier plan. » puis les 19 speakers des conférences (ni animateurs, ni jury, ni finalistes, ni modératrices), dans l'ordre du carrousel du site : cinq cartes par page comme sur le site (portrait, logo de l'entreprise, nom, entreprise), une page toutes les 2,75 s |
| C11 | Features · partenaires | 38,5 | 3,5 | « Nos partenaires rendent cette journée possible. » 23 logos, niveaux lus à la taille. La carte soirée (ancienne C10) est supprimée : le DJ set devient un temps fort de C08. |
| C12-C13 | CTA · affiche finale | 42,0 | 6,0 | Mot-symbole, « L'intelligence artificielle, ici et maintenant. », « Mardi 17 novembre 2026 · Hôtel de Région, Nantes · 08 h 30 à 22 h », bouton « Prenez votre place » et genai-days-nantes.com. L'étiquette argentée du site porte la date et le lieu. |

Total : 54 s, soit 27 mesures à 120 BPM.

### Mouvements par carte

- **C01 et C02.** Même hémicycle circulaire, sans bordure d’affiche. Texte sous l’écran en deux couches qui se recalent. À 2,5 s, l’écran s’allume et la salle prend les reflets orange de la variation Midjourney. La puce est intégrée au montage dans l’écran. De 4,25 à 5 s, un zoom dans son axe remplit le cadre avec cette même image. Ni date ni logo.
- **C03.** La puce occupe tout le cadre, avec exactement le recadrage obtenu à la fin du zoom. Le mot-symbole et la phrase apparaissent dans la partie basse. De 8,25 à 9,25 s, la caméra plonge vers le centre de la puce et découvre les enjeux. Ni date, ni lieu, ni étiquette : les infos pratiques sont pour la fin.
- **C04 à C06.** Mise en page fixe des enjeux : seuls le texte et l'image changent, en coupe franche sur le temps.
- **C07.** Les rails, les légendes arrivent l'une après l'autre et restent.
- **C08.** Accumulation de trois tuiles sur les temps : le cadre s'élargit à chaque ajout, rien ne sort.
- **C09.** Retour aux rails seuls, puis la caméra pousse dans la lumière au bout des voies : la page des intervenants s'y découvre à la même échelle, et le titre finit la poussée et se pose sur le temps. Deux temps sur le titre seul, puis la première page. La seconde arrive par un seul déplacement en bloc sur le temps, comme la flèche du carrousel du site, et la pagination (un segment par intervenant) suit. C'est le seul déplacement latéral du film.
- **C11.** Grille droite des partenaires par niveau, sans nom de niveau, sur cinq rangées : platine, puis or et argent sur deux rangées chacun, comme sur le site. Tailles reprises de la page partenaires du site (même formule, même `logoOpticalScale`).
- **C12-C13.** Coupe franche sur le temps vers l'affiche finale, composée comme l'affiche d'accueil du site. Le bloc est en bas à gauche, sur un dégradé de nuit et au-dessus de la barre du lecteur : mot-symbole, signature en italique orange, filet, ligne d'infos, bouton orange et adresse du site. L'étiquette argentée du site (métal brossé, sans liseré orange) arrive en haut à droite, se colle, puis son coin se décolle. C'est sa seule apparition du film. Rien d'autre ne bouge.

## Images à produire

Prompts dans la section « Images » du storyboard.

- Hémicycle (C01, C02) : originaux reçus le 04/11, bordures retirées, variation allumée recalée sur l’image éteinte. Les originaux Midjourney restent hors du repo.
- Puce (C03 et écran de C02) : version au cœur orange sélectionnée et intégrée. Une seule référence CSS `--core-art` commande les deux apparitions. Seul le WebP optimisé est dans `assets/img/`, l’original Midjourney reste hors du repo.
- Les rails (C07, C08) : version sans l'oiseau à l'horizon livrée le 04/11 (`assets/img/tracks-rails-v4-optimized.webp`, recadrée en 16:9 sans le bord crème). Source en 1456 × 816, donc agrandie d'environ 1,4 fois pour le 1080p.
- La boule à facettes : livrée le 04/11 (`assets/img/mirror-ball-v1-square-optimized.webp`). Elle illustre le DJ set dans les temps forts (C08), image entière sans recadrage.

## Contraintes

- Marque : `DESIGN.md` et `CLAUDE.md` à la racine du repo font foi pour la palette et le mot-symbole (GENAI gras, DAYS régulier, seul AI en italique). Pour l'aspect et le mouvement, la section « Direction artistique vidéo » de `.claude/rules/videos.md` prime.
- Texte à l'écran en français. Jamais de tiret cadratin. Espace insécable avant « : », « ; », « ! », « ? ».
- Aucun fait inventé. Speakers, partenaires, chiffres et horaires viennent du site (`src/content/`). Les listes `SPEAKERS` et `PARTNER_ROWS` d'`index.html` sont régénérées depuis `src/content/`.
- Temps de lecture : 17 caractères/s, minimum 0,83 s de texte immobile, facteur 0,8 (`python3 tools/reading.py`).
- Assets : copie figée et élaguée dans `assets/`, images toujours en version `-optimized`. Exception, les portraits : `assets/speakers` est un lien vers `public/speakers/` du site.
- HyperFrames figé en 0.8.140 (`package.json`). Rendu hors ligne, sans télémétrie.
- Mode d'emploi complet : `videos/GUIDE.html`.
