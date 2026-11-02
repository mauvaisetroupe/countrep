# Signature de l'application Android

Une application Android est identifiée par son **nom de package** (`lu.architech.countrep`) et par le **certificat** qui la signe. Plusieurs services vérifient ce certificat au moyen de son **empreinte** (SHA-1 ou SHA-256) : il faut la leur déclarer.

Le pourquoi : [Les clés de signature Android](../explanation/android-signing.md).

Les empreintes ne sont pas des secrets. Les **clés** (keystores, mots de passe) ne doivent jamais être commitées.

## Les trois clés

| Clé | Ce qu'elle signe | Où elle est |
|---|---|---|
| **Signature Google Play** (*app signing key*) | L'application **installée depuis le Play Store** : Google re-signe l'`.aab` envoyé (Play App Signing) | Chez Google, inaccessible |
| **Importation** (*upload key*) | L'`.aab` produit par `npm run bundle:android`, avant son envoi au Play Store | `~/keystores/countrep-upload.jks` sur le Mac, hors du dépôt ; copie de secours dans **KeePass** (le `.jks` en pièce jointe, avec le mot de passe du keystore) ; déclarée à Gradle dans `~/.gradle/gradle.properties` ([Créer la clé d'importation](../how-to/create-the-upload-key.md)) |
| **Debug** | Les builds locaux (`npx cap run android`) | `~/.android/debug.keystore`, créé par le SDK Android, propre à chaque ordinateur |

Empreintes de la clé d'importation (`CN=Lionel Coquin, O=architech.lu, C=LU`, créée le 2026-10-22) :

- SHA-1 : `51:68:17:13:04:3D:3A:EE:40:F5:B7:D5:04:E3:25:25:2D:1D:FC:08`
- SHA-256 : `BA:5B:68:ED:9F:37:0F:D1:8A:7C:6A:CA:33:07:9C:38:6D:FF:9C:72:B4:4B:5E:A7:91:89:7A:5B:2F:14:66:A6`

Empreintes de la clé Google Play (lues dans la Play Console le 2026-11-02) :

- SHA-1 : `C2:06:C3:CE:D1:22:9A:A9:AE:44:F1:C1:2F:A8:2C:DB:DC:CE:1D:11`
- SHA-256 : `AD:7F:24:A5:89:DA:EB:46:4F:AB:FE:D1:9F:CD:EE:F5:C8:6F:3A:50:B6:BC:9A:47:4A:76:4C:1D:A2:65:30:30`

Perdre la clé d'importation n'est pas fatal avec Play App Signing : Google permet de la remplacer ([Créer la clé d'importation, Après une perte](../how-to/create-the-upload-key.md#après-une-perte--la-remplacer)). Perdre celle de Google Play n'est pas possible : Google la garde.

## Où lire les empreintes

- **Clés Google Play et d'importation** : Play Console → CountRep → Protégé par Play (icône bouclier) → **Signature de l'appli**. Les empreintes ne s'affichent pas : les boutons « SHA-1 certificate fingerprint » les copient dans le presse-papiers.
- **Clé d'importation**, aussi : `keytool -list -v -keystore ~/keystores/countrep-upload.jks -alias countrep-upload`.
- **Clé de debug** : `cd frontend/android && ./gradlew :app:signingReport` (variante `debug`).
- **Un `.aab` ou un APK** : `keytool -printcert -jarfile <fichier>`.

## Où elles sont déclarées

| Service | Empreinte | Clés déclarées | Pourquoi |
|---|---|---|---|
| **Connexion Google** : Google Cloud (projet `countrep`) → Google Auth Platform → Clients → un **client OAuth Android** par empreinte, package `lu.architech.countrep` | SHA-1 | Les trois : « CountRep Android debug », « CountRep Android upload key », « CountRep Android Google Play » (vérifiées le 2026-11-02) | Google n'accepte la connexion que depuis une application dont le package et l'empreinte correspondent à un client Android (ADR 0013, [Configurer la connexion Google](../how-to/set-up-google-sign-in.md)) |

**Symptôme typique d'une empreinte manquante** : la connexion Google marche avec un build local mais pas avec l'application du Store (erreur `[28444] Developer console is not set up correctly`). C'est presque toujours la clé Google Play qui manque.
