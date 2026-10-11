import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth.js'
import { pool } from '../db.js'

// Set = une saisie : un exercice, un nombre de répétitions, à une date
// et une heure données (voir docs/adr/0006).

const SET_COLUMNS = `
  id,
  user_id,
  exercise,
  date::text AS date,
  time::text AS time,
  reps,
  session_id,
  session_name,
  created_at,
  updated_at,
  deleted_at
`

function toApiSet(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    exercise: row.exercise,
    date: row.date,
    time: row.time,
    reps: row.reps,
    sessionId: row.session_id,
    sessionName: row.session_name,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    deletedAt: row.deleted_at
      ? new Date(row.deleted_at).getTime()
      : null
  }
}

export async function setRoutes(app: FastifyInstance) {

  // Applique la vérification JWT à toutes les routes de ce fichier
  app.addHook('onRequest', verifyJWT)

  // ============================================================
  // CREATE
  // ============================================================

  app.post('/api/sets', async (request, reply) => {
    const userId = request.userId

    const body = request.body as {
      id: string
      exercise: string
      date: string
      time: string
      reps: number
      sessionId?: string | null
      sessionName?: string | null
      createdAt: number
      updatedAt: number
      deletedAt?: number | null
    }

    // Upsert idempotent : le client peut rejouer la création
    // (réponse perdue, synchro concurrente) sans erreur de clé dupliquée.
    // La clause WHERE empêche d'écraser le set d'un autre utilisateur.
    const result = await pool.query(
      `
      INSERT INTO sets (
        id,
        user_id,
        exercise,
        date,
        time,
        reps,
        session_id,
        session_name,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        to_timestamp($9 / 1000.0),
        to_timestamp($10 / 1000.0),
        CASE
          WHEN $11::bigint IS NULL THEN NULL
          ELSE to_timestamp($11::bigint / 1000.0)
        END
      )
      ON CONFLICT (id) DO UPDATE
      SET
        exercise = EXCLUDED.exercise,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        reps = EXCLUDED.reps,
        session_id = EXCLUDED.session_id,
        session_name = EXCLUDED.session_name,
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at
      WHERE sets.user_id = EXCLUDED.user_id
      RETURNING ${SET_COLUMNS}
      `,
      [
        body.id,
        userId,
        body.exercise,
        body.date,
        body.time,
        body.reps,
        body.sessionId ?? null,
        body.sessionName ?? null,
        body.createdAt,
        body.updatedAt,
        body.deletedAt ?? null
      ]
    )

    if (result.rowCount === 0) {
      return reply.code(409).send({
        error: 'Set id already used'
      })
    }

    return reply.code(201).send(toApiSet(result.rows[0]))
  })

  // ============================================================
  // READ
  // ============================================================

  app.get('/api/sets', async (request) => {
    const userId = request.userId

    const result = await pool.query(
      `
      SELECT ${SET_COLUMNS}
      FROM sets
      WHERE user_id = $1
      ORDER BY date ASC, time ASC
      `,
      [userId]
    )

    return result.rows.map(toApiSet)
  })

  // ============================================================
  // UPDATE
  // ============================================================

  app.patch('/api/sets/:id', async (request, reply) => {
    const userId = request.userId
    const { id } = request.params as { id: string }

    const body = request.body as {
      reps?: number
      exercise?: string
      date?: string
      time?: string
      sessionId?: string
      sessionName?: string
      updatedAt: number
    }

    const result = await pool.query(
      `
      UPDATE sets
      SET
        reps = COALESCE($1, reps),
        exercise = COALESCE($2, exercise),
        date = COALESCE($3, date),
        time = COALESCE($4, time),
        session_id = COALESCE($5, session_id),
        session_name = COALESCE($6, session_name),
        updated_at = to_timestamp($7 / 1000.0)
      WHERE id = $8
        AND user_id = $9
      RETURNING ${SET_COLUMNS}
      `,
      [
        body.reps ?? null,
        body.exercise ?? null,
        body.date ?? null,
        body.time ?? null,
        body.sessionId ?? null,
        body.sessionName ?? null,
        body.updatedAt,
        id,
        userId
      ]
    )

    if (result.rowCount === 0) {
      return reply.code(404).send({
        error: 'Set not found'
      })
    }

    return reply.send(toApiSet(result.rows[0]))
  })

  // ============================================================
  // DELETE
  // ============================================================

  app.delete('/api/sets/:id', async (request, reply) => {
    const userId = request.userId
    const { id } = request.params as { id: string }

    const result = await pool.query(
      `
      DELETE FROM sets
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [id, userId]
    )

    if (result.rowCount === 0) {
      return reply.code(404).send({
        error: 'Set not found'
      })
    }

    return reply.code(204).send()
  })
}
