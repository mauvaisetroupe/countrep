# 5. Application mobile Expo, données locales, sans serveur

- Statut : Proposé
- Date : 2026-10-10

## Contexte

CountRep est aujourd'hui une PWA Vue 3 avec un backend Fastify et une base PostgreSQL, hébergés sur un LXC du home lab derrière Cloudflare. Les données sont saisies hors ligne dans IndexedDB puis synchronisées avec le serveur (ADR 0002 à 0004). L'authentification se fait par passkey, avec un JWT.

Évolutions envisagées :

- de nouvelles fonctionnalités, à commencer par les séances prédéfinies (« 10 tractions australiennes, 15 crunchs… × 5 séries ») en plus du GTG ;
- une publication sur Google Play : il existe un créneau pour une application GTG simple et sans publicité, peu couvert sur Android ;
- des besoins qu'une PWA couvre mal : rappels locaux programmés, widget, Health Connect.

Le serveur central ne se justifie pas ici. Contrairement à Step Challenge (classement entre amis), CountRep n'a **aucune donnée partagée entre utilisateurs** : le serveur ne sert qu'à sauvegarder et à synchroniser les données d'une seule personne. Or il coûte cher :

- hébergement, déploiement, sauvegardes et disponibilité à assurer ;
- comptes utilisateurs : authentification, sessions, et pour le Store suppression de compte, accès de démonstration pour les examinateurs, et Sign in with Apple si l'application arrive un jour sur iOS ;
- RGPD : l'éditeur détiendrait des données d'activité physique de tiers ;
- complexité de la synchronisation hors ligne (ADR 0002 à 0004).

L'auteur maîtrise déjà la chaîne Expo / EAS / Google Play grâce à son application Step Challenge (Expo SDK 57, en test fermé sur le Play Store).

Un seul utilisateur aujourd'hui (l'auteur) : il n'y a pas de migration d'utilisateurs à gérer, seulement environ un mois d'historique à récupérer.

## Décision

1. **Client** : une application **Expo / React Native** (Android d'abord), dans `apps/mobile`, sur le modèle de Step Challenge (expo-router, builds EAS).
2. **Données** : une base **SQLite locale** (`expo-sqlite`), seule source de vérité. **Pas de backend, pas de compte, pas de connexion.**
3. **Sauvegarde** : **Android Auto Backup**, activé par défaut par Expo (`android.allowBackup`). Android sauvegarde les données de l'application dans le Google Drive de l'utilisateur (25 Mo maximum, hors quota, environ une fois par jour, appareil inactif et en Wi-Fi), et les restaure à la réinstallation ou sur un nouveau téléphone. Les règles de sauvegarde générées (notamment celles d'`expo-secure-store`, si on l'utilise) doivent inclure la base SQLite : à vérifier.
4. **Export / import JSON** dans l'application : réversibilité, sauvegarde manuelle, et migration de l'historique actuel.
5. **Catalogue d'exercices** embarqué dans l'application (noms et illustrations), au lieu des tables `exercises` et `user_exercises`. La sélection des exercices de l'utilisateur devient locale.
6. **Pistes écartées pour l'instant** :
   - **synchronisation Google Drive (`appDataFolder`)** : multi-appareils sans serveur, scope `drive.appdata` non sensible. À reprendre par un nouvel ADR si un deuxième appareil ou un client web devient un vrai besoin ;
   - **Firebase / Firestore** : réintroduit un serveur (géré par un tiers) pour un besoin qui n'existe pas ;
   - **conserver le backend actuel** : coût d'exploitation et obligations du Store disproportionnés pour des données individuelles.

### Format d'export (version 1)

```json
{
  "format": "countrep-export",
  "version": 1,
  "exportedAt": "2026-10-10T12:00:00Z",
  "userExercises": ["australian-pull-up", "crunch"],
  "workouts": [
    {
      "id": "uuid",
      "exercise": "crunch",
      "date": "2026-10-09",
      "workoutTime": "18:30:00",
      "reps": 15,
      "mode": "add",
      "createdAt": 1791561600000,
      "updatedAt": 1791561600000
    }
  ]
}
```

Les identifiants d'exercice sont ceux de la table `exercises` actuelle, pour que l'historique migré corresponde au catalogue embarqué. Les workouts supprimés (`deleted_at` non nul) ne sont pas exportés.

### Migration de l'historique

Une requête SQL ponctuelle sur la base de production produit ce JSON. L'application l'importe ensuite par sa fonction d'import, sans code spécifique à la migration.

## Conséquences

- Plus de serveur à héberger, déployer ni sauvegarder : le LXC, `deploy.sh`, Nginx et la base CountRep pourront être retirés après la bascule.
- Plus de comptes : la fiche « Sécurité des données » du Play Store peut déclarer qu'aucune donnée n'est collectée. Pas de suppression de compte ni d'accès démo à fournir pour l'examen. C'est aussi un argument face aux applications concurrentes.
- Le hors ligne n'est plus un mode dégradé : c'est le fonctionnement normal. Les ADR 0002, 0003 et 0004 (synchronisation, sessions, protection des données locales) ne s'appliquent plus au nouveau client. Ils seront marqués « Remplacé par ADR 0005 » à l'arrêt de la PWA.
- **Perte possible** : en cas de perte du téléphone, jusqu'à environ 24 h de saisies (délai entre deux sauvegardes automatiques). L'utilisateur peut aussi désactiver la sauvegarde Android ; l'export manuel reste alors son seul filet.
- **Pas de multi-appareils ni d'accès web** : la PWA actuelle disparaîtra.
- **Intégration Garmin** : la Training API (envoi de modèles de séance vers la montre) demande un serveur pour les accès partenaires et les jetons OAuth. Si elle se concrétise, il faudra un petit backend dédié, par un nouvel ADR.
- La PWA et le backend actuels restent en service jusqu'à ce que l'application couvre l'usage quotidien (écran du jour, journal, stats). Les séances prédéfinies sont développées directement dans la nouvelle application.

## Plan

1. Socle : projet Expo dans `apps/mobile`, schéma SQLite, catalogue embarqué, écran du jour (saisie GTG).
2. Export / import JSON, puis migration de l'historique depuis la production.
3. Journal et statistiques : parité avec la PWA, puis bascule de l'usage quotidien.
4. Séances prédéfinies (ADR à venir sur leur modèle).
5. Publication sur Google Play : fiche, politique de confidentialité, test fermé.
6. Arrêt de la PWA et du backend ; ADR 0002 à 0004 marqués remplacés.
