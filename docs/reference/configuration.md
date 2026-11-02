# Configuration

La configuration de **production** de l'API (variables du conteneur) est dans [`exploitation.md`](../exploitation.md).
Cette page décrit les fichiers du poste de développement.

## Backend : `backend/.env`

Copie de `backend/.env.example` (versionné), ignorée par git, lue par `dotenv` au démarrage de `npm run dev`. Mêmes
variables qu'en production ; lues et vérifiées par `backend/src/config.ts`.

| Variable | Valeur de développement |
|---|---|
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD` | La base de `compose.dev.yml` : `localhost`, `5432`, `countrep` partout |
| `JWT_SECRET` | `openssl rand -base64 48` ; obligatoire, sans valeur par défaut |
| `GOOGLE_CLIENT_IDS` | Le client Web du projet Google Cloud `countrep` (déjà dans l'exemple) |
| `CORS_ORIGINS` | `http://localhost:5173` et `http://<adresse du Mac>:5173` (téléphone sur le réseau local) |

## Frontend : `frontend/.env.*`

Variables `VITE_…`, figées dans le JavaScript au build : **publiques**, jamais de secret. Vite charge `.env.<mode>`,
puis `.env.<mode>.local` (ignoré par git, prioritaire).

| Fichier | Mode, utilisé par | `VITE_API_URL` | Versionné |
|---|---|---|---|
| `.env.development` | `npm run dev` | L'API de développement sur le réseau local (`http://192.168.1.109:3000`) | oui |
| `.env.development.local` | `npm run dev`, prioritaire | Par exemple `http://localhost:3000` | non |
| `.env.android` | `npm run build:android`, `bundle:android` | `https://countrep.architech.lu` (production, en dur dans l'application) | oui |
| `.env.production` | `npm run build` en local | Ancienne adresse du LXC ; **sans effet sur la production** : le `.dockerignore` l'exclut de l'image | non |
| *(aucun)* | Image de production (`Dockerfile`) | Absente : l'API est sur la même origine, sous `/api` | — |

`VITE_GOOGLE_WEB_CLIENT_ID` : le client OAuth Web, dans `.env.development`, `.env.android` et en `ARG` du
`Dockerfile`.

`__GIT_HASH__` (affiché en bas des Réglages) : injecté par `vite.config.ts` depuis git, ou depuis `GIT_HASH` dans
l'image (donné par la CI).

## Android : `~/.gradle/gradle.properties`

Hors du dépôt, lu par `frontend/android/app/build.gradle` pour signer le build release :
`COUNTREP_UPLOAD_STORE_FILE`, `COUNTREP_UPLOAD_STORE_PASSWORD`, `COUNTREP_UPLOAD_KEY_ALIAS`,
`COUNTREP_UPLOAD_KEY_PASSWORD` ([Créer la clé d'importation](../how-to/create-the-upload-key.md)).

`frontend/android/local.properties` (ignoré, créé par Android Studio) : `sdk.dir`, le chemin du SDK Android.

Version de l'application : `version` de `frontend/package.json`, seule source de `versionName` et `versionCode`.

## Préférences par appareil (`localStorage`)

Pour déboguer : `countrep.locale` (langue), `countrep.appearance` (thème), `countrep.owner` (compte propriétaire des
données locales), le token de session ; IndexedDB `WorkoutDatabase` pour les données.
