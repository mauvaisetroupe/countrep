# Commandes

## Scripts npm

| Dossier | Commande | Fait |
|---|---|---|
| `backend/` | `npm run dev` | API sur `0.0.0.0:3000`, relancée à chaque modification (`tsx watch`), lit `backend/.env` |
| | `npm run build` | `tsc` vers `dist/` : **la vérification des types** |
| | `npm start` | `node dist/server.js`, l'API construite (c'est la commande de l'image) |
| `frontend/` | `npm run dev` | Vite sur le port 5173, aussi sur le réseau local, avec `.env.development` |
| | `npm run build` | `vue-tsc -b && vite build` vers `dist/` : **la vérification des types**, et le site avec la PWA |
| | `npm run preview` | Sert `dist/` pour l'essayer |
| | `npm run build:android` | Build avec `.env.android` (mode `android`, sans PWA), puis `cap sync android` |
| | `npm run bundle:android` | `build:android` puis `./gradlew bundleRelease` : l'`.aab` signé pour Google Play |

## Base de développement (`compose.dev.yml`)

| Commande | Fait |
|---|---|
| `docker compose -f compose.dev.yml up -d` | PostgreSQL 18 sur `127.0.0.1:5432`, puis les migrations du dépôt |
| `docker compose -f compose.dev.yml up -d --build migrations` | Applique une migration ajoutée |
| `docker compose -f compose.dev.yml logs migrations` | Résultat des migrations |
| `docker compose -f compose.dev.yml exec db psql -U countrep` | Console SQL |
| `docker compose -f compose.dev.yml stop` | Arrête, garde les données |
| `docker compose -f compose.dev.yml down -v` | Supprime la base |

## Images

| Commande | Fait |
|---|---|
| `docker build -t countrep:local .` | L'image de l'application (frontend construit et API) |
| `docker build -t countrep-migrations:local backend/migrations` | L'image de migration (Flyway et les `.sql`) |
| `docker compose -f compose.example.yml up -d` | Base, migrations et application, pour essayer ([guide](../how-to/try-the-production-image.md)) |

## Android (depuis `frontend/`)

| Commande | Fait |
|---|---|
| `npx cap run android` | Installe le build de debug sur un téléphone ou un émulateur |
| `npx cap open android` | Ouvre `frontend/android/` dans Android Studio |
| `cd android && ./gradlew installRelease` | Installe le build release (signé avec la clé d'importation) |
| `cd android && ./gradlew :app:signingReport` | Empreintes des clés de debug et de release |
| `adb devices`, `adb logcat`, `adb uninstall lu.architech.countrep` | Téléphone branché, journaux, désinstallation |

## Scripts du dépôt

| Commande | Fait |
|---|---|
| `node frontend/scripts/update-catalog.mjs [url]` (depuis `frontend/` : `node scripts/update-catalog.mjs`) | Régénère `frontend/src/data/exercises.json` depuis `GET /api/exercises` (production par défaut) |
| `python3 icons/export-app-icons.py` | Régénère toutes les icônes depuis le SVG maître (Inkscape requis) |
| `.github/release-notes.sh web-vX.Y.Z` | Les notes de version d'un tag, comme la CI (historique et tags complets nécessaires) |

## Publier

| Commande | Fait |
|---|---|
| `git tag web-vX.Y.Z && git push origin web-vX.Y.Z` | Publie une version web ([guide](../how-to/release-the-web-app.md)) |
| `gh run watch` | Suit la CI |
| `ssh -t vps-ovh sudo -iu countrep deploy-app X.Y.Z` | Déploie en production (dépôt `vps-infra`) |
| `npm version patch --no-git-tag-version` (dans `frontend/`) | Monte la version de l'application Android ([guide](../how-to/publish-the-android-app.md)) |
