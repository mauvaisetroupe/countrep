#!/usr/bin/env node
// Régénère le catalogue d'exercices embarqué (ADR 0014) à partir de l'API.
//
// Utilisation (depuis frontend/) :
//   node scripts/update-catalog.mjs [url]
// Par défaut : https://countrep.architech.lu/api/exercises
//
// À relancer après tout ajout ou modification dans la table `exercises`,
// puis livrer une nouvelle version de l'application.

import { writeFileSync } from 'node:fs'

const url = process.argv[2] ?? 'https://countrep.architech.lu/api/exercises'
const output = new URL('../src/data/exercises.json', import.meta.url)

const response = await fetch(url)
if (!response.ok) {
  console.error(`Échec du chargement (${response.status}) : ${url}`)
  process.exit(1)
}

const exercises = (await response.json())
  .map(({ id, nameEn, nameFr, liftmanualUrl, unit }) => ({ id, nameEn, nameFr, liftmanualUrl, unit }))
  .sort((a, b) => a.id.localeCompare(b.id))

writeFileSync(output, `${JSON.stringify(exercises, null, 2)}\n`)
console.log(`${exercises.length} exercices → src/data/exercises.json`)
