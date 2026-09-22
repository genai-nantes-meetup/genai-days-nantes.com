---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/components/HeroAffiche.astro","src/components/LandingStory.astro","src/components/Footer.astro","src/pages/programme.astro"]
---

# Surface brief · lecture éditoriale unique

## Scope

- Surface principale : `src/pages/index.astro`
- Blocs liés : hero, récit éditorial, footer et page programme
- Cible : décideurs, responsables produit, équipes data, IA et développement confrontés à l’IA générative en production
- Action principale : comprendre la proposition, choisir un parcours puis consulter le programme ou réserver

## Intention

L’affiche éléphant reste le pic principal et l’expression la plus spectaculaire de la direction artistique. Après le hero, la landing rééquilibre narration et utilité sans perdre les images caractéristiques de la marque.

Le blanc de la direction artistique n’est pas un fond continu. Il devient une matière cadrée : feuille, panneau, projection ou marge. Le crème reste le sol de lecture. Le bleu, l’orange et les respirations blanches maintiennent subtilement l’écho civique français sans transformer la page en drapeau littéral.

## Scénario unique

### `/` · éditorial clair

- Scroll natif et lecture rapide.
- Après le hero, deux rails extérieurs continus relient les sections sur un conteneur commun de 78rem. Seules les séparations de section traversent le viewport. Les autres traits restent confinés entre les rails, et les axes intérieurs aux blocs réellement segmentés. Les repères carrés orange signalent seulement les coins extérieurs des sections, jamais une séparation entre titre et contenu.
- Un manifeste en deux colonnes ouvre la partie éditoriale dans la fin de course du hero. L’auditoire illustré porte le collectif à gauche. À droite, le texte relie les POC, la production, les coûts et la maîtrise des données aux deux parcours de la journée. La section utilise les rails de 78rem sans axe central entre le visuel et le texte.
- Enjeux présentés dans une liste entièrement visible, sur le même conteneur de 78rem que les intervenants. Une respiration courte de 4rem à 4.75rem sépare le manifeste du titre. Le titre et son introduction occupent une première rangée pleine largeur avec le même retrait que les sujets. La liste occupe ensuite 61.25% de la rangée et rejoint sans gouttière la cellule visuelle de 38.75%. L’image carrée s’aligne de « Coûts » à « Production », puis s’adapte au survol, au focus et au clic par un balayage d’encre directionnel. Aucun padding bas ne sépare ce contenu de la section suivante.
- Les intervenants reprennent exactement les mêmes rails, le même retrait de titre et le même niveau typographique que les enjeux. Le titre et le chapô précèdent un carrousel horizontal en boucle de vingt emplacements, avec portraits confirmés et annonces à venir clairement distingués.
- Parcours présentés comme une matrice éditoriale consultable.
- Après le programme, la preuve communautaire transforme le doute lié à une première édition en confiance dans la capacité d’organisation. Un index vertical permet de choisir entre SHIFT, Generative AI Nantes et GenAI France. La fiche active et sa bande de preuves changent ensemble au clic ou au clavier. Sur mobile et tablette, l’index précède un bloc actif unique, puis les preuves suivent immédiatement. La bande affiche trois éléments, annonce le volume total et boucle horizontalement par boutons, clavier ou geste tactile. Chaque état conserve trois chiffres et sa matière propre. Les avatars SHIFT restent petits et natifs, les avis Meetup restent textuels, et seules les photographies d’événements en définition suffisante occupent un grand format.
- Le pass est un billet imprimé composé directement dans `LandingStory.astro`. Son corps crème et sa souche bleue restent responsives. Le prix, la date, le lieu, l’horaire, la capacité et les prestations sont des données HTML issues des constantes du projet.
- Le footer prolonge le champ visuel avec le Château des ducs de Bretagne, une trame inversée et un voile nuit progressif qui protège la lisibilité des liens.
- Blanc réservé aux feuilles et panneaux, posés sur le papier crème.
- Les sorties éditoriales des sections utilisent un CTA plat bleu, texte blanc et flèche. La réservation reste orange afin de conserver une hiérarchie commerciale distincte.

## Parcours commun

1. L’affiche porte la promesse et l’identité.
2. Le manifeste pose le parti pris commun aux deux parcours.
3. Les quatre enjeux qualifient le problème.
4. Les intervenants apportent une preuve humaine, avant l’introduction des deux parcours.
5. La section Décider et Déployer permet de comparer les deux parcours et leurs temps forts.
6. La preuve communautaire établit la capacité d’organisation, l’ancrage nantais et la portée nationale de l’équipe.
7. Les partenaires, le ticket et le footer ferment le parcours avec une action de réservation unique.

## Grammaire visuelle

- EB Garamond pour les prises de parole éditoriales, Arial pour les informations fonctionnelles.
- Angles francs, lignes fines, peu de rayons et ombres réservées aux objets physiques.
- Images de DA utilisées comme structure, pas comme décoration isolée.
- Blanc matériel, crème éditorial, bleu électrique, orange signal, encre charbon.
- Le mouvement ne porte aucune information exclusive.

## Contraintes

- Conserver le hero éléphant, sa dissolution et les composants typographiques officiels du nom de l’événement.
- La composition actuelle du billet dans `LandingStory.astro` fait autorité. Aucun ancien mock ne doit la remplacer ou la piloter.
- L’URL de billetterie reste un placeholder technique à remplacer avant la mise en ligne commerciale.
- `prefers-reduced-motion` et le mobile conservent une composition statique complète.
- Le scroll reste natif et ne retient jamais une information derrière des paliers.

## Vérification du 17 août 2026

- `pnpm run build` : réussi.
- Suite complète : 120 tests réussis.
- La route `/` sert une seule version, sans attribut de variante ni profil de scroll alternatif.
- Les anciennes variantes pilotées par query string et leurs assets ont été supprimés.
- La composition actuelle du billet et du footer est la seule référence validée. Aucun mock externe ne la pilote.
