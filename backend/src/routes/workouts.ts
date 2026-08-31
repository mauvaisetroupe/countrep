import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth.js'
import { pool } from '../db.js'

export async function workoutRoutes(app: FastifyInstance) {
  
  // Applique la vérification JWT à toutes les routes de ce fichier
  app.addHook('onRequest', verifyJWT)

  app.post('/api/workouts', async (request, reply) => {
    const userId = request.userId // Récupéré de manière sécurisée depuis le token
    
    const body = request.body as {
      id: string
      exercise: string
      date: string
      reps: number
      mode: string
      createdAt: number
      updatedAt: number
      deletedAt?: number | null
    }

    await pool.query(
      `
      INSERT INTO workouts (
        id,
        user_id,
        exercise,
        date,
        reps,
        mode,
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
        to_timestamp($7 / 1000.0),
        to_timestamp($8 / 1000.0),
        CASE
          WHEN $9::bigint IS NULL THEN NULL
          ELSE to_timestamp($9::bigint / 1000.0)
        END
      )
      `,
      [
        body.id,
        userId, // Utilisation du userId sécurisé
        body.exercise,
        body.date,
        body.reps,
        body.mode,
        body.createdAt,
        body.updatedAt,
        body.deletedAt ?? null
      ]
    )

    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        exercise,
        date::text AS date,
        reps,
        mode,
        created_at,
        updated_at,
        deleted_at
      FROM workouts
      WHERE id = $1 AND user_id = $2
      `,
      [body.id, userId]
    )

    const workout = result.rows[0]

    return reply.code(201).send({
      id: workout.id,
      userId: workout.user_id,
      exercise: workout.exercise,
      date: workout.date,
      reps: workout.reps,
      mode: workout.mode,
      createdAt: new Date(workout.created_at).getTime(),
      updatedAt: new Date(workout.updated_at).getTime(),
      deletedAt: workout.deleted_at
        ? new Date(workout.deleted_at).getTime()
        : null
    })
  })

  app.get('/api/workouts', async (request) => {
    const userId = request.userId // Plus besoin de le chercher dans les query params

    const result = await pool.query(
      `
      SELECT
        id,
        user_id AS "userId",
        exercise,
        date,
        reps,
        mode,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        deleted_at AS "deletedAt"
      FROM workouts
      WHERE user_id = $1
      ORDER BY date ASC, created_at ASC
      `,
      [userId]
    )

    return result.rows
  })
}