# CountRep

Application hors ligne d'abord (PWA et Android) pour noter ses répétitions d'exercices au poids du corps ou à
l'élastique : https://countrep.architech.lu

- `frontend/` : Vue 3, TypeScript, Vite, Pinia, Tailwind, Dexie (IndexedDB), PWA ; application Android avec Capacitor.
- `backend/` : API Fastify 5, SQL avec `pg`, sessions JWT, connexion Google.
- `backend/migrations/` : le schéma de la base et le catalogue des exercices, migrations Flyway.

Architecture : [`CLAUDE.md`](CLAUDE.md), [`architceture.md`](architceture.md), décisions dans [`docs/adr/`](docs/adr/).
Hébergement (images de conteneur) : [`docs/exploitation.md`](docs/exploitation.md).

## Développer en local

En développement, seuls **PostgreSQL et les migrations** tournent dans Docker ([`compose.dev.yml`](compose.dev.yml)) ;
l'API et le frontend tournent sur la machine, avec rechargement à chaud.

```
navigateur ──► Vite :5173 (frontend) ──► API :3000 (npm run dev) ──► PostgreSQL :5432 (Docker)
```

Prérequis : Node.js 24, Docker avec Compose.

### 1. La base

```bash
docker compose -f compose.dev.yml up -d
```

Démarre PostgreSQL 18 (publié sur `127.0.0.1:5432`, base, utilisateur et mot de passe `countrep`), puis construit
l'image de migration depuis `backend/migrations/` et l'applique : schéma complet et catalogue des exercices. Le
service `migrations` s'arrête ensuite, c'est normal. Pour vérifier :

```bash
docker compose -f compose.dev.yml logs migrations
```

La dernière ligne doit dire `Successfully applied … now at version v00n`.

### 2. L'API

```bash
cp backend/.env.example backend/.env
```

Dans `backend/.env`, remplir `JWT_SECRET` (sortie de `openssl rand -base64 48`) et, si besoin, mettre dans
`CORS_ORIGINS` l'adresse de la machine sur le réseau local. Puis :

```bash
cd backend && npm install && npm run dev
```

L'API écoute sur le port 3000 (`http://localhost:3000/api/health/db` répond `{"status":"ok",…}`). Elle refuse de
démarrer, avec le message dans son journal, si une variable obligatoire manque ou si la base n'est pas à la dernière
migration du dépôt.

### 3. Le frontend

```bash
cd frontend && npm install && npm run dev
```

Vite sert l'application sur le port 5173, aussi sur le réseau local. `frontend/.env.development` pointe l'API vers
l'adresse de la machine sur le réseau (`VITE_API_URL`) pour essayer depuis un téléphone. Si cette adresse n'est pas
la bonne, la remplacer sans toucher au fichier versionné, dans `frontend/.env.development.local` (ignoré par git) :

```
VITE_API_URL=http://localhost:3000
```

La connexion Google ne marche que sur **`http://localhost:5173`** : Google refuse les origines `http://` sur une
adresse IP. Tout le reste fonctionne sans compte, et même sans API (ADR 0014).

### Vérifier les types

Il n'y a ni tests ni linter : le build fait la vérification des types.

```bash
cd backend && npm run build
```

```bash
cd frontend && npm run build
```

### Changer le schéma ou le catalogue

1. Ajouter `backend/migrations/V00n__nom.sql`, sans jamais modifier une migration déjà publiée.
2. L'appliquer à la base locale (reconstruit l'image de migration) :

   ```bash
   docker compose -f compose.dev.yml up -d --build migrations
   ```

3. Redémarrer l'API : elle attend maintenant la version `n`.
4. Si la table `exercises` a changé, régénérer le catalogue embarqué depuis l'API locale :

   ```bash
   cd frontend && node scripts/update-catalog.mjs http://localhost:3000/api/exercises
   ```

### Arrêter, repartir de zéro

```bash
docker compose -f compose.dev.yml stop
```

Les données restent dans le volume `countrep-dev_db-data`. Pour repartir d'une base vide (supprime le volume) :

```bash
docker compose -f compose.dev.yml down -v
```

Si le port 5432 est déjà pris sur la machine, publier la base sur un autre port avec `DB_PUBLISH_PORT=5433` (avant
`docker compose`, ou dans un fichier `.env` à la racine) et mettre le même port dans `DATABASE_PORT`.

### Essayer l'image de production

Pour vérifier l'image complète (l'API sert aussi le frontend construit, sur la même origine) :

```bash
docker build -t countrep:local .
```

```bash
docker build -t countrep-migrations:local backend/migrations
```

Puis [`compose.example.yml`](compose.example.yml), avec dans le `.env` à côté de lui `COUNTREP_VERSION=local`,
`API_IMAGE=countrep`, `MIGRATIONS_IMAGE=countrep-migrations` et les variables décrites en tête du fichier.
L'application est alors sur `http://127.0.0.1:3000`. `compose.example.yml` n'est pas fait pour développer : il ne
publie pas la base, et lance l'API construite au lieu de `npm run dev`.

### Application Android

```bash
cd frontend && npm run build:android
```

Construit avec `frontend/.env.android` (l'API de production) et synchronise le projet `frontend/android/`. Bundle
signé pour Google Play : `npm run bundle:android` ([`docs/signing.md`](docs/signing.md)).

## Publier une version

Un tag `web-vX.Y.Z` fait construire et publier les deux images par la CI (`.github/workflows/ci.yml`), avec les notes
de version écrites depuis git. Un commit qui demande une action à l'exploitant est marqué `!` (`feat!: …`).
