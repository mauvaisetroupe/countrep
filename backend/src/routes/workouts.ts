import type { FastifyInstance } from 'fastify'
import { pool } from '../db.js'

export async function workoutRoutes(app: FastifyInstance) {

  app.post('/api/workouts', async (request, reply) => {

    const body = request.body as {
      id: string
      userId: string
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
        body.userId,
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
      WHERE id = $1
      `,
      [body.id]
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


  app.get('/api/workouts', async () => {

    const result = await pool.query(`
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
      ORDER BY date, created_at
    `)

    return result.rows.map(workout => ({
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
    }))
  })
}