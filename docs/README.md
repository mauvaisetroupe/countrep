# Documentation

Rangée selon [Diátaxis](https://diataxis.fr/) : apprendre, faire, consulter, comprendre. Les décisions sont dans les
[ADR](adr/README.md).

**Pour commencer : [l'architecture](explanation/architecture.md)** (dix minutes), puis [développer en
local](tutorials/develop-locally.md).

## Tutoriel : apprendre, de bout en bout

- [Développer en local](tutorials/develop-locally.md) : d'un Mac neuf à l'application qui tourne, base, API et
  frontend, avec une saisie synchronisée.

## Guides : faire une tâche

Livrer :

- [Publier une version web](how-to/release-the-web-app.md) : tag, CI, images, notes de version, déploiement sur le VPS
- [Publier l'application Android](how-to/publish-the-android-app.md) : version, `.aab` signé, Play Console
- [Essayer l'image de production sur le Mac](how-to/try-the-production-image.md)

Changer :

- [Changer le schéma ou le catalogue des exercices](how-to/change-the-schema.md)
- [Ajouter une variable de configuration](how-to/add-a-configuration-variable.md) à l'API
- [Mettre à jour les dépendances](how-to/update-dependencies.md) : npm, Capacitor, Node, PostgreSQL
- [Changer les icônes](how-to/update-the-icons.md)

Android et Google :

- [Lancer l'application sur un téléphone Android](how-to/run-on-an-android-phone.md)
- [Créer la clé d'importation](how-to/create-the-upload-key.md) (une fois, ou après une perte)
- [Configurer la connexion Google](how-to/set-up-google-sign-in.md) : projet Google Cloud, clients Web et Android

## Référence : consulter

- [Commandes](reference/commands.md) : scripts npm, Docker, scripts du dépôt
- [Configuration](reference/configuration.md) : les fichiers `.env` de développement, de l'application Android, de
  Gradle
- [Intégration continue](reference/ci.md) : jobs, tags, images, notes de version
- [Comptes, consoles et secrets](reference/accounts-and-secrets.md) : où est quoi, qui le garde
- [Signature Android](reference/android-signing.md) : les trois clés, leurs empreintes, où elles sont déclarées
- [Exploitation](exploitation.md) : pour qui héberge l'application (images, variables, démarrage, mises à jour,
  retour en arrière). Elle reste à la racine de `docs/` : l'ADR 0017 et le dépôt `vps-infra` y renvoient.

## Explication : comprendre

- [Architecture](explanation/architecture.md) : hors ligne d'abord, synchronisation, connexion, déploiement
- [Versions et livraisons](explanation/versions-and-releases.md) : deux produits, deux numéros de version, et
  pourquoi l'API reste compatible
- [Revue d'architecture de septembre 2026](explanation/architecture-review-2026-09.md) : archive, antérieure au
  vocabulaire de l'ADR 0006
