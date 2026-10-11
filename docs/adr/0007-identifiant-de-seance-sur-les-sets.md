# 7. Identifiant de séance sur les sets

- Statut : Accepté
- Date : 2026-10-11

## Contexte

Une séance (preview, ADR 0006) devient à l'enregistrement une liste de sets indépendants. Une fois enregistrés, plus rien ne les relie : on ne peut ni afficher la séance comme un tout dans le journal, ni proposer de la rouvrir pour la modifier.

Deux références ont été envisagées :

- **l'identifiant de la séance réalisée**, qui regroupe les sets ;
- **l'identifiant du modèle suivi** (`workout_id`). Les modèles se modifient et se suppriment librement : la référence deviendrait fausse ou orpheline, et elle n'apporte rien pour retrouver ou modifier la séance.

## Décision

- Les sets reçoivent un champ facultatif `sessionId` (colonne `sets.session_id uuid NULL`, index `(user_id, session_id)`).
- À l'enregistrement d'une preview, tous ses sets reçoivent l'`id` de la preview, déjà un UUID généré par le client. Une saisie isolée (mode Exercice) garde `null`.
- Il n'y a pas de table `sessions` ni de clé étrangère : une séance n'a pas d'autre donnée que ses sets. Une table pourra être ajoutée le jour où il faudra stocker des informations propres à la séance (début, fin, note).
- Le modèle suivi n'est pas référencé.
- API : `sessionId` est renvoyé par `GET /api/sets`, accepté par l'upsert `POST` et par `PATCH`. Dans le `PATCH`, une valeur absente ou `null` laisse la valeur actuelle en place : on ne détache pas un set de sa séance.
- Dexie : `sessionId` est indexé (version 6 de la base).

## Conséquences

- Le journal pourra regrouper les sets d'une séance, et une séance pourra être rouverte pour être modifiée. Ces écrans restent à faire.
- Les sets enregistrés avant cette décision n'ont pas de `sessionId` ; ils restent des saisies isolées.
- La compatibilité avec les anciennes PWA n'est pas recherchée (1 à 2 utilisateurs, mise à jour rapide). Une ancienne version qui modifie un set ne lui fait pas perdre son `sessionId` (le `PATCH` le conserve), mais son upsert `POST`, s'il rejoue une création, le remet à `null`.
