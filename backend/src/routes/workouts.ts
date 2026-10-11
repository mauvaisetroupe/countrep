import type { FastifyInstance } from 'fastify'
import type { PoolClient } from 'pg'
import { verifyJWT } from '../middleware/auth.js'
import { pool } from '../db.js'

// Workout = modèle de séance : une liste d'exercices avec leur nombre
// de répétitions, enchaînée `rounds` fois (voir docs/adr/0006).

interface WorkoutBody {
  name: string
  rounds: number
  exercises: { exerciseId: string, reps: number }[]
}

const workoutBodySchema = {
  type: 'object',
  required: ['name', 'rounds', 'exercises'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100, pattern: '\\S' },
    rounds: { type: 'integer', minimum: 1, maximum: 50 },
    exercises: {
      type: 'array',
      minItems: 1,
      maxItems: 30,
      items: {
        type: 'object',
        required: ['exerciseId', 'reps'],
        additionalProperties: false,
        properties: {
          exerciseId: { type: 'string', minLength: 1 },
          reps: { type: 'integer', minimum: 1, maximum: 1000 }
        }
      }
    }
  }
}

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' }
  }
}

// Violation de clé étrangère PostgreSQL (exercice inconnu)
const FOREIGN_KEY_VIOLATION = '23503'

async function loadWorkouts(userId: string, workoutId?: string) {
  const workouts = await pool.query(
    `
    SELECT id, name, rounds, created_at, updated_at
    FROM workouts
    WHERE user_id = $1
      AND ($2::uuid IS NULL OR id = $2::uuid)
    ORDER BY name ASC
    `,
    [userId, workoutId ?? null]
  )

  if (workouts.rows.length === 0) {
    return []
  }

  const exercises = await pool.query(
    `
    SELECT
      we.workout_id,
      we.position,
      we.reps,
      e.id,
      e.name_en,
      e.name_fr,
      e.unit
    FROM workout_exercises we
    INNER JOIN exercises e
      ON e.id = we.exercise_id
    WHERE we.workout_id = ANY($1::uuid[])
    ORDER BY we.workout_id, we.position ASC
    `,
    [workouts.rows.map(workout => workout.id)]
  )

  return workouts.rows.map(workout => ({
    id: workout.id,
    name: workout.name,
    rounds: workout.rounds,
    createdAt: new Date(workout.created_at).getTime(),
    updatedAt: new Date(workout.updated_at).getTime(),
    exercises: exercises.rows
      .filter(exercise => exercise.workout_id === workout.id)
      .map(exercise => ({
        exerciseId: exercise.id,
        nameEn: exercise.name_en,
        nameFr: exercise.name_fr,
        unit: exercise.unit,
        reps: exercise.reps
      }))
  }))
}

async function insertExercises(
  client: PoolClient,
  workoutId: string,
  exercises: WorkoutBody['exercises']
) {
  for (let position = 0; position < exercises.length; position++) {
    const exercise = exercises[position]!

    await client.query(
      `
      INSERT INTO workout_exercises (workout_id, position, exercise_id, reps)
      VALUES ($1, $2, $3, $4)
      `,
      [workoutId, position, exercise.exerciseId, exercise.reps]
    )
  }
}

// Exécute `work` dans une transaction ; un exercice inconnu donne `null`
async function inTransaction<T>(
  work: (client: PoolClient) => Promise<T>
): Promise<T | null> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error: any) {
    await client.query('ROLLBACK')

    if (error?.code === FOREIGN_KEY_VIOLATION) {
      return null
    }

    throw error
  } finally {
    client.release()
  }
}

export async function workoutRoutes(app: FastifyInstance) {

  app.addHook('onRequest', verifyJWT)

  // ============================================================
  // READ
  // ============================================================

  app.get('/api/workouts', async (request) => {
    return loadWorkouts(request.userId!)
  })

  // ============================================================
  // CREATE
  // ============================================================

  app.post(
    '/api/workouts',
    { schema: { body: workoutBodySchema } },
    async (request, reply) => {
      const userId = request.userId!
      const body = request.body as WorkoutBody

      const workoutId = await inTransaction(async client => {
        const result = await client.query(
          `
          INSERT INTO workouts (user_id, name, rounds)
          VALUES ($1, $2, $3)
          RETURNING id
          `,
          [userId, body.name.trim(), body.rounds]
        )

        const id: string = result.rows[0].id
        await insertExercises(client, id, body.exercises)
        return id
      })

      if (workoutId === null) {
        return reply.code(400).send({ error: 'Unknown exercise(s)' })
      }

      const [workout] = await loadWorkouts(userId, workoutId)
      return reply.code(201).send(workout)
    }
  )

  // ============================================================
  // CREATE OR REPLACE
  // ============================================================

  // Upsert idempotent sur l'id choisi par le client (ADR 0014) : le
  // modèle créé ou modifié hors ligne est envoyé tel quel, et l'envoi
  // peut être rejoué. La clause WHERE empêche d'écraser le modèle d'un
  // autre utilisateur (409).
  app.put(
    '/api/workouts/:id',
    { schema: { params: idParamsSchema, body: workoutBodySchema } },
    async (request, reply) => {
      const userId = request.userId!
      const { id } = request.params as { id: string }
      const body = request.body as WorkoutBody

      const owned = await inTransaction(async client => {
        const result = await client.query(
          `
          INSERT INTO workouts (id, user_id, name, rounds)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE
          SET name = EXCLUDED.name, rounds = EXCLUDED.rounds, updated_at = now()
          WHERE workouts.user_id = EXCLUDED.user_id
          `,
          [id, userId, body.name.trim(), body.rounds]
        )

        if (result.rowCount === 0) {
          return false
        }

        await client.query(
          'DELETE FROM workout_exercises WHERE workout_id = $1',
          [id]
        )
        await insertExercises(client, id, body.exercises)
        return true
      })

      if (owned === null) {
        return reply.code(400).send({ error: 'Unknown exercise(s)' })
      }

      if (!owned) {
        return reply.code(409).send({ error: 'Workout id already used' })
      }

      const [workout] = await loadWorkouts(userId, id)
      return reply.send(workout)
    }
  )

  // ============================================================
  // DELETE
  // ============================================================

  app.delete(
    '/api/workouts/:id',
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      // workout_exercises suit par ON DELETE CASCADE
      const result = await pool.query(
        'DELETE FROM workouts WHERE id = $1 AND user_id = $2',
        [id, request.userId]
      )

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: 'Workout not found' })
      }

      return reply.code(204).send()
    }
  )
}
