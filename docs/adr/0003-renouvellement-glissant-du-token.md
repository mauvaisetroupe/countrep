# 3. Renouvellement glissant du token et expiration sans perte

- Statut : Accepté
- Date : 2026-10-09

## Contexte

L'authentification se fait par passkey (WebAuthn), qui produit un JWT de 7 jours stocké dans `localStorage`. Ce token n'était jamais renouvelé : même en usage quotidien, l'utilisateur était déconnecté tous les 7 jours. Se reconnecter demande une action (passkey), on ne peut donc pas « redemander l'authentification » silencieusement avant l'expiration.

De plus, un 401 de l'API n'était traité nulle part : avec un token refusé, l'app continuait de fonctionner sans rien signaler, les séances restant en attente sans que l'utilisateur le sache.

## Décision

- **Renouvellement glissant** : `POST /api/auth/refresh` (protégé par `verifyJWT`) échange un token encore valide contre un nouveau token de 7 jours. Le client l'appelle dès que le token a plus d'un jour (`services/session.ts#ensureFreshToken`), au démarrage, au retour au premier plan (`visibilitychange`) et avant chaque synchronisation. Hors ligne, l'échec est ignoré.
- **401 centralisé** : tous les appels authentifiés passent par `api/client.ts#apiFetch`. Sur 401, la session est marquée expirée (`authStore.markSessionExpired`) : le token est retiré, **IndexedDB n'est pas touchée**, et `App.vue` redirige vers la connexion.
- L'écran de connexion indique que la session a expiré et combien de séances en attente sont conservées. Après reconnexion, la synchronisation au montage de la vue les envoie.

## Conséquences

- Un utilisateur qui ouvre l'app au moins une fois par semaine ne se reconnecte plus jamais.
- Une session peut durer indéfiniment tant qu'elle est utilisée : un token volé reste exploitable tant qu'il est rafraîchi. Accepté vu la nature des données ; une durée de session absolue (claim `auth_time` vérifié au refresh) pourra être ajoutée par un ADR ultérieur si besoin.
- Il n'y a pas de révocation côté serveur (JWT sans état), comme auparavant.
- Limite connue : avec un token expiré **et** sans réseau, le garde de route renvoie vers la connexion, qui nécessite le réseau ; les séances déjà saisies restent conservées mais l'app n'est pas utilisable hors ligne dans ce cas. Le renouvellement glissant rend ce cas rare (plus de 7 jours sans ouvrir l'app en ligne).
