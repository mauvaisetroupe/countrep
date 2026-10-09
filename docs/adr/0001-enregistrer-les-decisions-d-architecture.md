# 1. Enregistrer les décisions d'architecture

- Statut : Accepté
- Date : 2026-10-09

## Contexte

Les choix structurants de CountRep (synchronisation offline-first, authentification, gestion des données locales) sont aujourd'hui implicites dans le code ou dans les messages de commit. On perd le « pourquoi », et on risque de revenir sur une décision sans en connaître les raisons.

## Décision

Chaque décision d'architecture importante est consignée dans un ADR (Architecture Decision Record) au format léger de Michael Nygard, dans `docs/adr/` :

- un fichier par décision : `NNNN-titre-en-kebab-case.md`, numérotation continue ;
- sections : Contexte, Décision, Conséquences ;
- statut : Proposé, Accepté, Déprécié ou Remplacé par ADR-NNNN ;
- un ADR accepté n'est pas réécrit : on en crée un nouveau qui le remplace ;
- l'index est tenu à jour dans `docs/adr/README.md`.

Est « importante » une décision qui modifie un contrat entre composants (API, schéma, format de données locales), la sécurité, ou qui serait coûteuse à défaire.

## Conséquences

- Le raisonnement derrière les choix est retrouvable, y compris par un agent de code (référencé dans `CLAUDE.md`).
- Léger coût d'écriture à chaque décision structurante.
