# 11. Nom et modification d'une séance réalisée

- Statut : Accepté
- Date : 2026-10-11

## Contexte

Depuis l'ADR 0007, les sets d'une séance enregistrée partagent un `session_id`, mais rien ne s'en sert : dans le journal, une séance apparaît comme une suite de saisies isolées, et on ne peut pas la corriger d'un bloc. Le nom de la séance (« PUSH ») n'est pas conservé : l'ADR 0007 a écarté une référence au modèle (`workout_id`), qui peut être modifié ou supprimé.

## Décision

- Les sets d'une séance reçoivent aussi son **nom au moment de l'enregistrement** : colonne `sets.session_name` (`sessionName` dans l'API et Dexie), NULL pour une saisie isolée. C'est une copie, pas une référence : elle reste juste si le modèle change ou disparaît. Champ non indexé : pas de nouvelle version Dexie. Le `PATCH` garde la valeur actuelle quand le champ est absent, comme pour `session_id`.
- **Journal** : dans un jour, les sets d'une même séance sont regroupés sous un en-tête (nom, heure de début, nombre de séries) placé à la position de leur set le plus récent ; les saisies isolées restent des lignes simples. Sans nom (séances enregistrées avant cette décision), l'en-tête affiche « Séance ».
- **Modification** : le bouton « Modifier » de l'en-tête rouvre la séance comme un brouillon (`previews`), dans l'écran de séance existant. L'id du brouillon est le `session_id`, chaque saisie garde l'id de son set, et le brouillon retient la liste des sets d'origine. À l'enregistrement, dans une seule transaction :
  - les sets dont la valeur ou l'heure a changé passent en attente de mise à jour ;
  - les nouvelles saisies deviennent des sets en attente de création, avec le même `session_id` et le même nom ;
  - les sets retirés passent en attente de suppression.
  Les règles de synchro sont celles des sets isolés (ADR 0002) : un set jamais envoyé reste une création, ou disparaît s'il est retiré. Abandonner la modification ne touche pas à la séance enregistrée.
- Une seule séance en cours à la fois : on ne peut pas en rouvrir une pendant qu'une autre est en cours.
- La séance rouverte est reconstruite à partir de ses sets : exercices dans l'ordre de leur première saisie, nombre de séries de l'exercice le plus répété, objectif égal à la valeur de la première série. Un exercice présent deux fois dans le modèle n'occupe qu'une colonne.

## Conséquences

- Une séance se lit et se corrige comme un tout, sans perdre son regroupement.
- Les séances enregistrées avant cette décision n'ont pas de nom ; celles importées pour un utilisateur peuvent en recevoir un par une requête SQL ponctuelle.
- La pagination du journal (par sets) peut couper une séance entre deux pages ; son en-tête reste correct, car il est calculé sur tous ses sets.
