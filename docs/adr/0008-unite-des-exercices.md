# 8. Unité des exercices : répétitions ou secondes

- Statut : Accepté
- Date : 2026-10-11

## Contexte

Certains exercices ne se comptent pas en répétitions mais en durée : gainage, maintien en appui aux anneaux, planche latérale, position creuse. Jusqu'ici, on les saisissait comme des répétitions (10 pour 10 secondes), et les totaux du journal, l'équivalence Garmin et les objectifs de séance les mélangeaient aux répétitions.

Deux approches ont été envisagées :

- **une équivalence fixe** (une répétition = N secondes) : rien ne change dans le modèle, mais l'interface continue à afficher des « reps » qui n'en sont pas ;
- **une unité par exercice**, retenue.

## Décision

- La table `exercises` reçoit une colonne `unit` (`'reps'` par défaut, ou `'seconds'`). Elle est renvoyée par `/api/exercises`, `/api/user/exercises` et dans les exercices de `/api/workouts`.
- La valeur d'un set (`sets.reps`) et l'objectif d'un exercice de séance (`workout_exercises.reps`) gardent leur nom et leurs contraintes (entier > 0). Pour un exercice `'seconds'`, c'est un nombre de secondes. L'API, la synchro et Dexie ne changent pas.
- Les anciennes saisies de `support-hold` étaient déjà en secondes (10 = 10 s) : passer l'exercice en `'seconds'` suffit. `hollow-body-hold` et `side-plank` passent aussi en secondes. `front-to-side-plank` reste en répétitions, car c'est un mouvement.
- L'interface affiche et saisit la valeur dans l'unité de l'exercice (« 45 s », « 1 min 30 », valeurs rapides en secondes). La séance en cours copie l'unité avec la séance ; une séance démarrée avant reprend l'unité du catalogue. Si l'unité est inconnue (catalogue pas encore chargé, hors ligne), l'exercice est compté en répétitions.
- Les totaux additionnent séparément répétitions et secondes. Dans les statistiques, avec un seul exercice, les totaux sont dans son unité ; avec tous les exercices, seules les répétitions sont additionnées.
- Équivalence Garmin : une minute vaut 30 s d'effort et 30 s de repos, soit 15 répétitions ou 30 secondes tenues.

## Conséquences

- Un exercice à la durée s'enregistre et se lit naturellement, sans astuce de saisie.
- Le nom `reps` des colonnes et des champs ne reflète plus toujours la valeur. Il est gardé pour ne pas toucher au contrat de synchro (ADR 0002) ; un renommage en `value` pourra suivre s'il gêne.
- Changer l'unité d'un exercice qui a déjà des sets change le sens de leurs valeurs : à faire seulement si elles sont déjà dans la nouvelle unité.
