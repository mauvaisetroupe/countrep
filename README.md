# CountRep

Application hors ligne d'abord (PWA et Android) pour noter ses répétitions d'exercices au poids du corps ou à
l'élastique : https://countrep.architech.lu

- `frontend/` : Vue 3, TypeScript, Vite, Pinia, Tailwind, Dexie (IndexedDB), PWA ; application Android avec Capacitor.
- `backend/` : API Fastify 5, SQL avec `pg`, sessions JWT, connexion Google.
- `backend/migrations/` : le schéma de la base et le catalogue des exercices, migrations Flyway.

## Documentation

Toute la documentation est dans [`docs/`](docs/README.md), rangée en tutoriel, guides, référence et explications.

- **Comprendre** : [l'architecture](docs/explanation/architecture.md), puis les [ADR](docs/adr/README.md).
- **Démarrer** : [développer en local](docs/tutorials/develop-locally.md).
- **Livrer** : [publier une version web](docs/how-to/release-the-web-app.md), [publier l'application
  Android](docs/how-to/publish-the-android-app.md).
- **Héberger** : [exploitation](docs/exploitation.md), pour qui fait tourner les images.
- **Où est quoi** : [comptes, consoles et secrets](docs/reference/accounts-and-secrets.md),
  [commandes](docs/reference/commands.md).

## En bref

Prérequis : Node.js 24, Docker avec Compose.

```bash
docker compose -f compose.dev.yml up -d                 # PostgreSQL et les migrations
cp backend/.env.example backend/.env                    # puis remplir JWT_SECRET
(cd backend && npm install && npm run dev)              # API sur :3000
(cd frontend && npm install && npm run dev)             # http://localhost:5173
```

Vérifier les types (il n'y a ni tests ni linter) : `npm run build` dans `backend/` et dans `frontend/`.

Publier : un tag `web-vX.Y.Z` pour le site et l'API ; `npm run bundle:android` et la Play Console pour Android.
