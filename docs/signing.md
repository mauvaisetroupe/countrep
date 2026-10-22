# Signature de l'application Android

Une application Android est identifiée par son **nom de package** (`lu.architech.countrep`) et par le **certificat** qui la signe. Plusieurs services vérifient ce certificat au moyen de son **empreinte** (SHA-1 ou SHA-256) : il faut la leur déclarer.

Les empreintes ne sont pas des secrets. Les **clés** (keystores, mots de passe) ne doivent jamais être commitées.

## Les trois clés

| Clé | Ce qu'elle signe | Où elle est |
|---|---|---|
| **Signature Google Play** (*app signing key*) | L'application **installée depuis le Play Store** : Google re-signe l'`.aab` envoyé (Play App Signing) | Chez Google, inaccessible |
| **Importation** (*upload key*) | L'`.aab` produit par `npm run bundle:android`, avant son envoi au Play Store | Keystore hors du dépôt, sauvegardé dans le gestionnaire de mots de passe |
| **Debug** | Les builds locaux (`npx cap run android`) | `~/.android/debug.keystore`, créé par le SDK Android, propre à chaque ordinateur |

Empreintes de la clé d'importation (`CN=Lionel Coquin, O=architech.lu, C=LU`, créée le 2026-10-22) :

- SHA-1 : `51:68:17:13:04:3D:3A:EE:40:F5:B7:D5:04:E3:25:25:2D:1D:FC:08`
- SHA-256 : `BA:5B:68:ED:9F:37:0F:D1:8A:7C:6A:CA:33:07:9C:38:6D:FF:9C:72:B4:4B:5E:A7:91:89:7A:5B:2F:14:66:A6`

Perdre la clé d'importation n'est pas fatal avec Play App Signing : Google permet de la remplacer (Play Console → Intégrité de l'appli). Perdre celle de Google Play n'est pas possible : Google la garde.

## Créer la clé d'importation (une fois)

```bash
mkdir -p ~/keystores
keytool -genkeypair -v \
  -keystore ~/keystores/countrep-upload.jks \
  -alias countrep-upload \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Lionel Coquin, O=architech.lu, C=LU"
```

`keytool` demande le mot de passe du keystore (et celui de la clé : le même convient). Ranger le fichier `.jks` et le mot de passe dans le gestionnaire de mots de passe.

Puis, dans `~/.gradle/gradle.properties` (hors du dépôt) :

```properties
COUNTREP_UPLOAD_STORE_FILE=/Users/<utilisateur>/keystores/countrep-upload.jks
COUNTREP_UPLOAD_STORE_PASSWORD=…
COUNTREP_UPLOAD_KEY_ALIAS=countrep-upload
COUNTREP_UPLOAD_KEY_PASSWORD=…
```

`frontend/android/app/build.gradle` les lit pour signer le build release ; sans elles, le build release n'est pas signé (avertissement de Gradle) et Google Play le refuse.

## Produire une version

1. Monter la version dans `frontend/package.json` (`version`, par exemple `1.0.1`) : c'est la seule source. Gradle en déduit `versionName` et `versionCode` (`majeur * 10000 + mineur * 100 + correctif`), qui doit croître à chaque envoi.
2. Construire :

   ```bash
   cd frontend
   npm run bundle:android
   ```

   Le fichier à envoyer : `frontend/android/app/build/outputs/bundle/release/app-release.aab` (ignoré par git).
3. L'envoyer dans la Play Console (Tester et publier → une piste de test → Créer une release).

## Où lire les empreintes

- **Clés Google Play et d'importation** : Play Console → CountRep → Tester et publier → Configuration → **Intégrité de l'appli** → onglet **Signature de l'appli**. Pour chaque certificat : MD5, SHA-1 et SHA-256.
- **Clé d'importation**, aussi : `keytool -list -v -keystore ~/keystores/countrep-upload.jks -alias countrep-upload`.
- **Clé de debug** : `cd frontend/android && ./gradlew :app:signingReport` (variante `debug`).

## Où elles sont déclarées

| Service | Empreinte | Clés déclarées | Pourquoi |
|---|---|---|---|
| **Connexion Google** : Google Cloud (projet `countrep`) → Google Auth Platform → Clients → un **client OAuth Android** par empreinte, package `lu.architech.countrep` | SHA-1 | Debug (« CountRep Android debug »), à ajouter : Google Play et importation | Google n'accepte la connexion que depuis une application dont le package et l'empreinte correspondent à un client Android (ADR 0013) |

**Symptôme typique d'une empreinte manquante** : la connexion Google marche avec un build local mais pas avec l'application du Store (erreur `[28444] Developer console is not set up correctly`). C'est presque toujours la clé Google Play qui manque.
