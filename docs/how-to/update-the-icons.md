# Changer les icônes

Toutes les icônes viennent d'un seul dessin, `icons/app-icon-foreground.svg` (ADR 0010), modifiable dans Inkscape
(le calque masqué « Zone de sécurité » montre ce qui reste visible dans une icône ronde).

1. Modifier le SVG dans Inkscape (`brew install --cask inkscape`).
2. Régénérer, depuis la racine du dépôt :

   ```bash
   python3 icons/export-app-icons.py
   ```

   Produit les icônes de la PWA (`frontend/public/icons/`), celles de l'application Android
   (`frontend/android/app/src/main/res/mipmap-*`, couleur de l'écran de démarrage) et `icons/playstore-icon.png`. La
   liste complète est en tête du script.
3. Vérifier dans le navigateur (`npm run dev`) et sur le téléphone ([Lancer l'application sur un téléphone
   Android](run-on-an-android-phone.md)).
4. Livrer : une version web pour le site, une version Android pour l'application ; l'icône de la fiche Play Store se
   change à la main dans la Play Console (Fiche principale › Icône de l'application).
