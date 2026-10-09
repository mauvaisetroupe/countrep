# 4. Protection des données locales à la déconnexion et au changement de compte

- Statut : Accepté
- Date : 2026-10-09

## Contexte

IndexedDB contient des séances pas encore envoyées au serveur (`syncStatus = 'pending'`). Deux situations pouvaient les perdre ou les corrompre :

1. **Déconnexion** : `logout` supprimait toute la base IndexedDB sans vérifier s'il restait des séances en attente (typiquement hors ligne, ou juste après un 401).
2. **Changement de compte** : les séances locales ne savent pas à quel utilisateur elles appartiennent. Si un autre compte se connectait sur l'appareil (par exemple après une expiration de session, qui conserve les données, cf. ADR 0003), les séances en attente du compte précédent étaient poussées sur le nouveau compte.

## Décision

- **Propriétaire des données locales** : l'id utilisateur du dernier token adopté est mémorisé (`localStorage` `countrep.owner`, posé par `authStore.setToken`, retiré par `logout`). On ne l'ajoute pas à chaque workout : un appareil n'héberge les données que d'un seul compte à la fois.
- **Connexion** : avant d'adopter un nouveau token, `services/session.ts#prepareLocalDataFor` compare son `userId` au propriétaire. S'il diffère, les données locales sont effacées, après confirmation s'il reste des séances en attente (l'annulation abandonne la connexion). Sans propriétaire connu (installation antérieure), les données sont conservées et adoptées.
- **Déconnexion** : `services/session.ts#logoutSafely` tente d'abord de synchroniser, puis demande confirmation s'il reste des séances en attente avant d'effacer.
- L'effacement de la base passe par `db.delete({ disableAutoOpen: false })` de Dexie plutôt que `indexedDB.deleteDatabase`, pour fermer proprement les connexions ouvertes (plus de suppression « bloquée ») et permettre la réouverture sans recharger la page.

## Conséquences

- Plus de perte silencieuse : toute suppression de séances non synchronisées est confirmée explicitement.
- Les séances en attente d'un autre compte ne peuvent pas être envoyées vers le bon compte ; elles sont supprimées (avec confirmation) plutôt que mises de côté. Choix simple, adapté à un usage personnel où le changement de compte est rare.
- Les confirmations utilisent `window.confirm` : fonctionnel mais non stylé, à remplacer par une modale si besoin.
