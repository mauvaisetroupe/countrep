# Ajouter une variable de configuration

L'API lit sa configuration dans les variables d'environnement, une seule fois, dans `backend/src/config.ts`, importé
avant tout le reste : une valeur manquante ou invalide l'arrête au démarrage, avec toutes les erreurs dans le même
message. Une variable ajoutée demande une action de l'exploitant : elle se signale.

1. **`backend/src/config.ts`** : le champ dans `Config`, la lecture dans `loadConfig` ; dans `REQUIRED` si elle est
   obligatoire, sinon une valeur par défaut sûre. Le reste du code lit `config.xxx`, jamais `process.env`.
2. **`backend/.env.example`** : la variable, avec un commentaire et une valeur de développement.
3. **[`docs/exploitation.md`](../exploitation.md)**, tableau « Variables d'environnement de l'application » :
   obligatoire, défaut, secret, rôle.
4. **Commit marqué `!`**, qui dit quoi faire :

   ```
   feat(api)!: add SESSION_DAYS

   BREAKING CHANGE: set SESSION_DAYS in the .env of the host (optional, default 7)
   ```

   Il apparaîtra dans « À lire avant de déployer » des notes de version.
5. **Au déploiement** (dépôt `vps-infra`, `apps/countrep/`) : la variable dans `.env.example` et dans l'`environment`
   de `compose.yml`, relancer le playbook, l'ajouter au `.env` du host, **puis** `deploy-app` ([Publier une version
   web](release-the-web-app.md#4-déployer-en-production)).

Une variable du **frontend** (`VITE_…`) est figée au build : dans les `frontend/.env.*` concernés et, pour le site de
production, en `ARG` dans le `Dockerfile` ([Configuration](../reference/configuration.md)). Elle est publique : jamais
de secret.
