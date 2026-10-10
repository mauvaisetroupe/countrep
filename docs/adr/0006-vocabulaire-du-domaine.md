# 6. Vocabulaire du domaine : set, workout, round

- Statut : Accepté
- Date : 2026-10-10

## Contexte

Le code employait `workout` pour **une saisie isolée** (un exercice, N répétitions, à une heure donnée), et `routine` pour **un modèle de séance** (des exercices avec leurs répétitions, enchaînés plusieurs fois). En anglais, et dans les applications de musculation, un *workout* désigne au contraire une séance entière, et une saisie isolée est un *set*.

Ce décalage devenait gênant avec l'arrivée des séances (modèles, séance en cours, aperçu) : on ne pouvait plus nommer clairement une séance sans entrer en collision avec les saisies.

## Décision

| Terme | Sens | Stockage | API | Interface (français) |
|---|---|---|---|---|
| **set** | Une saisie : un exercice, N répétitions, date et heure | table `sets`, Dexie `sets` | `/api/sets` | saisie, série |
| **workout** | Un modèle de séance : exercices ordonnés avec leurs répétitions, répétés `rounds` fois | tables `workouts` et `workout_exercises` | `/api/workouts` | séance |
| **round** | Un passage sur tous les exercices d'un workout | non stocké | — | série |
| **preview** | La séance en cours, brouillon local jusqu'à son enregistrement | Dexie `previews` | — | séance en cours, aperçu |

Avec le renommage, le contenu d'un set est aussi nettoyé :

- `workoutTime` / `workout_time` devient `time` ;
- le champ `mode` (`'add' | 'set'`) est supprimé : il valait toujours `'add'`, et sa valeur `'set'` serait entrée en collision avec le nouveau nom.

L'interface en français ne change pas.

### Migration

- **PostgreSQL** : une transaction renomme d'abord `workouts` en `sets`, puis `routines` en `workouts` et `routine_exercises` en `workout_exercises`, avec leurs colonnes, contraintes (y compris les `NOT NULL` nommées de PostgreSQL 18) et index (`backend/database.sql`, 2026-10-10).
- **Dexie** : une table ne peut pas être renommée. La version 4 crée `sets` et y copie les données de `workouts` en les convertissant ; elle convertit aussi la séance en cours éventuelle. La version 5 supprime l'ancienne table. La base IndexedDB garde son nom `WorkoutDatabase` : le changer créerait une base vide.
- **localStorage** : les anciennes clés (`workout_selected_exercise`, `countrep.selectedRoutine`) et la valeur de mode `'routine'` sont reprises une fois, puis supprimées.

### Bascule

`/api/workouts` change de sens. La bascule est directe, sans période de compatibilité : CountRep n'a qu'un utilisateur. La procédure est d'appliquer la migration SQL, de déployer, puis de mettre à jour la PWA aussitôt.

Une PWA restée sur l'ancienne version qui synchronise entre-temps ne fait perdre aucune donnée au serveur : ses écritures sont refusées ou ne trouvent rien à supprimer. Sa base locale peut être polluée temporairement ; la première synchronisation de la nouvelle version la répare (les éléments synchronisés absents du serveur sont retirés, les sets en attente sont renvoyés).

## Conséquences

- Le code, la base et l'API parlent le même langage que le domaine. Une séance réalisée pourra un jour être enregistrée sans ambiguïté de nom.
- Les ADR 0002 à 0004, antérieurs, emploient « workout » au sens de set. Ils ne sont pas réécrits.
- Le futur client mobile (ADR 0005, proposé) reprendra directement ce vocabulaire.
