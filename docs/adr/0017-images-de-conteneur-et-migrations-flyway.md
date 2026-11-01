# 17. Images de conteneur et migrations par Flyway

- Statut : Accepté
- Date : 2026-11-01

## Contexte

La production tourne sur un LXC du home lab : le dépôt y est cloné, `deploy/deploy.sh` construit le backend et le
frontend sur le serveur, systemd lance l'API, Nginx sert le frontend et renvoie `/api` vers elle. Les changements de
schéma sont des morceaux de SQL lancés à la main (`backend/database.sql`), reportés dans `backend/schema.sql`.

CountRep part sur le VPS qui héberge déjà Step Challenge et Colibri. Son exploitant attend de chaque application
le même contrat : **une image de conteneur versionnée et sa documentation d'exploitation**, rien qui dépende de la
machine (ni le port publié, ni le tunnel, ni les sauvegardes), et les migrations de la base par Flyway, dans une
image séparée. Step Challenge (son ADR 0011) et Colibri le suivent déjà.

Trois particularités de CountRep :

- le frontend (la PWA) et l'API partagent la même origine : le frontend appelle `/api` ;
- le catalogue des exercices est dans la base (`exercises`), et une saisie doit citer un exercice existant : une base
  avec les tables mais sans le catalogue est inutilisable ;
- l'historique des changements de schéma n'existe pas en fichiers numérotés : `database.sql` mêle des droits, des
  requêtes d'essai et des migrations datées.

## Options étudiées

- **Frontend dans l'image de l'API** (Fastify sert aussi les fichiers construits) ou **un nginx à part**. Le nginx à
  part garde la séparation actuelle, mais demande un service, une image et une configuration de plus pour quelques
  fichiers statiques, et un second port ou un proxy entre les deux.
- **Migrations : rejouer l'historique** (une migration par changement de `database.sql`) ou **repartir du schéma
  actuel**. Rejouer l'historique demanderait de reconstituer le schéma d'avant le 2026-09-02, dont il n'y a pas de
  trace fiable ; personne n'en a besoin.

## Décision

- **Une image `ghcr.io/mauvaisetroupe/countrep`** : l'API et le frontend construit (`public/`), servi par
  `@fastify/static` à la même origine ; les routes de l'application renvoient `index.html`, `/api/…` reste à l'API.
  `index.html`, le service worker et le manifeste sont revalidés à chaque chargement (`no-cache`), pour que les mises
  à jour de la PWA arrivent ([ADR 0015](0015-pwa-conservee-pour-le-site-web.md)) ; les fichiers de `assets/`, à
  empreinte, sont gardés un an.
- **Une image `ghcr.io/mauvaisetroupe/countrep-migrations`** : `flyway/flyway` à version figée et
  `backend/migrations/*.sql`. Elle migre puis s'arrête.
- **Une seule migration de départ, `V001__schema.sql`** : le schéma actuel **et** le catalogue des exercices. Une
  base existante (la production) reprend à cette version par une ligne de base (`FLYWAY_BASELINE_VERSION=1`), une
  seule fois. `schema.sql` et `database.sql` sont retirés (leur histoire reste dans git).
- **Tout changement de schéma ou du catalogue est une nouvelle migration** (`V002__…`), jamais une modification
  d'une migration publiée. Après un changement du catalogue, `frontend/src/data/exercises.json` est régénéré comme
  avant ([ADR 0014](0014-application-utilisable-sans-compte.md)).
- **L'API refuse de démarrer** si une variable obligatoire manque (`JWT_SECRET` n'a plus de valeur par défaut), ou si
  la base n'a pas la version de schéma qu'elle attend (la plus haute migration de son image).
- **Un seul utilisateur PostgreSQL** (propriétaire de la base) pour les migrations et l'API : le rôle `countrep_app`
  et ses droits ne sont pas repris.
- **Versions** : tag git `web-vX.Y.Z`, images `X.Y.Z` et `X.Y` (et `sha-<commit>` pour chaque commit de `main`),
  jamais `latest` ; notes de la GitHub Release **écrites depuis git** par la CI (`.github/release-notes.sh`, repris de
  Colibri), rien à la main : les commits marqués `!` (une action pour l'exploitant : variable, PostgreSQL, migration
  sans retour en arrière), les migrations nouvelles, puis les commits. L'application Android garde sa propre version
  (`package.json`, Google Play) et ses notes de store.

## Conséquences

- ✅ Le même contrat que Step Challenge et Colibri : l'exploitant déploie une version, sauvegarde et restaure de la
  même façon pour les trois ([`docs/exploitation.md`](../exploitation.md)).
- ✅ Une base neuve (poste de développement, machine de secours, essai) est complète en une commande, catalogue
  compris ; plus de SQL lancé à la main en production.
- ✅ Plus de secret de démonstration dans le code : un `JWT_SECRET` oublié arrête l'API au lieu de rendre les tokens
  falsifiables.
- ❌ Le frontend et l'API se déploient ensemble, dans la même image (c'était déjà le cas avec `deploy.sh`).
- ❌ `vite.config.ts` lit le commit dans `GIT_HASH` quand il n'y a pas de dépôt git (build de l'image).
- À faire : la bascule de la production (le dépôt de l'exploitant la décrit) ; ensuite, retirer `deploy/deploy.sh`
  et `docs/deployment.md`.
