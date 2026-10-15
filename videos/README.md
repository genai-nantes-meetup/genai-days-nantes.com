# Vidéos GENAI DAYS

Motion design de l'événement, en HTML rendu en vidéo avec [HyperFrames](https://hyperframes.heygen.com).

Guide de prise en main : ouvrir [`GUIDE.html`](GUIDE.html) dans un navigateur.

| Dossier | Contenu |
| --- | --- |
| `film/` | Film de l'événement (43,5 s, 16:9, musique M2), variantes musicales, lab des formats verticaux |
| `habillage-captation/` | Habillage des captations pour le montage et OBS (bumpers, synthés, cartons, miniatures) |

Démarrage rapide :

```bash
cd videos/film
pnpm run dev                            # aperçu dans le Studio HyperFrames
pnpm run render -o ../renders/film.mp4  # rendu MP4
tools/export-web.sh ../renders/film.mp4 # version légère à partager
```

Ce dossier est hors du site : Astro et le `tsconfig` l'ignorent. Les rendus vont dans `videos/renders/`. Rendus, labs et fichiers générés ne sont pas versionnés (`.gitignore`).

Règles pour l'agent : `.claude/rules/videos.md` à la racine du repo, chargées automatiquement dans `videos/`. Les skills HyperFrames sont installés dans `.claude/skills/` à la racine du repo.
