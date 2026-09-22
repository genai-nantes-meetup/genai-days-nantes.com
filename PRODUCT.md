# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Le public principal réunit les décideurs SI, les directions générales, les responsables innovation et les équipes techniques qui évaluent, construisent ou déploient l’IA générative, principalement dans le Grand Ouest.

Les visiteurs du site cherchent à déterminer si la journée répond à leurs enjeux, à comprendre les deux parcours, à vérifier les informations pratiques et à réserver leur place.

## Product Purpose

Le site présente et commercialise GENAI DAYS, une journée-conférence en français consacrée à l’IA générative. L’événement rapproche les personnes qui arbitrent les choix d’IA et celles qui les mettent en œuvre afin de transformer les intentions en décisions et pratiques concrètes.

Le site réussit lorsque les visiteurs comprennent rapidement à qui s’adresse la journée, ce qu’ils pourront en retirer, quel parcours leur correspond et comment réserver leur participation.

## Positioning

GENAI DAYS est le rendez-vous qui met dans la même salle celles et ceux qui décident de l’IA et celles et ceux qui la déploient, avec des retours concrets plutôt que des discours hors-sol ou un catalogue d’outils.

## Operating Context

- Événement physique organisé le 17 novembre 2026 à l’Hôtel de Région Pays de la Loire, à Nantes.
- Journée annoncée de 08:30 à 22:00, avec conférences, ateliers, temps d’accueil, pauses, déjeuner et afterwork.
- Deux parcours complémentaires : « Pour ceux qui décident » et « Pour ceux qui implémentent ».
- Les conférences sont présentées en français.
- Les captations vidéo et les retranscriptions écrites sont publiées après l’événement.

## Capabilities and Constraints

- Capacité maximale confirmée : 400 places.
- Tarif confirmé du Pass Participant : 147 € HT.
- Le pass est non remboursable et transférable à un·e collègue jusqu’à huit jours avant l’événement.
- La date, le lieu, les deux parcours, les intervenants annoncés, les partenaires et la publication des captations sont confirmés.
- Les informations factuelles doivent provenir des constantes, collections de contenu et assets du dépôt. Ne pas inventer d’intervenant, de partenaire, de témoignage, de chiffre ou de disponibilité.

## Brand Commitments

- Le nom visible de l’événement utilise le traitement officiel GENAI DAYS : uppercase Garamond romain, `GENAI` gras, `DAYS` régulier et seulement `AI` en italique. Le code utilise `EventName.astro` pour le texte littéral et `BrandText.astro` pour les chaînes rendues par expression.
- La communication publique est en français, directe, concrète et sans battage médiatique.
- Le caractère em dash est interdit dans le code et les contenus du projet.
- La typographie française utilise une espace insécable avant `:`, `;`, `!` et `?`, selon les règles définies dans `AGENTS.md`.
- Le PDF `docs/DA-genai-days-2026.pdf`, les logos, les affiches et le système visuel déjà implémenté constituent les références de marque à préserver jusqu’à une décision explicite de refonte.
- L’ancrage nantais et le lien avec la Région Pays de la Loire sont des éléments durables de l’édition 2026.

## Evidence on Hand

- Affiches et visuels web : `public/images/`.
- Logos et ressources presse : `public/`, `public/press/` et `src/pages/press-kit.astro`.
- Intervenants, partenaires, parcours et sessions : `src/content/`.
- Informations événementielles, tarif et liens d’action : `src/lib/event.ts`, `src/lib/pricing.ts` et `src/lib/cta-links.ts`.
- Preuves communautaires et témoignages actuellement utilisés par le site : `src/components/CommunityProofSection.astro`.

## Product Principles

1. Relier la décision à l’exécution : chaque parcours doit rester distinct tout en montrant leur complémentarité.
2. Préférer le concret au battage médiatique : mettre en avant les arbitrages, les pratiques testées et les retours de terrain.
3. Rendre la valeur de la journée immédiatement lisible : public, bénéfices, programme, prix et informations pratiques ne doivent jamais être ambigus.
4. Construire la confiance avec des preuves réelles : n’utiliser que les personnes, organisations, chiffres et contenus confirmés.
5. Préserver une identité éditoriale française, nantaise et reconnaissable sur toutes les surfaces.
