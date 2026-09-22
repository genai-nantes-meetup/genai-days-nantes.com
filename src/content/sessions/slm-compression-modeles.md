---
title: "Mon modèle ne tient pas sur une puce embarquée"
subtitle: "Small language models, fine-tuning & compression"
seoTitle: "Mon modèle ne tient pas sur une puce embarquée"
track: "tech"
startTime: "11:15"
durationMinutes: 40
room: ""
speakerSlugs: ["theo-hubert"]
format: "talk"
themes: ["SLM", "Compression de modèles", "IA embarquée"]
illustration:
  alt: "Interaction entre une personne et un modèle d’IA compact"
  src: "/talks/stage-2-talk-3-slm-optimized.webp"
  variant: "evaluation"
---

Aujourd’hui, l’IA est majoritairement consommée dans le Cloud. Mais peut-on faire autrement ? L’objectif de cette prise de parole est de montrer concrètement comment faire tourner localement un modèle de langage performant, sur un PC ou une carte comme la Jetson Nano.

Sur un environnement contraint, réduire la taille arbitrairement d’un modèle ne suffit pas. Nous verrons comment les SLM (Small Language Models) permettent de conserver de bonnes performances grâce à différentes approches : trimming, quantification, pruning et fine-tuning. Nous irons ensuite plus loin en comparant ces techniques d’optimisation à une autre approche : concevoir des architectures nativement pensées pour l’Edge, et donc adaptées dès l’origine aux contraintes de calcul.
