# Lancer l'application sur un téléphone Android

Le développement se fait surtout dans le navigateur (`npm run dev`). Le téléphone sert à vérifier ce qui est propre à
Android : connexion Google native, écran de démarrage, icônes, retour arrière, clavier.

## Installer Android Studio (une fois)

1. `brew install --cask android-studio`, puis le lancer : l'assistant installe le SDK.
2. Settings › Languages & Frameworks › Android SDK : **Android 16 (API 36)** dans SDK Platforms (`compileSdkVersion`
   de `frontend/android/variables.gradle`).
3. Utiliser le Java d'Android Studio pour Gradle, dans `~/.zshrc` :

   ```bash
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$PATH:$ANDROID_HOME/platform-tools"
   ```

4. Sur le téléphone : Paramètres › À propos › appuyer 7 fois sur « Numéro de build », puis Options pour les
   développeurs › **Débogage USB**. Brancher, accepter la clé du Mac, puis vérifier : `adb devices`.

## Lancer le build de debug

```bash
cd frontend
npm run build:android          # build web avec .env.android, puis cap sync
npx cap run android            # choisir le téléphone ou un émulateur
```

Ou `npx cap open android` et ▶ dans Android Studio. Ce build est signé avec la clé de **debug** du Mac : la connexion
Google y marche si cette clé a son client Android ([Configurer la connexion Google](set-up-google-sign-in.md)).

L'application appelle toujours l'**API de production** (`.env.android`) : elle tourne depuis `https://localhost`, et
la WebView refuse d'appeler une API en `http://` (contenu mixte). Pour essayer l'API locale depuis le téléphone,
passer par le navigateur du téléphone sur `http://<adresse du Mac>:5173` (`npm run dev`).

## Déboguer

Chrome sur le Mac › `chrome://inspect` › la WebView de CountRep › **inspect** : console, réseau, IndexedDB, comme
dans le navigateur. Journaux natifs : Logcat dans Android Studio, ou `adb logcat | grep -i capacitor`.

## Essayer le build release

Le build release est celui qui part sur le Store (signé avec la clé d'importation) :

```bash
cd frontend/android
./gradlew installRelease       # installe sur le téléphone branché
```

Android refuse d'installer par-dessus une application signée par une autre clé (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) :
celle du Store est signée par la clé Google Play, le build de debug par la clé du Mac. Désinstaller d'abord
(`adb uninstall lu.architech.countrep`) : les données locales non synchronisées sont perdues.
