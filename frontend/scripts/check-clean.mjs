#!/usr/bin/env node
// Refuse de construire une version Android depuis une copie de travail
// modifiée : le commit affiché dans l'application (__GIT_HASH__) et le tag
// android-vX.Y.Z doivent correspondre exactement au code envoyé sur Google
// Play (docs/how-to/publish-the-android-app.md).
//
// Utilisation (depuis frontend/, lancé par npm run bundle:android) :
//   node scripts/check-clean.mjs

import { execSync } from 'node:child_process'

// Fichiers modifiés ou non suivis de frontend/ (les builds sont ignorés par git)
const changes = execSync('git status --porcelain -- .').toString().trim()

if (changes) {
  console.error('Modifications non commitées dans frontend/ : commiter avant de construire une version.')
  console.error(changes)
  process.exit(1)
}
