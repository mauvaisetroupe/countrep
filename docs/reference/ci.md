# Intégration continue

Un seul workflow, `.github/workflows/ci.yml`, sur GitHub Actions.

## Déclencheurs et jobs

| Événement | `secrets` | `build` | `images` | `release` |
|---|---|---|---|---|
| Pull request | ✓ | ✓ | | |
| Push sur `main` | ✓ | ✓ | ✓ tag `sha-<commit>` | |
| Tag `web-vX.Y.Z` | ✓ | ✓ | ✓ tags `X.Y.Z`, `X.Y` (et `sha-…`) | ✓ |

- **`secrets`** : gitleaks sur tout l'historique. Échoue si un secret est commité : le retirer de l'historique ne
  suffit pas, il faut aussi le changer.
- **`build`** : `npm ci` et `npm run build` du backend puis du frontend (types), puis l'image de migration appliquée à
  un PostgreSQL 18 vide.
- **`images`** : les deux images, `linux/amd64` et `linux/arm64`, publiées sur `ghcr.io/mauvaisetroupe/countrep` et
  `ghcr.io/mauvaisetroupe/countrep-migrations`. Jamais de `latest`.
- **`release`** : `.github/release-notes.sh` écrit les notes, puis `gh release create` crée la GitHub Release
  « CountRep web X.Y.Z ».

Un tag `android-vX.Y.Z` ne déclenche rien : il marque seulement le code d'une version Android. L'application Android n'est **pas** construite par la CI : `npm run bundle:android` se lance sur le Mac, qui a la clé
d'importation.

## Notes de version

Écrites depuis git, rien à la main :

1. **À lire avant de déployer** : les commits marqués `!` (`feat!: …`, `fix(api)!: …`) ou avec une ligne
   `BREAKING CHANGE: …`, depuis le tag `web-v*` précédent.
2. **Migrations** : les `V*.sql` ajoutées. Le script **échoue** si une migration de la version précédente a été
   modifiée ou supprimée (Flyway refuserait de migrer).
3. **Changements** : tous les commits, hors fusions, et le lien de comparaison.

Les essayer avant le tag : `git tag web-v9.9.9 && .github/release-notes.sh web-v9.9.9; git tag -d web-v9.9.9`.

## Messages de commit

[Conventional Commits](https://www.conventionalcommits.org), en anglais : `type(scope): description`, types `feat`,
`fix`, `docs`, `chore`, `refactor`… Le `!` est réservé à ce qui demande une action de l'exploitant ou empêche le
retour en arrière.

## Où regarder

- Exécutions : onglet **Actions** du dépôt, ou `gh run list`, `gh run view --log-failed`.
- Images : onglet **Packages** du profil `mauvaisetroupe`.
- Releases : `https://github.com/mauvaisetroupe/countrep/releases`.
