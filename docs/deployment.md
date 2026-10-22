# Déploiement

## Infrastructure

```
Navigateur ──HTTPS──▶ Cloudflare (countrep.architech.lu)
                         │
                         ▼
               LXC sur Proxmox
               ├─ Nginx :80
               │   ├─ /      → /opt/countrep/frontend/dist (PWA statique)
               │   └─ /api   → http://127.0.0.1:3000
               ├─ systemd : countrep-api → node backend/dist/server.js (:3000)
               └─ PostgreSQL 18 (base countrep, rôle countrep_app)
```

- Le TLS est terminé par Cloudflare ; Nginx écoute en HTTP sur le LXC.
- Le front appelle l'API en même origine (`/api`), via Nginx.
- HTTPS côté navigateur est indispensable : les passkeys (WebAuthn) et le service worker PWA ne fonctionnent qu'en contexte sécurisé.

## Procédure

Le dépôt est cloné sur le LXC dans `/opt/countrep`. Le build se fait sur le serveur, avec le script versionné `deploy/deploy.sh` :

```bash
/opt/countrep/deploy/deploy.sh
```

1. `git pull --ff-only`
2. backend : `npm ci`, `npm run build` (→ `backend/dist`)
3. frontend : `npm ci`, build dans `frontend/dist-next` (Nginx continue de servir `dist/`)
4. `systemctl restart countrep-api`, puis attente de `GET /api/health` (20 s max) ; en cas d'échec, arrêt sans toucher au frontend
5. remplacement de `dist/` par `dist-next/` (deux `mv`, coupure quasi nulle)
6. `systemctl reload nginx`
7. vérification de `/api/health` en direct (`:3000`) et via Nginx (`:80`)

`npm ci` n'écrit jamais `package-lock.json` : le clone reste propre et `git pull` ne bloque pas. Si un déploiement échoue sur `git pull --ff-only`, quelqu'un a modifié des fichiers suivis directement sur le serveur (`git status` pour voir lesquels).

Pas d'étape de migration : les changements de schéma sont appliqués à la main (voir `backend/database.sql` et `backend/schema.sql`), **avant** de déployer un code qui en dépend.

## Configuration sur le serveur

Fichiers non versionnés, présents uniquement sur le LXC :

| Fichier | Contenu attendu |
| ------- | --------------- |
| `/opt/countrep/backend/.env` ou le unit systemd | `DATABASE_HOST/PORT/NAME/USER/PASSWORD`, `JWT_SECRET`, `RP_ID=countrep.architech.lu`, `EXPECTED_ORIGIN=https://countrep.architech.lu`, `GOOGLE_CLIENT_IDS` (identifiant client OAuth Web, ADR 0013) |
| `/opt/countrep/frontend/.env.production` | `VITE_API_URL` vide ou absent (API en même origine), `VITE_GOOGLE_WEB_CLIENT_ID` (le même identifiant client Web, lu au build) |

`JWT_SECRET`, `RP_ID` et `EXPECTED_ORIGIN` ont des valeurs par défaut dans le code (secret de démo, `localhost`) : s'ils manquent, l'authentification passkey échoue ou les tokens deviennent falsifiables. Sans `GOOGLE_CLIENT_IDS`, le backend refuse toute connexion Google ; sans `VITE_GOOGLE_WEB_CLIENT_ID`, le bouton Google répond « non configuré ».

À noter : le `frontend/.env.production` du poste de développement pointe vers le backend du réseau local ; un build de production fait sur le poste de dev ne fonctionnerait pas en ligne.
