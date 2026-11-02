# Créer la clé d'importation

La clé d'importation (*upload key*) signe l'`.aab` envoyé à Google Play ; Google le re-signe ensuite avec sa propre
clé ([Signature Android](../reference/android-signing.md)). Elle existe déjà (créée le 2026-10-22) : ce guide sert sur
un nouveau Mac, ou après sa perte.

## Sur un nouveau Mac : la récupérer

Le fichier `countrep-upload.jks` (en pièce jointe) et son mot de passe sont dans **KeePass**. Enregistrer la pièce
jointe sous `~/keystores/countrep-upload.jks`, la protéger (`chmod 600 ~/keystores/countrep-upload.jks`), vérifier que
c'est la bonne clé (alias `countrep-upload`, SHA-1 `51:68:17:13:…:FC:08`, voir [Signature
Android](../reference/android-signing.md)) :

```bash
keytool -list -v -keystore ~/keystores/countrep-upload.jks
```

puis écrire `~/.gradle/gradle.properties` (section suivante, étape 2).

## La créer

1. Générer le keystore :

   ```bash
   mkdir -p ~/keystores
   keytool -genkeypair -v \
     -keystore ~/keystores/countrep-upload.jks \
     -alias countrep-upload \
     -keyalg RSA -keysize 4096 -validity 10000 \
     -dname "CN=Lionel Coquin, O=architech.lu, C=LU"
   ```

   `keytool` demande le mot de passe du keystore (et celui de la clé : le même convient). Ranger le fichier `.jks` (en pièce
   jointe) et le mot de passe dans KeePass, puis `chmod 600 ~/keystores/countrep-upload.jks`.

2. Le déclarer à Gradle, dans `~/.gradle/gradle.properties` (hors du dépôt) :

   ```properties
   COUNTREP_UPLOAD_STORE_FILE=/Users/<utilisateur>/keystores/countrep-upload.jks
   COUNTREP_UPLOAD_STORE_PASSWORD=…
   COUNTREP_UPLOAD_KEY_ALIAS=countrep-upload
   COUNTREP_UPLOAD_KEY_PASSWORD=…
   ```

   `frontend/android/app/build.gradle` les lit pour signer le build release.

3. Vérifier : `cd frontend && npm run bundle:android` ne doit pas afficher « build release non signé ».

## Après une perte : la remplacer

Avec Play App Signing, perdre la clé d'importation n'est pas fatal :

1. Créer une nouvelle clé (ci-dessus).
2. Exporter son certificat : `keytool -export -rfc -keystore ~/keystores/countrep-upload.jks -alias countrep-upload -file upload_certificate.pem`.
3. Play Console › CountRep › Tester et publier › Configuration › Intégrité de l'appli › Signature de l'appli ›
   **Demander la réinitialisation de la clé d'importation**, avec le `.pem`. Google l'accepte après quelques jours.
4. Mettre à jour les empreintes dans [Signature Android](../reference/android-signing.md) et le client OAuth Android
   de la clé d'importation ([Configurer la connexion Google](set-up-google-sign-in.md)).
