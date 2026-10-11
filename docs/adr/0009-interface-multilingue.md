# 9. Interface multilingue : français et anglais

- Statut : Accepté
- Date : 2026-10-11

## Contexte

L'interface était écrite en français, en dur dans les composants. Un nouvel utilisateur (Hippo) et la perspective d'autres utilisateurs demandent une interface en anglais. Le catalogue d'exercices a déjà les deux langues (`name_fr`, `name_en`).

## Décision

- Les textes de l'interface passent par `vue-i18n` (API Composition, `legacy: false`). Les messages sont dans `frontend/src/i18n/fr.ts` et `en.ts`, regroupés par écran. `en.ts` est typé sur `fr.ts` : une clé manquante est une erreur de compilation.
- Le pluriel utilise la syntaxe de `vue-i18n` (`'{n} saisie | {n} saisies'`, appelée avec `t(clé, n)`).
- Langues : français et anglais. Réglages › Langue propose **Système** (par défaut), **Français** et **English**. En mode Système, l'interface est en français si le téléphone ou le navigateur l'est (`navigator.languages`), en anglais pour toute autre langue, et elle suit un changement de langue du système (`languagechange`).
- La préférence est propre à l'appareil (`localStorage` `countrep.locale`, absente pour Système), comme les autres préférences d'affichage. Elle n'est pas stockée sur le serveur.
- Les noms d'exercices viennent de l'API dans les deux langues ; `i18n/index.ts#exerciseName` choisit selon la langue courante. La séance en cours copie aussi `nameEn` (une séance démarrée avant garde son nom français).
- Les dates sont formatées avec la langue courante (`dateLocale()`).
- Hors composant (services, confirmations), les textes passent par `i18n.global.t`.
- Non traduits : les messages d'erreur renvoyés par le backend, les identifiants d'exercices affichés dans le journal et les stats, les noms de séances saisis par l'utilisateur.

## Conséquences

- Tout nouveau texte d'interface doit être ajouté dans `fr.ts` et `en.ts`, et jamais écrit en dur dans un composant.
- Ajouter une langue revient à ajouter un fichier de messages, une option dans Réglages › Langue, et des noms d'exercices dans cette langue (nouvelle colonne).
- Le vocabulaire anglais suit l'ADR 0006 : *set* (entry dans l'interface), *workout*, *round*.
