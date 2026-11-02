# Développer en local

D'un Mac sans rien à CountRep qui tourne en local : la base dans Docker, l'API et le frontend sur la machine, avec
rechargement à chaud. À la fin, une saisie faite dans le navigateur est enregistrée dans PostgreSQL.

```
navigateur ──► Vite :5173 (frontend) ──► API :3000 (npm run dev) ──► PostgreSQL :5432 (Docker)
```

## 0. Les outils (une fois)

| Outil | Pour | Installer |
|---|---|---|
| Git | Le dépôt | `xcode-select --install` |
| Node.js **24** (celui de la CI et de l'image) | API et frontend | `brew install node@24`, ou [nvm](https://github.com/nvm-sh/nvm) : `nvm install 24` |
| Docker avec Compose | La base, les migrations, l'image de production | [Docker Desktop](https://www.docker.com/products/docker-desktop/) ou [OrbStack](https://orbstack.dev) |
| Android Studio | Seulement pour l'application Android | Voir [Lancer l'application sur un téléphone Android](../how-to/run-on-an-android-phone.md) |
| Inkscape | Seulement pour régénérer les icônes | `brew install --cask inkscape` |

Vérifier :

```bash
node --version             # v24.x
docker compose version
```

Puis récupérer le dépôt :

```bash
git clone https://github.com/mauvaisetroupe/countrep.git
cd countrep
```

## 1. La base

```bash
docker compose -f compose.dev.yml up -d
```

Démarre PostgreSQL 18 (publié sur `127.0.0.1:5432` ; base, utilisateur et mot de passe `countrep`), puis construit
l'image de migration depuis `backend/migrations/` et l'applique : schéma complet et catalogue des exercices. Le
service `migrations` s'arrête ensuite, c'est normal. Pour vérifier :

```bash
docker compose -f compose.dev.yml logs migrations
```

La dernière ligne doit dire `Successfully applied … now at version v00n`.

## 2. L'API

```bash
cp backend/.env.example backend/.env
openssl rand -base64 48          # à coller dans JWT_SECRET
```

Dans `backend/.env`, remplir `JWT_SECRET` et, si besoin, mettre dans `CORS_ORIGINS` l'adresse de la machine sur le
réseau local (`ipconfig getifaddr en0`). Puis :

```bash
cd backend && npm install && npm run dev
```

L'API écoute sur le port 3000 et redémarre à chaque modification. Vérifier dans un autre terminal :

```bash
curl http://localhost:3000/api/health/db        # {"status":"ok",…}
```

Elle refuse de démarrer, avec le message dans son journal, si une variable obligatoire manque ou si la base n'est pas
à la dernière migration du dépôt.

## 3. Le frontend

```bash
cd frontend && npm install && npm run dev
```

Vite sert l'application sur le port 5173, aussi sur le réseau local. `frontend/.env.development` pointe l'API vers
l'adresse de la machine sur le réseau (`VITE_API_URL`) pour essayer depuis un téléphone. Si cette adresse n'est pas
la bonne, la remplacer sans toucher au fichier versionné, dans `frontend/.env.development.local` (ignoré par git) :

```
VITE_API_URL=http://localhost:3000
```

## 4. Essayer

1. Ouvrir **`http://localhost:5173`** (pas l'adresse IP : Google refuse les origines `http://` sur une adresse IP).
2. Noter une saisie sans compte : elle reste dans le navigateur (IndexedDB), l'application marche sans API
   (ADR 0014).
3. Réglages › Compte et sécurité › se connecter avec Google. Le compte doit être un **utilisateur de test** du projet Google
   Cloud ([Configurer la connexion Google](../how-to/set-up-google-sign-in.md)).
4. La saisie part vers l'API. Vérifier dans la base :

   ```bash
   docker compose -f compose.dev.yml exec db psql -U countrep -c 'SELECT exercise, reps, date FROM sets'
   ```

## 5. Vérifier les types avant de livrer

Il n'y a ni tests ni linter : le build fait la vérification des types, comme la CI.

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

## Arrêter, repartir de zéro

```bash
docker compose -f compose.dev.yml stop          # les données restent (volume countrep-dev_db-data)
docker compose -f compose.dev.yml down -v       # base vide : supprime le volume
```

Si le port 5432 est déjà pris, publier la base sur un autre port avec `DB_PUBLISH_PORT=5433` (avant
`docker compose`, ou dans un fichier `.env` à la racine) et mettre le même port dans `DATABASE_PORT` de
`backend/.env`.

## Et ensuite

- Comprendre le code : [l'architecture](../explanation/architecture.md), puis les ADR.
- Changer le schéma : [Changer le schéma ou le catalogue](../how-to/change-the-schema.md).
- Livrer : [Publier une version web](../how-to/release-the-web-app.md),
  [Publier l'application Android](../how-to/publish-the-android-app.md).
