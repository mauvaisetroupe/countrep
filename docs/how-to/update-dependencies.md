# Mettre à jour les dépendances

Sans tests automatiques, une mise à jour se vérifie par le build (types) et à la main dans l'application. Une famille
à la fois, un commit par famille : en cas de souci, `git revert` d'un seul commit.

## Paquets npm (backend, frontend)

```bash
cd backend && npm outdated          # Current, Wanted (dans la plage de package.json), Latest
npm update                          # jusqu'à Wanted : correctifs et mineures
npm run build
```

Même chose dans `frontend/`. Une version **majeure** (colonne Latest) : lire ses notes de migration, puis
`npm install <paquet>@latest`. Commiter `package.json` et `package-lock.json`.

Failles connues : `npm audit` ; ne pas lancer `npm audit fix --force` (montées majeures sans prévenir).

Vérifier ensuite : [développer en local](../tutorials/develop-locally.md#4-essayer) (saisie, connexion, synchro), et
pour le frontend, le build Android.

## Capacitor et Android

Les paquets `@capacitor/*` et `@capgo/capacitor-social-login` vont ensemble, à la même version majeure. Après une mise
à jour :

```bash
cd frontend && npm run build:android && npx cap run android
```

Une majeure de Capacitor : `npx cap migrate` (met à jour `frontend/android/`), puis relire le diff de
`frontend/android/` : ce dossier est versionné et modifié à la main (ADR 0012). Monter `targetSdkVersion` dans
`frontend/android/variables.gradle` quand Google Play l'exige (un avertissement dans la Play Console, chaque année).

## Node.js

La version est à trois endroits, à garder égaux : `Dockerfile` (`NODE_IMAGE`, tag précis), `.github/workflows/ci.yml`
(`node-version`) et la machine de développement.

## PostgreSQL et Flyway

- Flyway : `FROM flyway/flyway:…` dans `backend/migrations/Dockerfile`.
- PostgreSQL : `postgres:18` dans `compose.dev.yml`, `compose.example.yml`, `ci.yml`. Une majeure (19) demande une
  action de l'exploitant (sauvegarde et restauration, [exploitation](../exploitation.md#base-de-données)) : commit
  marqué `!`.

## Actions GitHub

Les `uses: …@vN` de `.github/workflows/ci.yml` : monter la majeure quand GitHub annonce la fin d'une version (avertissement
dans les exécutions).
