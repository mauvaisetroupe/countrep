# Changer le schéma ou le catalogue des exercices

Le schéma **et** le catalogue des exercices (les lignes de la table `exercises`) sont dans les migrations Flyway de
`backend/migrations/` (ADR 0017). L'API refuse de démarrer tant que la base n'est pas à la plus haute migration de son
image (`backend/src/schemaVersion.ts`).

## 1. Écrire la migration

Ajouter `backend/migrations/V00n__nom_en_snake_case.sql`, `n` étant le numéro suivant (`ls backend/migrations`).
**Jamais** modifier une migration déjà publiée (dans un tag `web-v*`) : Flyway refuserait de migrer la production, et la
CI refuse de créer la release.

Règles :

- Une nouvelle table d'utilisateur : `user_id … REFERENCES users(id) ON DELETE CASCADE` (la suppression du compte en
  dépend, ADR 0016), et chaque requête de l'API filtre par `user_id`.
- Rester compatible avec la version précédente de l'API quand c'est possible (ajouter une colonne nullable plutôt que
  renommer) : le retour en arrière se fait alors sans restauration.
- Une migration **sans retour en arrière** (suppression, renommage, données transformées) : le commit est marqué `!`,
  avec ce qu'il faut savoir ([Publier une version web](release-the-web-app.md#1-préparer)).
- Un nouvel exercice : `INSERT INTO exercises …` avec son `unit` (`reps` ou `seconds`), puis son illustration
  `frontend/public/exercises/<id>.jpg` et ses noms dans la ligne (anglais, français).

## 2. L'appliquer en local

```bash
docker compose -f compose.dev.yml up -d --build migrations
docker compose -f compose.dev.yml logs migrations          # … now at version v00n
```

Puis redémarrer l'API (`npm run dev` la relance à chaque modification de fichier ; sinon Ctrl-C et relancer) : elle
attend maintenant la version `n`.

Une migration ratée et déjà appliquée en local : repartir d'une base vide (`docker compose -f compose.dev.yml down -v`
puis `up -d`), corriger, recommencer. Ce n'est possible que tant qu'elle n'est pas publiée.

## 3. Le catalogue embarqué (si `exercises` a changé)

Le frontend embarque une copie du catalogue (`frontend/src/data/exercises.json`), pour marcher sans API (ADR 0014).
La régénérer depuis l'API locale :

```bash
cd frontend && node scripts/update-catalog.mjs http://localhost:3000/api/exercises
```

et commiter le fichier avec la migration. Sans argument, le script lit la production.

## 4. Adapter le code et livrer

- Backend : les requêtes SQL et la correspondance snake_case → camelCase de la route.
- Frontend : `db.ts` (monter `version(n)` de Dexie si un champ indexé change), API, synchronisation.
- Vérifier : `npm run build` dans `backend/` et `frontend/`.
- Livrer : [Publier une version web](release-the-web-app.md). Les notes de version listent la migration ; le
  déploiement sauvegarde la base avant de l'appliquer. Puis l'application Android si le catalogue a changé.
