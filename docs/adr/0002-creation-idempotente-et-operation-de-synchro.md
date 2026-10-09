# 2. Création idempotente et opération de synchronisation conservée

- Statut : Accepté
- Date : 2026-10-09

## Contexte

Les workouts sont écrits d'abord dans IndexedDB avec `syncStatus = 'pending'` et une `syncOperation` (`create`, `update`, `delete`), puis poussés vers l'API. Plusieurs cas faisaient rester un workout `pending` pour toujours, sans jamais atteindre le serveur :

1. **Modification avant synchronisation** : `updateWorkout` remplaçait toujours `syncOperation` par `update`. Un workout créé hors ligne (ou avec un token expiré) puis corrigé déclenchait un `PATCH` sur un id inconnu du serveur → 404 → bloqué.
2. **Création rejouée** : le `POST` faisait un simple `INSERT`. Si la réponse était perdue après l'écriture en base, ou si deux synchronisations concurrentes poussaient le même workout (`TodayView` synchronise immédiatement pendant que `sync()` pousse les pending), le second `POST` échouait sur la clé primaire → bloqué.
3. **Modification pendant l'appel réseau** : la synchro marquait le workout `synced` après la réponse, même s'il avait été modifié entre-temps → la modification n'était jamais envoyée.

## Décision

- **Côté serveur**, `POST /api/workouts` est un upsert idempotent sur l'id généré par le client (`ON CONFLICT (id) DO UPDATE`, restreint au même `user_id` ; un conflit avec un autre utilisateur renvoie 409).
- **Côté client**, un workout dont l'opération en attente est `create` la garde lorsqu'il est modifié. Supprimer un workout jamais créé sur le serveur le retire localement sans appel réseau.
- Un `PATCH` qui reçoit 404 est rejoué en création, ce qui débloque les workouts déjà coincés dans les IndexedDB existantes.
- Un workout n'est marqué `synced` que si son `updatedAt` local n'a pas changé pendant l'appel (`workoutRepository.markSynced`).
- La synchro d'un workout passe par un point unique, `syncOne`, qui choisit l'appel selon `syncOperation`.

## Conséquences

- Rejouer une synchronisation est sans danger ; plus d'erreur de clé dupliquée.
- Le dernier client qui écrit gagne pour un même id (pas de résolution de conflit) : acceptable, un workout n'est en pratique édité que depuis l'appareil qui l'a créé.
- Le repli 404 → création peut faire réapparaître un workout supprimé depuis un autre appareil si celui-ci a été modifié localement entre-temps : la modification locale est considérée comme une intention plus récente.
- Prérequis : `workouts.id` doit porter une contrainte d'unicité (clé primaire) pour que `ON CONFLICT (id)` fonctionne.
