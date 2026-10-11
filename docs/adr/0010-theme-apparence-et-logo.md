# 10. Thème, apparence claire ou sombre, et logo

- Statut : Accepté
- Date : 2026-10-11

## Contexte

L'interface de CountRep avait son propre style : fond crème, accents ambre, emojis dans la barre de navigation, couleurs écrites en dur dans chaque composant. Elle n'avait pas de mode sombre. Son icône (un biceps avec « Grease The Groove ») était illisible en petit et ne respectait pas la zone de sécurité des icônes adaptatives Android.

L'auteur publie déjà une application Android, Step Challenge, et veut que CountRep lui ressemble en tout point (couleurs, police, composants, apparence), en préparation d'une éventuelle publication sur Google Play.

## Décision

- **Mêmes couleurs que Step Challenge** (`apps/mobile/src/theme/colors.ts`) : un jeu de jetons par rôle (fond, surface, carte, texte, primaire, danger…), en version claire et sombre, avec les mêmes valeurs. Couleur primaire : le bleu `#1389FC` de Step Challenge.
- Les jetons sont des variables CSS (`frontend/src/style.css`), exposées à Tailwind par `@theme inline` : `bg-surface`, `text-fg-secondary`, `bg-primary`… **Aucune couleur n'est écrite en dur dans un composant.**
- **Police système** (Roboto sur Android), comme l'application native. Style plat : cartes grises sans bordure, arrondis de 12 px, barre de navigation Material 3 avec icônes Material et pastille sur l'onglet actif.
- **Apparence** : Réglages › Apparence propose **Système** (par défaut), **Clair** et **Sombre**. Préférence propre à l'appareil (`localStorage` `countrep.appearance`), appliquée par la classe `.dark` sur `<html>` (`src/appearance.ts`), et dès le chargement par un script de `index.html` pour éviter un flash. En mode Système, l'application suit le passage du téléphone en mode sombre. La barre d'état suit la couleur du fond (`meta theme-color`).
- **Logo** : quatre bâtons de comptage barrés, en trait blanc sur le bleu, sans texte. Comme pour Step Challenge, un **SVG maître** modifiable dans Inkscape (`icons/app-icon-foreground.svg`, avec un calque masqué « Zone de sécurité ») et un **script d'export** (`icons/export-app-icons.py`) produisent toutes les images : icônes `any`, `maskable` et `monochrome` du manifest, icône iOS, favicon, et icône de la fiche Google Play (`icons/playstore-icon.png`).
- **Écran de démarrage** : celui qu'Android construit pour une PWA, à partir du manifest : fond bleu (`background_color`) et icône.

## Conséquences

- CountRep et Step Challenge forment une famille visuelle ; c'est le dessin de l'icône qui les distingue.
- Changer la couleur primaire revient à modifier le jeton `--primary` (et sa version sombre), `BACKGROUND` dans le script d'export, puis les couleurs du manifest.
- Tout nouveau composant utilise les jetons ; une couleur en dur est un défaut (elle casse le mode sombre).
- Le passage sur Google Play (TWA, Capacitor ou Expo) reste à décider dans un ADR à part.
