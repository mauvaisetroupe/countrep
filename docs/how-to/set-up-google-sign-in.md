# Configurer la connexion Google

La connexion se fait avec un compte Google (ADR 0013) : l'application obtient un **jeton d'identité** de Google et
l'envoie à `POST /api/auth/google`, qui vérifie sa signature et son audience (`GOOGLE_CLIENT_IDS`). Aucun secret OAuth
n'est nécessaire : les identifiants clients sont publics.

Tout se règle dans la [console Google Cloud](https://console.cloud.google.com), projet **`countrep`**, menu **Google
Auth Platform**.

## L'existant

| Élément | Valeur |
|---|---|
| Audience | **Externe**, mode **Test** : seuls les utilisateurs de test peuvent se connecter (100 au plus) |
| Droits | `openid` (et le profil de base), rien de sensible : pas de vérification par Google |
| Client **Web** | `14127079549-o2h7n8qpjnru8v257fpqkjo8mppluqfo.apps.googleusercontent.com`, utilisé partout (web **et** Android) |
| Client **Android**, debug | « CountRep Android debug », package `lu.architech.countrep`, SHA-1 de la clé de debug du Mac |
| Clients **Android** à ajouter | Clé Google Play et clé d'importation ([Signature Android](../reference/android-signing.md)) |

Où l'identifiant Web est écrit : `frontend/.env.development`, `frontend/.env.android`, `Dockerfile`
(`VITE_GOOGLE_WEB_CLIENT_ID`), `backend/.env.example` et le `.env` du host (`GOOGLE_CLIENT_IDS`).

## Ajouter un utilisateur

Tant que l'audience est en mode Test : Google Auth Platform › **Audience** › Utilisateurs de test › Ajouter des
utilisateurs, avec son adresse Gmail. Sinon la connexion échoue avec « Accès bloqué : l'application n'a pas terminé
la procédure de validation ».

Pour ouvrir à tout le monde : Audience › **Publier l'application**. Il faut d'abord, dans **Branding**, le nom, l'e-mail
d'assistance, la page d'accueil et la politique de confidentialité (`https://sport.architech.lu/countrep/privacy.html`),
**sans logo** (un logo déclenche une vérification).

## Client Web : origines et redirections

Google Auth Platform › **Clients** › le client Web :

- **Origines JavaScript autorisées** : `https://countrep.architech.lu`, `http://localhost:5173`, `http://localhost`.
- **URI de redirection autorisées** : `https://countrep.architech.lu/` et `http://localhost:5173/`, **avec le slash
  final**. Sur le web, le plugin ouvre une popup OAuth qui revient sur `origin + '/'` ; une adresse absente donne
  `Error 400: redirect_uri_mismatch`.

Google refuse `http://` sur une adresse IP : en développement, se connecter sur `http://localhost:5173`, pas sur
`http://192.168.x.x:5173`. Un changement met quelques minutes à prendre effet.

## Client Android : un par clé de signature

Google n'accepte la connexion depuis l'application que si son package et l'empreinte SHA-1 de la clé qui l'a signée
correspondent à un client Android. L'application envoie pourtant l'identifiant **Web** : le client Android ne sert
qu'à autoriser l'application.

1. Lire la SHA-1 de la clé ([Signature Android, Où lire les empreintes](../reference/android-signing.md#où-lire-les-empreintes)) :
   - debug : `cd frontend/android && ./gradlew :app:signingReport` ;
   - importation : `keytool -list -v -keystore ~/keystores/countrep-upload.jks -alias countrep-upload` ;
   - Google Play : Play Console › Tester et publier › Configuration › Intégrité de l'appli › Signature de l'appli.
2. Clients › **Créer un client** › type **Android** : nom (« CountRep Android Google Play »), package
   `lu.architech.countrep`, SHA-1.
3. Mettre à jour le tableau de [Signature Android](../reference/android-signing.md#où-elles-sont-déclarées).

Rien à changer dans l'application ni dans `GOOGLE_CLIENT_IDS` : l'audience du jeton reste l'identifiant Web.

## Si ça ne va pas

| Symptôme | Cause |
|---|---|
| `Error 400: redirect_uri_mismatch` (web) | URI de redirection absente ou sans slash final |
| « Accès bloqué » | Compte pas dans les utilisateurs de test |
| `[28444] Developer console is not set up correctly`, `DEVELOPER_ERROR` (Android) | Pas de client Android pour la SHA-1 de la clé qui a signé cette installation |
| L'API répond 401 à `/api/auth/google` | Identifiant client absent de `GOOGLE_CLIENT_IDS` ; le journal de l'API dit pourquoi le jeton est refusé |
| Téléphone sans services Google (certains Huawei) | Pas de connexion native : l'application s'utilise sans compte |
