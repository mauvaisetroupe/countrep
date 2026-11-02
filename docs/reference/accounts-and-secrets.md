# Comptes, consoles et secrets

Tout ce qui existe hors du dépôt, et où le retrouver.

## Comptes et consoles

| Service | Adresse | Sert à |
|---|---|---|
| GitHub, dépôt `mauvaisetroupe/countrep` | [github.com/mauvaisetroupe/countrep](https://github.com/mauvaisetroupe/countrep) | Code, CI (Actions), images (Packages, GHCR), notes de version (Releases) |
| GitHub, dépôt `mauvaisetroupe/vps-infra` | `../vps-infra` | L'hébergement : préparation du VPS, composition de production, déploiement, sauvegardes, supervision |
| GitHub, dépôt `mauvaisetroupe/architech-sport` | `../architech-sport` | Le site `https://sport.architech.lu/countrep/` : présentation, **politique de confidentialité**, **suppression du compte** (liens de l'application et de la Play Console) |
| Google Cloud, projet `countrep` | [console.cloud.google.com](https://console.cloud.google.com) › Google Auth Platform | Connexion Google : écran de consentement, utilisateurs de test, clients OAuth Web et Android ([guide](../how-to/set-up-google-sign-in.md)) |
| Google Play Console, application CountRep | [play.google.com/console](https://play.google.com/console) | Publication Android, fiche, déclarations, clé Google Play ([guide](../how-to/publish-the-android-app.md)) |
| Cloudflare | Tableau de bord, zone `architech.lu` | Le tunnel vers le VPS et le nom `countrep.architech.lu` (décrit dans `vps-infra`) |

## Secrets

| Secret | Où il est | Copie de secours | Le perdre |
|---|---|---|---|
| Keystore d'importation `countrep-upload.jks` et son mot de passe | `~/keystores/` et `~/.gradle/gradle.properties` du Mac | Gestionnaire de mots de passe | Remplaçable par Google ([guide](../how-to/create-the-upload-key.md#après-une-perte--la-remplacer)) |
| `JWT_SECRET` de production | `.env` de l'utilisateur `countrep` sur le host (`~countrep/app/.env`) | À ranger dans le gestionnaire de mots de passe | En créer un autre : tous les appareils sont déconnectés une fois, sans perte de données |
| Mot de passe de la base de production (`DB_PASSWORD`) | Même `.env` | Gestionnaire de mots de passe | Le changer dans PostgreSQL et le `.env` |
| `JWT_SECRET` de développement | `backend/.env` | Aucune (sans valeur) | En créer un autre |

**Pas des secrets** (publics, versionnés) : les identifiants clients OAuth Google, les empreintes des clés, l'adresse
de l'API.

Rien de secret ne va dans le dépôt : la CI le vérifie (gitleaks, [CI](ci.md)).

## Données de production

La base PostgreSQL du VPS, sauvegardée par `vps-infra` (avant chaque déploiement, et régulièrement : voir
`docs/reference/backups.md` de `vps-infra`). Ce sont des données personnelles : identifiant Google (`sub`) et prénom, saisies, séances.
