# 5. Backend de synchronisation : le nôtre ou Google Drive

- Statut : Proposé
- Date : 2026-10-11

## Contexte

Les données de CountRep sont locales d'abord (IndexedDB) et synchronisées avec un backend Fastify / PostgreSQL hébergé sur un LXC du home lab, derrière Cloudflare (ADR 0002 à 0004). CountRep n'a **aucune donnée partagée entre utilisateurs** : le backend ne sert qu'à sauvegarder les données de chaque personne et à les synchroniser entre ses appareils.

La connexion se fait par compte Google, et elle est **facultative** ([ADR 0013](0013-connexion-par-compte-google.md)) : sans connexion, l'application fonctionne entièrement en local, sans aucun appel réseau ; une fois connecté, elle synchronise. Reste à choisir **le backend de cette synchronisation**.

La publication sur Google Play demande, pour une application qui crée des comptes, leur suppression (dans l'application et sur une page web), une politique de confidentialité et un formulaire « Sécurité des données » à la mesure des données détenues par l'éditeur. Deux utilisateurs ont aujourd'hui un historique sur le backend actuel.

## Options

### Option A — Notre backend (Fastify / PostgreSQL)

- Le client envoie le jeton d'identité Google ; le backend le vérifie et ouvre la session (ADR 0013). La synchronisation reste celle des ADR 0002 à 0004, étendue aux données aujourd'hui uniquement serveur (sélection d'exercices, modèles de séance).
- Suppression de compte : une route qui efface l'utilisateur et toutes ses données, appelée depuis l'application ; une page web qui explique la démarche.
- ✅ Synchronisation existante et éprouvée ; historique déjà en place ; une API pour d'éventuels besoins futurs (intégration Garmin, partage).
- ❌ Hébergement, déploiement, sauvegardes et disponibilité à assurer ; RGPD : l'éditeur détient des données d'activité physique de tiers ; formulaire « Sécurité des données » complet.

### Option B — Google Drive

- Synchronisation avec un **dossier d'application caché** (`appDataFolder`) du Google Drive de l'utilisateur, avec le jeton d'accès Google (droit `drive.appdata`). L'API Drive est utilisable depuis l'application et depuis un site web statique.
- ✅ Rien à héberger ni à sauvegarder : le LXC, `deploy.sh`, Nginx et la base CountRep disparaissent ; pas de compte chez l'éditeur, « effacer mes données » (local et dossier Drive) remplace la suppression de compte ; formulaire « Sécurité des données » très léger (classement exact à vérifier).
- ❌ Synchronisation à réécrire contre Drive, y compris la fusion des modifications faites hors ligne sur plusieurs appareils (les `id`, `updatedAt` et suppressions marquées s'y prêtent) ; historique actuel à reprendre par export / import ; une intégration Garmin demanderait un petit backend dédié.
- ⚠️ À vérifier : le classement de `drive.appdata` par Google (un droit « sensible » impose une validation de l'application) ; l'obtention du jeton d'accès sur Android avec le plugin de connexion (ADR 0013).

### Piste écartée

- **Firebase / Firestore** : un backend géré par un tiers, sans avantage sur les deux options pour ce besoin.

## Décision

À prendre.

## Éléments communs aux deux options

Ils découlent de la connexion facultative (ADR 0013).

- **Catalogue d'exercices embarqué** dans l'application (noms, unités, illustrations) : plus d'appel à `GET /api/exercises`. Les identifiants restent ceux de la table `exercises` actuelle.
- **Toutes les données de l'utilisateur sont locales** : saisies, séances réalisées, sélection d'exercices et modèles de séance. Le backend n'en est qu'une copie synchronisée.
- **Première connexion sur un appareil** : les données locales sont rattachées au compte et fusionnées avec celles déjà synchronisées (cas d'un deuxième téléphone).
- **Déconnexion** : à redéfinir (aujourd'hui, elle efface les données locales, ADR 0004).
- **Export / import JSON** : réversibilité et sauvegarde manuelle ; avec l'option B, reprise de l'historique actuel. Format (version 2, vocabulaire de l'ADR 0006) :

```json
{
  "format": "countrep-export",
  "version": 2,
  "exportedAt": "2026-10-11T12:00:00Z",
  "userExercises": ["australian-pull-up", "crunch"],
  "workouts": [
    {
      "id": "uuid",
      "name": "PUSH",
      "rounds": 3,
      "exercises": [{ "exerciseId": "dumbbell-bench-press", "reps": 10 }]
    }
  ],
  "sets": [
    {
      "id": "uuid",
      "exercise": "crunch",
      "date": "2026-10-09",
      "time": "18:30:00",
      "reps": 15,
      "sessionId": null,
      "sessionName": null,
      "createdAt": 1791561600000,
      "updatedAt": 1791561600000
    }
  ]
}
```

Les sets supprimés ne sont pas exportés.

## Conséquences (selon l'option retenue)

- **A** : les ADR 0002 à 0004 restent la référence, étendus aux nouvelles données synchronisées.
- **B** : les ADR 0002 à 0004 seront remplacés par un ADR sur la synchronisation Drive ; le site web devient statique.
