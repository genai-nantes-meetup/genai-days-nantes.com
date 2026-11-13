---
title: "Mes agents IA sont la nouvelle cible des attaques"
subtitle: "Gouvernance, sandbox et moindre privilège à l’échelle d’une entreprise"
seoTitle: "Mes agents IA sont la nouvelle cible des attaques"
seoDescription: "Comment Cloudflare a équipé toute l’entreprise en agents IA en moins d’un an : gouvernance, sandbox, moindre privilège et Gatekeepers."
track: "tech"
startTime: "15:20"
durationMinutes: 40
room: ""
speakerSlugs: ["antoine-brossault"]
format: "talk"
themes: ["Agents IA", "Gouvernance", "Sécurité des agents", "Cloudflare OS"]
illustration:
  alt: "Une silhouette de dos regarde un flot de données défiler en surimpression d'une ville nocturne"
  src: "/talks/nouvelles-menaces-cyber-optimized.webp"
  variant: "transformation"
---

En 2026, tout le monde a un agent. Presque personne n’a de gouvernance.

Chez Cloudflare, toute l’entreprise a été équipée en moins d’un an, et la vélocité de merge a doublé. Ce qui a fait la différence n’est pas le modèle choisi, c’est l’architecture autour.

Ce talk raconte pourquoi nous avons construit notre propre stack IA, et les décisions qui en découlent : centraliser tous les appels derrière un point de passage unique, porter la sécurité au niveau du réseau plutôt que dans chaque outil, gouverner l’accès aux données internes par l’identité, et exécuter le code généré par les agents dans un environnement isolé.

On parlera architecture, résultats et terminal, et on assumera une opinion : le harness et le modèle sont deux choses séparées.

Nous aborderons notamment :

- l’exécution du code généré dans des environnements sandboxés, avec filtrage des accès sortants ;
- le contrôle des accès aux données par l’identité et le moindre privilège ;
- la protection contre les fuites de secrets et de données sensibles ;
- la centralisation des appels aux modèles, sans clés API sur les postes des utilisateurs ;
- la prévention des expositions publiques involontaires des applications générées.

Nous illustrerons avec Cloudflare OS, notre harness open source, et notamment son mécanisme de Gatekeepers. Ceux-ci apportent une sécurité plus forte qu’une intégration MCP classique : chaque agent ou application ne reçoit que les capacités strictement nécessaires, les actions sont journalisées et les opérations sensibles peuvent être soumises à une validation humaine.

Le projet et le détail de cette architecture :

- [Cloudflare OS](https://github.com/cloudflare/cloudflare-os)
- [Le fonctionnement des Gatekeepers](https://github.com/cloudflare/cloudflare-os#gatekeepers-a-capability-based-security-layer)
- [Le modèle de sandbox et de contrôle des accès](https://github.com/cloudflare/cloudflare-os#sandboxed-and-secure-by-default)
