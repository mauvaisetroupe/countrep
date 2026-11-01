import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Pool } from 'pg'

// Vérification de la version du schéma au démarrage (ADR 0017). Les
// migrations sont appliquées par l'image de migration (Flyway) avant
// l'API ; l'API vérifie seulement que la base a atteint la version avec
// laquelle elle a été construite.

export const MIGRATIONS_DIRECTORY = fileURLToPath(new URL('../migrations/', import.meta.url))

// V002__nom.sql (migration versionnée) ou B005__nom.sql (migration de base)
const MIGRATION_FILE = /^[VB](\d+)__.+\.sql$/

// La plus haute migration du dépôt : la version attendue par l'API
export async function expectedSchemaVersion(directory = MIGRATIONS_DIRECTORY) {
  const versions = (await readdir(directory))
    .map(name => MIGRATION_FILE.exec(name))
    .filter(match => match !== null)
    .map(match => Number(match[1]))

  if (versions.length === 0) {
    throw new Error(`No migration found in ${directory}`)
  }

  return Math.max(...versions)
}

// Lit l'historique de Flyway (flyway_schema_history). Échoue si la base
// n'a jamais été migrée, si une migration a échoué, ou si la base est
// plus ancienne qu'attendu. Une base plus récente est acceptée (retour à
// l'image précédente après une migration compatible), avec un avertissement.
export async function checkSchemaVersion(db: Pool, expected: number) {
  const history = await db.query<{ exists: boolean }>(
    "SELECT to_regclass('flyway_schema_history') IS NOT NULL AS exists"
  )

  if (!history.rows[0]?.exists) {
    throw new Error(
      'The database has no migration history (flyway_schema_history): ' +
        'run the migration image before the API (see docs/exploitation.md)'
    )
  }

  const result = await db.query<{ version: string, success: boolean }>(
    'SELECT version, success FROM flyway_schema_history WHERE version IS NOT NULL'
  )

  const failed = result.rows.filter(row => !row.success)
  if (failed.length > 0) {
    throw new Error(
      `Migration ${failed.map(row => row.version).join(', ')} failed: ` +
        'fix it with the migration image before starting the API'
    )
  }

  const current = Math.max(0, ...result.rows.map(row => Number(row.version)))

  if (current < expected) {
    throw new Error(
      `The database schema is at version ${current}, this API needs ${expected}: ` +
        'run the migration image of the same version first'
    )
  }

  return {
    current,
    warning: current > expected
      ? `The database schema (version ${current}) is newer than this API (${expected})`
      : undefined
  }
}
