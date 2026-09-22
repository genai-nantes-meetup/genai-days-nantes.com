---
name: GENAI DAYS
description: "L’Affiche manifeste d’un futur civique"
colors:
  paper-cream: "#F9F4EC"
  paper-cream-deep: "#F2EADF"
  paper-white: "#FFFFFF"
  electric-blue: "#3D43CE"
  signal-orange: "#FE4D1B"
  ink-charcoal: "#393636"
typography:
  display:
    fontFamily: "EB Garamond Variable, EB Garamond, Georgia, serif"
    fontSize: "clamp(3.5rem, 12vw, 8rem)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "EB Garamond Variable, EB Garamond, Georgia, serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  title:
    fontFamily: "EB Garamond Variable, EB Garamond, Georgia, serif"
    fontSize: "clamp(1.5rem, 3vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.05
  subtitle:
    fontFamily: "EB Garamond Variable, EB Garamond, Georgia, serif"
    fontSize: "clamp(1.5rem, 3vw, 2rem)"
    fontStyle: italic
    fontWeight: 600
    lineHeight: 1.05
  body:
    fontFamily: "Arial MT Pro, Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Arial MT Pro, Arial, Helvetica, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.12em"
rounded:
  sharp: "0"
  label: "0.5rem"
  card: "1rem"
  feature-card: "1.5rem"
  pill: "999px"
spacing:
  page-gutter: "1.5rem"
  content-gap: "1.5rem"
  section-block: "clamp(5rem, 9vw, 7.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.electric-blue}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.sharp}"
    padding: "0.75rem 1.5rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.signal-orange}"
    rounded: "{rounded.sharp}"
    padding: "0.75rem 1.5rem"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.electric-blue}"
    rounded: "{rounded.sharp}"
    padding: "0"
  content-card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.card}"
    padding: "1.5rem"
---

# Design System: GENAI DAYS

## Overview

**Creative North Star: "L’Affiche manifeste d’un futur civique"**

Le système visuel transpose une campagne culturelle imprimée dans un produit web. Il associe l’autorité d’une composition éditoriale, l’énergie d’une affiche sérigraphiée et une imagerie spéculative où l’IA devient un sujet collectif, territorial et infrastructurel. Les scènes monumentales, les portails, les grilles, les architectures et les foules rendent les enjeux plus grands que les outils eux-mêmes.

L’image est une structure, jamais un remplissage. Elle ouvre les surfaces, donne leur rythme aux sections et porte une palette volontairement limitée, avec grain, trame, contrastes francs et décalages d’encre. Le site répond par de grandes plages de papier, une typographie Garamond expressive et une composition qui accepte l’asymétrie, les changements d’échelle et les superpositions.

Les éléments d’interface restent majoritairement plats et rectilignes. Le relief appartient aux objets physiques de la marque : billets, badges, étiquettes métalliques et stickers légèrement tournés, décollables ou posés sur l’image. Cette distinction maintient la lisibilité du produit sans perdre la matérialité singulière de la direction artistique.

**Key Characteristics:**

- Palette courte, saturée et immédiatement reconnaissable.
- Imagerie rétrofuturiste monumentale, civique et collective.
- Hiérarchie éditoriale à très fort contraste d’échelle.
- Papier, encre, métal brossé, trame et défauts d’impression assumés.
- Interface plate, objets de marque tactiles et physiquement présents.

## Colors

La palette agit comme un jeu d’encres sur papier. Le bleu et l’orange se confrontent directement, tandis que le crème, le blanc et le charbon organisent la lecture et la respiration.

### Primary

- **Bleu électrique** : fond de marque, grands champs, parcours décision et actions principales.

### Secondary

- **Orange signal** : accents, parcours Ceux qui implémentent, mots d’appel, repères actifs et ombres d’encre.

### Neutral

- **Papier crème** : fond éditorial principal et surface de lecture chaude.
- **Papier blanc** : cartes, respirations nettes et zones nécessitant un contraste maximal.
- **Noir d’encre** : texte, traits, pictogrammes et contrepoint graphique.

### Named Rules

**The Three-Ink Rule.** Le bleu électrique, l’orange signal et le noir d’encre portent l’identité. Le crème et le blanc servent de papier. Aucune nouvelle couleur saturée n’entre dans le système sans source de marque confirmée.

**The Orange Signal Rule.** L’orange attire l’œil sur un mot, un état, une bordure ou une action. Il ne devient pas une couleur de texte courant ni un fond systématique.

**The Orange Field Contrast Rule.** Lorsqu’un grand aplat orange porte du contenu, son encre de lecture est le charbon. Le blanc n’est pas utilisé pour le texte courant, les titres ou les métadonnées sur cette surface.

## Typography

**Display Font:** EB Garamond Variable, avec EB Garamond, Georgia et serif en repli.

**Body Font:** Arial MT Pro, avec Arial, Helvetica et sans-serif en repli.

**Functional Font:** Arial MT Pro gras, avec Arial, Helvetica et sans-serif en repli.

**Character:** Garamond donne aux titres l’autorité d’une affiche culturelle et permet des italiques expressives. Arial porte les explications longues, la navigation et les informations fonctionnelles sans concurrence.

### Hierarchy

- **Display** (800, `clamp(3.5rem, 12vw, 8rem)`, 0.86) : titres de page courts et déclaratifs.
- **Headline** (800, `clamp(2.25rem, 5vw, 3rem)`, 0.95) : titres de section et grandes manchettes.
- **Title** (600 romain, `clamp(1.5rem, 3vw, 2rem)`, 1.05) : sous-sections, noms et accroches internes.
- **Subtitle** (600 italique, `clamp(1.5rem, 3vw, 2rem)`, 1.05) : sous-titres et repères éditoriaux courts.
- **Body** (400, `1rem`, 1.65) : lecture continue, idéalement limitée à environ 70 caractères par ligne.
- **Label** (700, `0.75rem`, `0.12em`, uppercase) : horaires, formats, statuts et métadonnées compactes.

Les compositions éditoriales utilisent également des tailles fluides intermédiaires lorsque le cadrage l’exige, notamment pour les wordmarks, les affiches, le ticket et les portraits. Ces valeurs restent propres à leur composant et ne constituent pas de nouveaux niveaux sémantiques.

### Named Rules

**The Wordmark Rule.** Toute occurrence visible du nom est rendue en uppercase Garamond romain, avec `GENAI` gras, `DAYS` régulier et seulement `AI` en italique. Le texte littéral passe par `EventName.astro`. Les chaînes rendues par expression passent par `BrandText.astro`.

**The Italic Accent Rule.** L’italique signale le `AI` du wordmark, les sous-titres et les emphases éditoriales courtes. Les titres de page et de section restent en romain afin de préserver une hiérarchie stable.

**The Editorial Contrast Rule.** Garamond affirme. Arial explique, indexe et guide les interactions. Ces rôles ne sont pas interchangeables et une police système générique ne remplace jamais la voix display.

## Layout

Le site utilise des conteneurs centraux compris entre 72rem et 80rem, avec une gouttière mobile récurrente de 1.5rem. Les sections disposent de respirations verticales généreuses et alternent champs colorés, papier crème, papier blanc et images structurantes. Les titres courts peuvent occuper une largeur disproportionnée. Les textes longs restent dans des colonnes plus étroites.

La grille n’est pas un catalogue uniforme. Les pages éditoriales se lisent comme un champ continu plutôt que comme une suite de modules marketing isolés. Une surface doit identifier son élément dominant, puis organiser les informations secondaires autour de lui. Les visuels peuvent être plein cadre, recadrés comme une affiche ou traversés par une étiquette physique. Sur mobile, la hiérarchie est conservée par empilement, réduction des cadrages et maintien des contrastes, pas par suppression des éléments de marque.

**The Poster Field Rule.** Chaque grande surface possède un champ dominant, image, manchette ou objet physique. Éviter les suites de cartes identiques qui diluent le rythme éditorial.

**The Landing Rhythm Rule.** La landing possède trois pics visuels&nbsp;: le hero, les deux parcours et le ticket. Les enjeux restent compacts. Les intervenants, le programme et les partenaires utilisent des conteneurs de 72rem à 80rem, des colonnes de lecture étroites et des respirations verticales généreuses. Les intervenants forment un carrousel horizontal en boucle qui mêle portraits confirmés et emplacements d’annonce sans masquer l’état de la programmation. Après le hero, le papier crème reste continu&nbsp;: les rails, les séparations, les images et les changements de densité ponctuent les sections sans alternance systématique de fond. Deux pics visuels ne se suivent jamais sans une section textuelle ou structurée plus calme.

**The Track Mark Rule.** Les parcours utilisent deux pictogrammes Lucide monochromes&nbsp;: une longue-vue pour Ceux qui décident, une clé plate pour Ceux qui implémentent. La première occurrence structurante d’une page associe toujours le pictogramme à son libellé. Les contextes compacts déjà précédés par cette introduction peuvent conserver le pictogramme seul comme repère décoratif. La légende porte le sens, aucune interaction ni tooltip ne répète cette information. La forme différencie les parcours, la couleur reste disponible pour les rares accents de structure.

**The Speaker Wall Rule.** La page `/speakers` privilégie un mur dense de dix-neuf portraits plutôt qu’une succession de fiches éditoriales pleine largeur. Chaque case confirmée est entièrement cliquable et présente le visage, puis un cartouche distinct avec le nom, le rôle et l’entreprise. Le cartouche reste hors du cadre photo et ne masque jamais le portrait. Le parcours sort de la pile typographique et utilise le repère défini dans la présentation des deux parcours&nbsp;: une longue-vue pour Ceux qui décident, une clé plate pour Ceux qui implémentent. Sur les cartes, le pictogramme monochrome reste un repère statique placé dans un emplacement stable du cartouche. Les cases partagent une grille bord à bord de quatre colonnes avec des séparations d’un pixel et des images monochromes. Les intervenants confirmés sont classés par notoriété, puis les profils non classés par ordre alphabétique. Tant que le casting reste incomplet, chaque emplacement à venir conserve le même gabarit sans inventer de profil.

**The Partner Wall Rule.** La progression de la landing vers `/partenaires` adapte le ruban mouvant de logos en un tableau de soutiens compact, distinct du mur de portraits. Sur la landing, la Région co-organisatrice occupe une place fixe à droite du titre, avec une phrase factuelle sous celui-ci. Les autres partenaires conservent les deux rubans mouvants. Un hero panoramique bas installe la page `/partenaires`, puis trois rangées denses hiérarchisent les organisations sans nommer leur niveau de partenariat. Sur grand écran, la première rangée utilise cinq colonnes&nbsp;: la Région en occupe deux, chacun des trois autres partenaires majeurs en occupe une. Les sept emplacements intermédiaires tiennent sur sept colonnes et le registre ouvert sur huit colonnes plus compactes. Sur tablette, la Région prend une rangée entière au-dessus des trois autres partenaires majeurs. La différence se lit dans la largeur, la hauteur et l’échelle du logo, pas dans un label ni dans une encre différente. Les logos restent monochromes au repos, retrouvent leur couleur au survol ou au focus et chaque case confirmée ouvre directement le site officiel, avec un pictogramme de lien externe sur le registre. Les emplacements non attribués gardent le gabarit de leur rang sans inventer d’organisation et utilisent une surface de papier discrète plutôt qu’un grand aplat nuit. Une fiche interne ne revient que lorsqu’une organisation dispose d’un contenu éditorial propre qui justifie cette étape.

**The Editorial Guide Grid Rule.** Après l’affiche, toute la landing partage deux rails extérieurs alignés sur le conteneur de `78rem`. Seule la séparation horizontale qui démarque une section se prolonge jusqu’aux bords du viewport. Les autres traits horizontaux s’arrêtent aux rails extérieurs. Un axe intérieur n’existe que dans les limites du bloc de contenu qu’il segmente, jamais derrière son titre ou dans les respirations voisines. Les petits carrés orange marquent uniquement les coins extérieurs des sections. Aucun carré ne ponctue une séparation entre titre et contenu ni une division interne. La grille est donc un système de cadres locaux reliés par deux rails, jamais un motif répété en arrière-plan. Sur mobile, seuls les rails extérieurs et les séparations de section subsistent.

**The Manifesto Split Rule.** La partie éditoriale commence par un manifeste calme en deux colonnes dans la fin de course du hero. Le visuel collectif occupe la cellule gauche et le texte la cellule droite, sans séparation verticale. Le bloc traduit les deux parcours en une prise de position commune&nbsp;: dépasser les promesses, arbitrer les usages, les coûts et les données, puis confronter ces décisions à la production. Cette section conserve une densité de lecture mesurée avant l’index compact des enjeux.

**The Issue Index Rule.** La section suit le manifeste et son contenu apparaît après une respiration courte de `4rem` à `4.75rem`, sans écran vide ni délai théâtral. Sur desktop, le titre et son introduction occupent une première rangée pleine largeur, avec le même retrait intérieur que les sujets. La liste des quatre enjeux et le champ visuel associé partagent ensuite une seconde rangée. Le bord supérieur de l’image s’aligne sur « Coûts » et son bord inférieur sur « Production ». La colonne texte occupe `61.25%` du conteneur de `78rem` et rejoint directement la cellule visuelle de `38.75%`. Ce rapport permet au carré d’être centré dans sa zone sans gouttière ni recadrage brutal. Le contenu se raccorde directement à la section suivante, sans padding bas. Le survol, le focus et le clic déplacent l’emphase sans retenir le scroll ni masquer le texte. La sélection utilise une seule encre bleue pour son titre, son filet et son balayage directionnel de `620ms`. Le fond crème approfondi apporte le contraste sans introduire un second accent. Sur mobile, chaque enjeu conserve son image carrée dans le flux normal. Aucune information ne dépend de l’interaction et la réduction de mouvement supprime le balayage.

**The Programme Matrix Rule.** La section « Deux parcours + programme » reste dans le flux natif. Le panorama introduit les deux voies, puis les colonnes Ceux qui décident et Ceux qui implémentent et les trois temps du programme restent visibles dans une matrice éditoriale. Le lien vers le programme complet suit la matrice et referme la section. Sur mobile, la même information s’empile sans changer d’ordre sémantique.

**The Venue Spotlight Rule.** Entre les partenaires et le billet, la landing présente l’Hôtel de Région sous un en-tête éditorial aligné à gauche avec le même retrait que l’introduction du programme et la section partenaires. Le titre situe la journée au bord de la Loire et la phrase précise le rôle du lieu sans répéter le statut de la Région. Sur desktop, l’illustration bichrome historique du bâtiment occupe environ un tiers de la largeur. Le panneau pratique utilise les deux tiers restants. La date, l’accueil et l’adresse forment une ligne de synthèse dont seuls les éléments sont séparés. La seconde ligne place le lien vers les informations pratiques au-dessus d’une carte d’accès agrandie, puis regroupe sur la même hauteur les transports les plus proches, le stationnement et l’entrée, séparés entre eux sans cadre extérieur. Il ne reprend ni la liste exhaustive des transports, ni les hôtels de la page dédiée. Le logo de la Région n’est pas répété dans cette section puisqu’il apparaît déjà dans la section partenaires adjacente. Sur mobile, l’en-tête, l’illustration puis le panneau pratique s’empilent sans superposition.

**The Admission Ticket Rule.** Le pass est composé dans `AdmissionTicketSection.astro`, repris tel quel par `LandingStory.astro`, `programme.astro` et `speakers/index.astro`, comme un billet imprimé en deux parties&nbsp;: corps crème informatif et souche bleue détachable. Son fond illustré reste décoratif. Le prix, la date, le lieu, l’accueil, la capacité et les prestations restent en HTML et proviennent des constantes du projet. L’implémentation courante fait autorité sur tout ancien mock.

**The Practical Guide Rule.** La page `/infos-pratiques` reprend le hero photographique compact des sous-pages et fait apparaître immédiatement une bande basse de faits essentiels. Le contenu suit trois chapitres utilitaires sans numéro ni eyebrow&nbsp;: rejoindre le lieu, trouver l’entrée accessible et dormir à proximité. Sur desktop, chaque chapitre oppose une introduction courte à son information détaillée. Sur mobile, le même ordre s’empile sans masquer de contenu. Les transports et hébergements utilisent des registres à filets, le bleu reste réservé aux liens et la note PMR adopte une surface crème calme. Sur la landing, le header mène directement à cette page et le billet conserve un lien contextuel «&nbsp;Préparer ma venue&nbsp;».

**The Press Room Rule.** La page `/press-kit` se lit comme un dossier de presse déroulé et privilégie quatre gestes&nbsp;: comprendre, copier, télécharger et demander une interview. Le hero photographique compact expose le contenu du ZIP et le contact presse, sans billetterie. Après ce hero, toutes les sections partagent un papier crème continu. La grille, les filets et les changements de densité organisent la progression sans alterner des aplats blanc, crème et nuit. Les téléchargements prennent la forme de fiches-fichiers en papier avec format, poids et pictogramme dédié. La copie utilise un contrôle sans cadre avec deux feuilles superposées&nbsp;: la feuille se range dans la pile, puis un check se dessine pendant l’affichage du retour. Les demandes presse utilisent une commande éditoriale avec enveloppe, sans reprendre les boutons marketing ni le langage de la billetterie. La première section réunit le résumé publiable et la fiche factuelle. Trois angles éditoriaux remplacent les répétitions de positionnement et conduisent directement aux ressources. Les deux aperçus partagent une même surface de papier approfondi et ne deviennent jamais des affiches plein cadre. Chaque footer conserve deux niveaux, le titre puis une ligne fonctionnelle qui réunit format et règle d’usage. Le crédit du visuel et les règles du symbole restent attachés à leur fichier respectif, jamais fusionnés dans une note transversale. Deux porte-paroles identifiés remplacent l’annuaire de l’équipe, dont les portraits complets restent dans le ZIP et dont le roster complet vit sur `/equipe`. La page ne déplie ni charte graphique exhaustive, ni liste de liens génériques, ni mur d’organisateurs.

**The Team Roster Rule.** La page `/equipe` répond à une question de confiance, pas de notoriété&nbsp;: qui porte l’événement et sur quel périmètre. Elle reprend le hero photographique compact des sous-pages, puis transpose la planche équipe du deck sponsors après une respiration courte, sans introduction intermédiaire qui répète le hero. Les six panneaux verticaux sont bord à bord et séparés par des filets orange qui sont la matière du mur, pas une bordure posée sur chaque fiche. Sur desktop, chaque colonne reprend la largeur native de sa tuile afin de restituer le portrait entier sans zoom ni recadrage. Les portraits sont les tuiles de l’illustration du deck, découpées sur ses propres filets, et non des photographies retraitées&nbsp;: leur bichromie bleue et leur lumière de bord orange sont peintes dans l’œuvre, un filtre appliqué à des portraits photographiques ferait tomber l’orange au hasard sur des zones claires du visage. Chaque panneau porte, posée sur le bas de l’image et légèrement pivotée, une étiquette du site, le composant `Label` dans sa variante compacte, avec le wordmark, le rôle en italique capitale et le nom en Garamond. Les rotations et les hauteurs alternent pour que la ligne ne s’aligne pas au cordeau, et la plaque reste assez basse pour ne jamais couvrir un visage. La fonction du quotidien et le lien LinkedIn descendent sous le panneau, sur papier crème, hors du champ illustré&nbsp;: le panneau reste une image, pas une carte. Les fiches d’une même rangée partagent la hauteur de leur piste, la légende occupe ce qui reste et son lien se cale sur une ligne de base commune. Le lien LinkedIn est la seule sortie individuelle, jamais une adresse. La page se referme sur un renvoi vers `/contact`, qui reste le seul endroit où une coordonnée est servie. Sur la landing, l’accès passe par un raccourci discret dans la preuve communautaire, là où l’équipe est déjà évoquée, et non par une section supplémentaire en fin de page.
**The Community Proof Rule.** Après le programme, la preuve communautaire transforme le doute lié à une première édition en confiance dans la capacité d’organisation. Un index vertical permet de choisir entre SHIFT, Generative AI Nantes et GenAI France en distinguant trois fonctions&nbsp;: organiser un événement exigeant, animer la communauté nantaise et participer à un réseau national. Une seule fiche et sa bande de preuves sont visibles à la fois, puis changent ensemble au clic ou au clavier. Sur mobile et tablette, l’index précède la fiche active, puis les preuves suivent immédiatement. Chaque état conserve l’identité, le rôle, trois chiffres et une matière propre. La bande de preuves affiche trois éléments, annonce le volume total et boucle horizontalement par boutons, clavier ou geste tactile, sans défilement vertical interne. Les avatars restent à leur taille native. Seules les photographies d’événements en définition suffisante occupent un grand format.

**The Footer Echo Rule.** Le footer ne répète ni le titre, ni l’étiquette, ni les actions du hero. Il se comporte comme le dernier plan d’un film&nbsp;: une vue bichrome du Château des ducs de Bretagne, cadrée sur ses tours et installée après une introduction de `24–32svh`. Le haut de l’affiche se révèle sur une courte bande mate qui laisse sa propre fragmentation rectangulaire porter la transition. L’image se prolonge derrière toute la navigation, sans aplat intermédiaire. Une ombre nuit stable d’environ `90%` préserve la lecture des quatre colonnes, puis l’image s’éteint rapidement après ce bloc en deux paliers successifs. Le Château reste présent et le mouvement se limite à un lent recalage du cadre, supprimé en réduction de mouvement. Aucun shader ni second langage de trame ne concurrence l’image.

## Elevation & Depth

Le système est plat par défaut. Les changements de fond, les bordures, les aplats et les contrastes d’encre suffisent à séparer les surfaces. Le relief apparaît seulement lorsqu’un élément se comporte comme un objet posé ou soulevé : bouton imprimé, badge, ticket, sticker, carte portrait ou dialogue au-dessus de la page.

### Shadow Vocabulary

- **Décalage d’encre** (`0.3rem 0.3rem 0 0`) : ombre dure orange ou bleue des boutons principaux, réduite au survol comme un recalage d’impression.
- **Carte au repos** (`0 1.25rem 3.5rem rgb(20 25 60 / 5%)`) : présence légère des portraits et cartes éditoriales.
- **Carte soulevée** (`0 1.5rem 4rem rgb(20 25 60 / 9%)`) : réponse discrète au survol, accompagnée d’une translation de `-0.2rem`.
- **Objet métallique** : combinaison de petits reliefs externes et d’une ombre interne pour rendre la feuille brossée sans transformer toute l’interface en skeuomorphisme.

### Named Rules

**The Print-Flat Rule.** Une surface d’interface reste plate tant qu’elle ne représente pas un objet physique ou un niveau modal. Les ombres ambiantes décoratives ne servent jamais à compenser une hiérarchie faible.

**The Static Motion Rule.** Le mouvement révèle une matière ou une profondeur sans porter d’information exclusive. Lorsque `prefers-reduced-motion` est actif, la composition reste complète et lisible dans un état statique.

## Shapes

Les boutons, navigations, grandes plages et compositions éditoriales privilégient les angles droits. Les rayons appartiennent aux objets qui les justifient : cartes portrait, panneaux, badges et étiquettes. Les formats d’étiquette varient entre rectangle, carré, ovale et triangle. Une légère rotation renforce leur présence physique sans devenir une décoration systématique. Les pastilles circulaires sont réservées aux actions sociales et aux petits contrôles.

**The Physical Corners Rule.** Un rayon décrit une matière ou une fonction, jamais une douceur générique appliquée à tous les composants.

## Components

### Buttons

- **Shape:** angles droits, bordure de 2px et padding de `0.75rem 1.5rem`.
- **Reservation:** orange signal assombri à 80% avec l’encre nuit, texte blanc et libellé de billetterie. Ce contraste de 4,80:1 et cet aplat sont exclusifs aux actions de réservation, du header au pass participant.
- **Primary:** bleu électrique, texte blanc uppercase et ombre dure nuit décalée de `0.3rem`.
- **Secondary:** fond transparent, contour et texte bleus, léger aplat bleu au survol.
- **Tertiary:** lien bleu sans boîte, souligné seulement au survol.
- **Editorial:** lien bleu en Arial MT Pro gras, souligné et accompagné d’une flèche. Il porte les sorties vers les pages secondaires sans concurrencer les actions de conversion.
- **Hover / Focus:** recalage de l’ombre en 150ms, retour tactile à `0.96` au clic et focus visible à fort contraste.

### Cards / Containers

- **Speaker carousel cards:** portrait vertical plein cadre ou emplacement d’annonce assumé, identité posée dans un bandeau inférieur. Le parcours n’apparaît pas dans ce bloc, car les deux parcours sont introduits plus loin dans la landing. Le rail boucle au clavier, aux boutons et au geste tactile.
- **Schedule cards:** surface blanche rectiligne, bord gauche bleu ou orange, illustration compacte et métadonnées très lisibles.
- **Editorial containers:** rayon de 1rem seulement lorsque la surface fonctionne réellement comme une carte ou un accordéon.
- **Shadow Strategy:** ombre très faible au repos, relevée uniquement au survol ou pour un niveau modal.

### Navigation

Le header est une barre sticky à trois zones et de hauteur fixe. Lorsqu’une page commence par une affiche immersive, il se pose discrètement sur l’image puis matérialise progressivement une bande de papier crème à la sortie du hero, sans modifier son padding ni déplacer le contenu. Le logo porte le retour à l’accueil. La navigation primaire, composée en Arial MT Pro gras, relie le programme, les intervenants, les partenaires et les infos pratiques. Le menu ne pointe que vers des pages, jamais vers des ancres de la home, et chaque destination n’y figure qu’une fois. Le menu Explorer regroupe les pages annexes : espace presse, équipe, association et code of conduct. La billetterie reste l’unique action commerciale permanente. La page courante est signalée par une pastille orange sous le texte.

Sur mobile, la billetterie devient une zone fixe en bas de l’écran. À partir du format tablette, elle rejoint le header tandis que la navigation peut rester dans le menu. Sur grand écran, le header réunit logo, navigation complète et CTA.

**The Hero Focus Rule.** Le premier écran porte une seule proposition forte. Le nom de l’événement reste dans le header, le titre occupe l’affiche, l’étiquette rassemble les métadonnées pratiques et aucun second CTA ne concurrence la billetterie permanente. Les retours de ligne du titre sont composés explicitement, puis redimensionnés par famille de formats pour conserver la même hiérarchie sans recadrage opportuniste.

### Physical Labels

L’étiquette métallique est le composant signature. Elle combine EB Garamond, grain brossé, reflets, bord double, petits reliefs, rotation, formats variables et interaction de décollage. Son contenu suit une hiérarchie stable : marque ou logo, sur-titre, nom ou titre, puis information secondaire. Les labels peuvent chevaucher l’image, mais ne doivent jamais masquer le visage ou l’information essentielle.

Dans le hero, l’étiquette devient un pass pratique&nbsp;: statut participant, date, heure d’accueil et lieu. Elle reste au-dessus de tous les calques de texte, de shader et d’image, sans zone d’évitement artificielle qui déplacerait sa position selon la largeur du viewport. La date conserve EB Garamond, tandis que la marque, l’accueil et le lieu partagent Arial MT Pro pour s’accorder avec le logotype du partenaire imprimé à côté du lieu. Classée dans la collection, l’étiquette emporte ces informations : un relais typographique reprend alors la date, le lieu et l’heure d’accueil sous le titre, et le logo de la Région fait contrepoids en bas à droite, jusqu’à ce que l’étiquette soit recollée.

**The Object Motion Rule.** Les mouvements expriment une propriété physique précise : recalage d’encre, carte soulevée, sticker posé ou coin décollé. Aucun mouvement décoratif ne flotte indépendamment du contenu et chaque état animé possède un équivalent statique.

### Admission Ticket

Le billet participant est un objet éditorial autonome, construit dans le flux de la landing. Le corps crème hiérarchise le tarif, les informations pratiques et les prestations avec une typographie de machine à écrire. La souche bleue porte la date, la ville et la capacité. Sur mobile, les deux parties s’empilent sans perdre l’ordre des informations. Aucun prix, lieu, horaire ou volume de places n’est figé dans l’image décorative.

## Do's and Don'ts

### Do:

- **Do** utiliser les illustrations comme architecture de page et non comme remplissage de carte.
- **Do** préserver la tension entre papier calme, encres saturées et noir d’encre.
- **Do** composer le texte des grands aplats orange en encre charbon.
- **Do** réserver les textures, rotations et reflets aux objets physiques de la marque.
- **Do** conserver les données du billet en HTML et les alimenter depuis `EVENT`, `PRICING` et `CTA_LINKS`.
- **Do** maintenir des titres très contrastés et des colonnes de lecture plus étroites.
- **Do** respecter la réduction de mouvement et conserver une hiérarchie complète sur mobile.

### Don't:

- **Don't** transformer le site en dashboard SaaS composé de cartes arrondies uniformes.
- **Don't** ajouter de glassmorphism, de lueurs néon multicolores ou une esthétique cyberpunk générique.
- **Don't** remplacer l’imagerie civique et monumentale par des robots, cerveaux lumineux ou interfaces holographiques génériques.
- **Don't** utiliser du texte blanc comme encre principale sur un grand aplat orange.
- **Don't** utiliser une ombre douce sur chaque surface. Le relief doit correspondre à un objet ou à un état.
- **Don't** inventer de nouvelles couleurs saturées, polices display ou formes de badge sans source dans la DA.
