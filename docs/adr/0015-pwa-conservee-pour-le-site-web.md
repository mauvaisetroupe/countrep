# 15. PWA conservée pour le site web

- Statut : Accepté
- Date : 2026-10-22
- Remplace en partie : [ADR 0012](0012-application-android-capacitor.md) (point 3, « Plus de PWA »)

## Contexte

L'ADR 0012 embarque l'application Vue dans Capacitor pour Android et retire la PWA : dans l'application, les fichiers web sont embarqués et elle démarre hors ligne sans service worker.

Le site web reste cependant le seul accès pour les autres appareils, en particulier l'iPhone : une version iOS avec Capacitor demande un compte Apple Developer (99 $/an) et une publication sur l'App Store, ce qui n'est pas prévu. Sans PWA, le site ne s'installe plus sur l'écran d'accueil et ne démarre plus hors ligne, alors que l'application est locale d'abord ([ADR 0014](0014-application-utilisable-sans-compte.md)).

Sur iOS, une PWA :

- s'installe à la main (Safari › Partager › « Sur l'écran d'accueil »), sans invite d'installation ;
- démarre hors ligne (service worker) et garde ses données IndexedDB ; une fois installée, elle échappe à l'effacement des données de Safari après 7 jours sans visite ;
- n'a pas de fonctions natives (rappels locaux fiables, widget, Apple Santé).

Un service worker dans la WebView Capacitor ajouterait en revanche un second cache et un second mécanisme de mise à jour, en concurrence avec les versions publiées sur le Store.

## Décision

1. **Le site web reste une PWA** : manifest, service worker, installation et invite de mise à jour (`registerType: 'prompt'`) sont conservés.
2. **Pas de PWA dans l'application Capacitor** : le build de l'application (mode Vite dédié) n'inclut pas `vite-plugin-pwa` ; aucun service worker n'est enregistré et l'invite de mise à jour n'apparaît pas. L'application se met à jour par le Store uniquement (ADR 0012, point 7).
3. Le reste de l'ADR 0012 est inchangé.

## Conséquences

- iPhone et ordinateur gardent une application installable qui fonctionne hors ligne, sans App Store.
- Deux builds du même code : le site (PWA, API sur la même origine `/api`) et l'application (sans service worker, API sur `https://countrep.architech.lu`).
- Deux rythmes de mise à jour cohabitent : le site se met à jour en quelques minutes, l'application à chaque version du Store. Les changements d'API restent rétrocompatibles.
- La connexion Google dans une PWA installée sur iOS (popup OAuth en mode standalone) est à vérifier.
- Un utilisateur qui reste dans Safari sans installer la PWA peut perdre ses données locales non synchronisées après 7 jours sans visite.
