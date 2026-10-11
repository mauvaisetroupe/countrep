# 14. Application utilisable sans compte

- Statut : Accepté
- Date : 2026-10-11
- Remplace : [ADR 0004](0004-protection-des-donnees-locales.md)

## Contexte

La connexion devient facultative ([ADR 0013](0013-connexion-par-compte-google.md)) : sans connexion, l'application doit fonctionner entièrement, sans aucun appel réseau ; une fois connecté, elle synchronise. Aujourd'hui, au contraire :

- tous les écrans exigent d'être connecté ;
- le catalogue d'exercices, la sélection d'exercices de l'utilisateur et ses modèles de séance ne vivent que sur le serveur ;
- la déconnexion efface toutes les données locales (ADR 0004), ce qui n'a plus de sens quand l'application s'utilise aussi sans compte.

## Décision

1. **Tous les écrans sont accessibles sans connexion.** Aucun appel réseau tant qu'on n'est pas connecté ; la synchronisation ne tourne qu'avec une session valide.
2. **Catalogue d'exercices embarqué** dans l'application (`frontend/src/data/exercises.json`), généré à partir de l'API par un script (`frontend/scripts/update-catalog.mjs`). La table `exercises` reste la référence côté serveur (clés étrangères) ; un nouvel exercice demande de régénérer le fichier et de livrer l'application.
3. **Toutes les données de l'utilisateur sont locales** (Dexie), avec le même principe que les saisies (ADR 0002) :
   - **modèles de séance** : table `workouts`, identifiants générés par le client, `syncStatus` / `syncOperation` ; le serveur les reçoit par `PUT /api/workouts/:id`, upsert idempotent limité à l'utilisateur ;
   - **sélection d'exercices** : un enregistrement local, envoyé par `PUT /api/user/exercises` quand il a été modifié ; sinon, la version du serveur remplace la version locale.
4. **Propriétaire des données locales** (`localStorage` `countrep.owner`) : absent tant que l'appareil n'a jamais été connecté.
   - **Connexion, données sans propriétaire** (utilisation sans compte, ou premier appareil) : elles sont **rattachées au compte** et envoyées ; la synchronisation les fusionne avec celles du compte (les saisies et modèles s'additionnent ; une sélection d'exercices modifiée localement remplace celle du compte).
   - **Connexion, données d'un autre compte** : effacées après confirmation s'il reste des données non envoyées, comme avant ; l'annulation abandonne la connexion.
5. **Déconnexion** : deux choix explicites dans Réglages › Compte.
   - **« Se déconnecter »** : les données restent sur l'appareil, l'application continue en local ; elles se resynchronisent à la prochaine connexion du même compte.
   - **« Se déconnecter et effacer les données de ce téléphone »** (téléphone partagé, revente) : tentative de synchronisation, confirmation s'il reste des données non envoyées, puis effacement de la base locale.
6. **Session expirée** : l'application continue en local, sans redirection ; Réglages › Compte invite à se reconnecter.

## Conséquences

- Un nouvel utilisateur, comme un examinateur de Google Play, utilise l'application dès l'ouverture, sans compte.
- L'application démarre et fonctionne hors ligne en entier, y compris les séances et la sélection d'exercices.
- Le serveur garde les anciens points d'accès (`POST /api/workouts`, `GET /api/exercises`) pour les versions déjà installées.
- Ajouter un exercice au catalogue demande une nouvelle version de l'application.
- La sélection d'exercices suit la règle « la dernière modification gagne » : deux appareils qui la modifient sans être connectés gardent la dernière envoyée.
