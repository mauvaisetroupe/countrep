# 16. Suppression du compte

- Statut : Accepté
- Date : 2026-10-22

## Contexte

Google Play exige, pour une application qui crée des comptes, que l'utilisateur puisse supprimer son compte et ses données **depuis l'application**, et aussi depuis une page web accessible sans l'application. La connexion Google crée un compte CountRep ([ADR 0013](0013-connexion-par-compte-google.md)).

Le serveur détient, pour un compte : l'identifiant Google (`users.google_sub`), le prénom affiché (`users.name`), les saisies (`sets`), les modèles de séance (`workouts`, `workout_exercises`) et la sélection d'exercices (`user_exercises`). Ces tables dépendent toutes de `users` par une clé étrangère, avec `ON DELETE CASCADE` sauf `sets.user_id` : supprimer un utilisateur qui a des saisies échoue aujourd'hui.

L'application fonctionne aussi sans compte ([ADR 0014](0014-application-utilisable-sans-compte.md)) : on pourrait garder les données sur l'appareil après la suppression. Mais elles restent rattachées au compte supprimé (`countrep.owner`) et marquées synchronisées : à la connexion suivante, elles seraient prises pour les données d'un autre compte et effacées, ou il faudrait toutes les repasser en attente d'envoi.

## Décision

1. **Clé étrangère `sets.user_id` passée en `ON DELETE CASCADE`**, comme les autres : toutes les données d'un compte disparaissent avec lui.
2. **Route `DELETE /api/auth/me`** (authentifiée) : supprime l'utilisateur, et par cascade toutes ses données. Réponse `204`.
3. **Un compte supprimé n'est plus accepté** : `verifyJWT` vérifie que l'utilisateur du token existe encore, et répond `401` sinon. Un autre appareil connecté au même compte voit sa session expirer (ADR 0003) ; ses données locales restent sur cet appareil.
4. **Dans l'application** : Réglages › Compte › « Supprimer mon compte », avec confirmation. Après la réponse du serveur, **toutes les données de l'appareil sont effacées** (même effacement que la déconnexion avec effacement, ADR 0014) ; l'application revient à l'état d'une première utilisation, sans compte.
5. **Page web** : la démarche (se connecter dans l'application, puis Réglages › Compte) est décrite sur le site public, avec une adresse de contact pour qui n'a plus l'application.

## Conséquences

- L'exigence de Google Play est couverte, et le formulaire « Sécurité des données » peut déclarer la suppression sur demande.
- La suppression est définitive et immédiate : pas de délai de grâce, pas de sauvegarde côté serveur. Les sauvegardes de la base, si elles existent, en gardent une copie jusqu'à leur rotation.
- Une requête de plus (par clé primaire) pour chaque appel authentifié.
- Hors ligne, la suppression est impossible : l'application affiche une erreur, rien n'est effacé.
