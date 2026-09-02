import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth.js'
import { pool } from '../db.js'

export async function workoutRoutes(app: FastifyInstance) {

  // Applique la vérification JWT à toutes les routes de ce fichier
  app.addHook('onRequest', verifyJWT)

  // ============================================================
  // CREATE
  // ============================================================

  app.post('/api/workouts', async (request, reply) => {
    const userId = request.userId

    const body = request.body as {
      id: string
      exercise: string
      date: string
      workoutTime: string
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
        workout_time,
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
        $7,
        to_timestamp($8 / 1000.0),
        to_timestamp($9 / 1000.0),
        CASE
          WHEN $10::bigint IS NULL THEN NULL
          ELSE to_timestamp($10::bigint / 1000.0)
        END
      )
      `,
      [
        body.id,
        userId,
        body.exercise,
        body.date,
        body.workoutTime,
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
        workout_time::text AS workout_time,
        reps,
        mode,
        created_at,
        updated_at,
        deleted_at
      FROM workouts
      WHERE id = $1
        AND user_id = $2
      `,
      [body.id, userId]
    )

    const workout = result.rows[0]

    return reply.code(201).send({
      id: workout.id,
      userId: workout.user_id,
      exercise: workout.exercise,
      date: workout.date,
      workoutTime: workout.workout_time,
      reps: workout.reps,
      mode: workout.mode,
      createdAt: new Date(workout.created_at).getTime(),
      updatedAt: new Date(workout.updated_at).getTime(),
      deletedAt: workout.deleted_at
        ? new Date(workout.deleted_at).getTime()
        : null
    })
  })

  // ============================================================
  // READ
  // ============================================================

  app.get('/api/workouts', async (request) => {
    const userId = request.userId

    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        exercise,
        date::text AS date,
        workout_time::text AS workout_time,
        reps,
        mode,
        created_at,
        updated_at,
        deleted_at
      FROM workouts
      WHERE user_id = $1
      ORDER BY date ASC, workout_time ASC
      `,
      [userId]
    )

    return result.rows.map(workout => ({
      id: workout.id,
      userId: workout.user_id,
      exercise: workout.exercise,
      date: workout.date,
      workoutTime: workout.workout_time,
      reps: workout.reps,
      mode: workout.mode,
      createdAt: new Date(workout.created_at).getTime(),
      updatedAt: new Date(workout.updated_at).getTime(),
      deletedAt: workout.deleted_at
        ? new Date(workout.deleted_at).getTime()
        : null
    }))
  })

  // ============================================================
  // UPDATE
  // ============================================================

  app.patch('/api/workouts/:id', async (request, reply) => {
    const userId = request.userId
    const { id } = request.params as { id: string }

    const body = request.body as {
      reps?: number
      exercise?: string
      date?: string
      workoutTime?: string
      mode?: string
      updatedAt: number
    }

    const result = await pool.query(
      `
      UPDATE workouts
      SET
        reps = COALESCE($1, reps),
        exercise = COALESCE($2, exercise),
        date = COALESCE($3, date),
        workout_time = COALESCE($4, workout_time),
        mode = COALESCE($5, mode),
        updated_at = to_timestamp($6 / 1000.0)
      WHERE id = $7
        AND user_id = $8
      RETURNING
        id,
        user_id,
        exercise,
        date::text AS date,
        workout_time::text AS workout_time,
        reps,
        mode,
        created_at,
        updated_at,
        deleted_at
      `,
      [
        body.reps ?? null,
        body.exercise ?? null,
        body.date ?? null,
        body.workoutTime ?? null,
        body.mode ?? null,
        body.updatedAt,
        id,
        userId
      ]
    )

    if (result.rowCount === 0) {
      return reply.code(404).send({
        error: 'Workout not found'
      })
    }

    const workout = result.rows[0]

    return reply.send({
      id: workout.id,
      userId: workout.user_id,
      exercise: workout.exercise,
      date: workout.date,
      workoutTime: workout.workout_time,
      reps: workout.reps,
      mode: workout.mode,
      createdAt: new Date(workout.created_at).getTime(),
      updatedAt: new Date(workout.updated_at).getTime(),
      deletedAt: workout.deleted_at
        ? new Date(workout.deleted_at).getTime()
        : null
    })
  })

  // ============================================================
  // DELETE
  // ============================================================

  app.delete('/api/workouts/:id', async (request, reply) => {
    const userId = request.userId
    const { id } = request.params as { id: string }

    const result = await pool.query(
      `
      DELETE FROM workouts
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [id, userId]
    )

    if (result.rowCount === 0) {
      return reply.code(404).send({
        error: 'Workout not found'
      })
    }

    return reply.code(204).send()
  })
}
