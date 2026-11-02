# Essayer l'image de production sur le Mac

Pour vérifier l'image complète avant un tag : l'API qui sert aussi le frontend construit, sur la même origine, avec
l'image de migration. C'est ce que la CI publiera.

## Avec les images construites en local

```bash
docker build -t countrep:local .
docker build -t countrep-migrations:local backend/migrations
```

Dans un dossier hors du dépôt (`mkdir ~/countrep-essai && cd ~/countrep-essai`), copier `compose.example.yml` et
créer un `.env` à côté :

```
COUNTREP_VERSION=local
API_IMAGE=countrep
MIGRATIONS_IMAGE=countrep-migrations
DB_PASSWORD=essai
JWT_SECRET=<openssl rand -base64 48>
GOOGLE_CLIENT_IDS=14127079549-o2h7n8qpjnru8v257fpqkjo8mppluqfo.apps.googleusercontent.com
```

```bash
docker compose -f compose.example.yml up -d
docker compose -f compose.example.yml logs migrations api
curl http://127.0.0.1:3000/api/health/db
```

L'application est sur `http://127.0.0.1:3000`. Le service worker et la connexion Google n'y marchent que sur
`localhost` ou `127.0.0.1` (pas de HTTPS).

## Avec une image publiée

Même chose sans `docker build`, avec `COUNTREP_VERSION=1.0.1` (ou `sha-<commit>` pour un commit de `main`) et sans
`API_IMAGE` ni `MIGRATIONS_IMAGE`.

## Sur une copie des données de production

Le dépôt `vps-infra` a le guide « Essayer une version sur le Mac » (`docs/how-to/try-a-version-on-the-mac.md`) :
récupérer la dernière sauvegarde du host, la restaurer, migrer avec la nouvelle version. À faire avant une migration
délicate.

## Nettoyer

```bash
docker compose -f compose.example.yml down -v
```
