# 13. Connexion par compte Google

- Statut : Accepté
- Date : 2026-10-11

## Contexte

La connexion se fait aujourd'hui par passkey (WebAuthn) : création d'une clé sur l'appareil, puis « ajouter un appareil » pour chaque téléphone ou ordinateur supplémentaire. Ce mode pose deux problèmes :

- il ne fonctionne pas dans l'application Android Capacitor (ADR 0012) : l'application tourne depuis une origine locale (`https://localhost`), ce qui casse la vérification WebAuthn ;
- il est peu familier : pas de récupération du compte en cas de perte de la clé, ajout d'appareil à expliquer.

Step Challenge utilise déjà la connexion par compte Google. Dans une WebView, Google refuse la connexion web : l'application Android a besoin d'une connexion native, le site web d'une connexion web.

## Décision

1. **Connexion facultative.** Sans connexion, l'application fonctionne entièrement en local, **sans aucun appel réseau** (saisies, séances, journal, statistiques). La connexion active la synchronisation : sauvegarde et utilisation sur plusieurs appareils. « Se connecter avec Google » se propose depuis les réglages, sans être imposé à l'ouverture.
2. **Connexion par compte Google uniquement.** Les passkeys sont retirées (routes WebAuthn, table `user_devices`, écrans d'enregistrement et d'ajout d'appareil), une fois les comptes existants associés à leur compte Google.
3. **Plugin [`@capgo/capacitor-social-login`](https://github.com/Cap-go/capacitor-social-login)** (fournisseur Google) : la même API JavaScript sur le site web (Google Identity Services) et dans l'application Android (Credential Manager de Google). Un seul code de connexion côté client. La version majeure du plugin suit celle de Capacitor.
4. **Identité** : l'identifiant Google `sub`, stable pour un compte Google. Aucune adresse e-mail n'est conservée. Le prénom fourni par Google initialise le nom affiché, que l'utilisateur peut modifier.
5. **Usage du jeton Google**, selon le backend de synchronisation ([ADR 0005](0005-backend-de-synchronisation.md)) :
   - avec notre backend : le client envoie le jeton d'identité (`idToken`) ; le backend vérifie sa signature, son émetteur et son audience (identifiants client web et Android), puis ouvre la session de l'application comme aujourd'hui (JWT, renouvellement glissant de l'ADR 0003) ;
   - avec Google Drive : le jeton d'accès, avec le droit `drive.appdata`, sert à lire et écrire le dossier caché de l'application.
6. **Configuration Google Cloud** : un écran de consentement avec les droits minimaux (`openid`, et `drive.appdata` seulement si la synchronisation Drive est retenue) ; un identifiant client web (origines `countrep.architech.lu`, `localhost` et l'adresse de développement sur le réseau local) ; un identifiant client Android par clé de signature (debug, envoi, clé de Google Play).
7. **Comptes existants** : avant le retrait des passkeys, chaque utilisateur actuel, connecté par passkey, associe une fois son compte Google (Réglages › Compte). Pour les deux comptes actuels, une association par requête SQL reste possible.

## Conséquences

- Plus de clé à créer ni d'appareil à ajouter : un compte Google suffit, sur chaque appareil, et Google assure la récupération du compte.
- **Pas de compte de démonstration** : les examinateurs de Google Play ne pourraient pas se connecter avec un compte Google fourni (connexion bloquée depuis un appareil inconnu, constaté par Step Challenge, son ADR 0006), mais l'application s'utilise sans connexion.
- Un nouvel utilisateur peut essayer l'application avant de se connecter.
- Les données aujourd'hui uniquement sur le serveur (sélection d'exercices, modèles de séance) et le catalogue d'exercices doivent devenir locaux ; à la première connexion sur un appareil, les données locales sont rattachées au compte et fusionnées avec celles déjà synchronisées (ADR 0005).
- Sur un téléphone sans services Google (certains Huawei), la connexion native n'est pas disponible : l'application y fonctionne sans synchronisation.
- La protection des données locales par compte (ADR 0004) est à revoir : des données existent désormais avant toute connexion, et la déconnexion ne doit pas les perdre.
- À vérifier à l'implémentation : sur Android, le plugin peut ne pas renvoyer de jeton d'accès dans certains cas ; cela ne concerne que la synchronisation Drive.
