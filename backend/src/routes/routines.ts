import type { FastifyInstance } from 'fastify'
import type { PoolClient } from 'pg'
import { verifyJWT } from '../middleware/auth.js'
import { pool } from '../db.js'

// Séance = modèle de workout : une liste d'exercices avec leur nombre
// de répétitions, enchaînée `rounds` fois.

interface RoutineBody {
  name: string
  rounds: number
  exercises: { exerciseId: string, reps: number }[]
}

const routineBodySchema = {
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

async function loadRoutines(userId: string, routineId?: string) {
  const routines = await pool.query(
    `
    SELECT id, name, rounds, created_at, updated_at
    FROM routines
    WHERE user_id = $1
      AND ($2::uuid IS NULL OR id = $2::uuid)
    ORDER BY name ASC
    `,
    [userId, routineId ?? null]
  )

  if (routines.rows.length === 0) {
    return []
  }

  const exercises = await pool.query(
    `
    SELECT
      re.routine_id,
      re.position,
      re.reps,
      e.id,
      e.name_en,
      e.name_fr
    FROM routine_exercises re
    INNER JOIN exercises e
      ON e.id = re.exercise_id
    WHERE re.routine_id = ANY($1::uuid[])
    ORDER BY re.routine_id, re.position ASC
    `,
    [routines.rows.map(routine => routine.id)]
  )

  return routines.rows.map(routine => ({
    id: routine.id,
    name: routine.name,
    rounds: routine.rounds,
    createdAt: new Date(routine.created_at).getTime(),
    updatedAt: new Date(routine.updated_at).getTime(),
    exercises: exercises.rows
      .filter(exercise => exercise.routine_id === routine.id)
      .map(exercise => ({
        exerciseId: exercise.id,
        nameEn: exercise.name_en,
        nameFr: exercise.name_fr,
        reps: exercise.reps
      }))
  }))
}

async function insertExercises(
  client: PoolClient,
  routineId: string,
  exercises: RoutineBody['exercises']
) {
  for (let position = 0; position < exercises.length; position++) {
    const exercise = exercises[position]!

    await client.query(
      `
      INSERT INTO routine_exercises (routine_id, position, exercise_id, reps)
      VALUES ($1, $2, $3, $4)
      `,
      [routineId, position, exercise.exerciseId, exercise.reps]
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

export async function routineRoutes(app: FastifyInstance) {

  app.addHook('onRequest', verifyJWT)

  // ============================================================
  // READ
  // ============================================================

  app.get('/api/routines', async (request) => {
    return loadRoutines(request.userId!)
  })

  // ============================================================
  // CREATE
  // ============================================================

  app.post(
    '/api/routines',
    { schema: { body: routineBodySchema } },
    async (request, reply) => {
      const userId = request.userId!
      const body = request.body as RoutineBody

      const routineId = await inTransaction(async client => {
        const result = await client.query(
          `
          INSERT INTO routines (user_id, name, rounds)
          VALUES ($1, $2, $3)
          RETURNING id
          `,
          [userId, body.name.trim(), body.rounds]
        )

        const id: string = result.rows[0].id
        await insertExercises(client, id, body.exercises)
        return id
      })

      if (routineId === null) {
        return reply.code(400).send({ error: 'Unknown exercise(s)' })
      }

      const [routine] = await loadRoutines(userId, routineId)
      return reply.code(201).send(routine)
    }
  )

  // ============================================================
  // REPLACE
  // ============================================================

  app.put(
    '/api/routines/:id',
    { schema: { params: idParamsSchema, body: routineBodySchema } },
    async (request, reply) => {
      const userId = request.userId!
      const { id } = request.params as { id: string }
      const body = request.body as RoutineBody

      const found = await inTransaction(async client => {
        const result = await client.query(
          `
          UPDATE routines
          SET name = $1, rounds = $2, updated_at = now()
          WHERE id = $3
            AND user_id = $4
          `,
          [body.name.trim(), body.rounds, id, userId]
        )

        if (result.rowCount === 0) {
          return false
        }

        await client.query(
          'DELETE FROM routine_exercises WHERE routine_id = $1',
          [id]
        )
        await insertExercises(client, id, body.exercises)
        return true
      })

      if (found === null) {
        return reply.code(400).send({ error: 'Unknown exercise(s)' })
      }

      if (!found) {
        return reply.code(404).send({ error: 'Routine not found' })
      }

      const [routine] = await loadRoutines(userId, id)
      return reply.send(routine)
    }
  )

  // ============================================================
  // DELETE
  // ============================================================

  app.delete(
    '/api/routines/:id',
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      // routine_exercises suit par ON DELETE CASCADE
      const result = await pool.query(
        'DELETE FROM routines WHERE id = $1 AND user_id = $2',
        [id, request.userId]
      )

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: 'Routine not found' })
      }

      return reply.code(204).send()
    }
  )
}
