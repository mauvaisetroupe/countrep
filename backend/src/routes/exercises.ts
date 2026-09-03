import type { FastifyInstance } from 'fastify'
import { verifyJWT } from '../middleware/auth.js'
import { pool } from '../db.js'

const MAX_EXERCISES = 6

export async function exerciseRoutes(app: FastifyInstance) {

  // ============================================================
  // CATALOG
  // ============================================================

  app.get('/api/exercises', async () => {

    const result = await pool.query(`
      SELECT
        id,
        name_en,
        name_fr,
        liftmanual_url
      FROM exercises
      ORDER BY name_fr ASC
    `)

    return result.rows.map(exercise => ({
      id: exercise.id,
      nameEn: exercise.name_en,
      nameFr: exercise.name_fr,
      liftmanualUrl: exercise.liftmanual_url
    }))
  })

  // ============================================================
  // USER EXERCISES
  // ============================================================

  // Toutes les routes ci-dessous nécessitent un JWT
  app.register(async protectedApp => {

    protectedApp.addHook('onRequest', verifyJWT)

    // ----------------------------------------------------------
    // READ
    // ----------------------------------------------------------

    protectedApp.get('/api/user/exercises', async (request) => {

      const userId = request.userId

      const result = await pool.query(
        `
        SELECT
          e.id,
          e.name_en,
          e.name_fr,
          e.liftmanual_url,
          ue.position
        FROM user_exercises ue
        INNER JOIN exercises e
          ON e.id = ue.exercise_id
        WHERE ue.user_id = $1
        ORDER BY ue.position ASC
        `,
        [userId]
      )

      return result.rows.map(exercise => ({
        id: exercise.id,
        nameEn: exercise.name_en,
        nameFr: exercise.name_fr,
        liftmanualUrl: exercise.liftmanual_url,
        position: exercise.position
      }))
    })

    // ----------------------------------------------------------
    // REPLACE
    // ----------------------------------------------------------

    protectedApp.put('/api/user/exercises', async (request, reply) => {

      const userId = request.userId

      const body = request.body as {
        exerciseIds?: string[]
      }

      if (!Array.isArray(body.exerciseIds)) {
        return reply.code(400).send({
          error: 'exerciseIds must be an array'
        })
      }

      const exerciseIds = body.exerciseIds

      // Maximum autorisé
      if (exerciseIds.length > MAX_EXERCISES) {
        return reply.code(400).send({
          error: `A maximum of ${MAX_EXERCISES} exercises can be selected`
        })
      }

      // Pas de doublons
      if (new Set(exerciseIds).size !== exerciseIds.length) {
        return reply.code(400).send({
          error: 'An exercise cannot be selected more than once'
        })
      }

      // Vérifie que tous les exercices existent
      if (exerciseIds.length > 0) {

        const result = await pool.query(
          `
          SELECT id
          FROM exercises
          WHERE id = ANY($1::text[])
          `,
          [exerciseIds]
        )

        const existingIds = new Set(
          result.rows.map(row => row.id)
        )

        const unknownIds = exerciseIds.filter(
          id => !existingIds.has(id)
        )

        if (unknownIds.length > 0) {
          return reply.code(400).send({
            error: 'Unknown exercise(s)',
            exerciseIds: unknownIds
          })
        }
      }

      const client = await pool.connect()

      try {

        await client.query('BEGIN')

        // On remplace entièrement la sélection actuelle
        await client.query(
          `
          DELETE FROM user_exercises
          WHERE user_id = $1
          `,
          [userId]
        )

        // Réinsère dans l'ordre envoyé par le frontend
        for (let position = 0; position < exerciseIds.length; position++) {

          await client.query(
            `
            INSERT INTO user_exercises (
              user_id,
              exercise_id,
              position
            )
            VALUES ($1, $2, $3)
            `,
            [
              userId,
              exerciseIds[position],
              position
            ]
          )
        }

        await client.query('COMMIT')

      } catch (error) {

        await client.query('ROLLBACK')
        throw error

      } finally {

        client.release()
      }

      // Retourne la sélection résultante
      const result = await pool.query(
        `
        SELECT
          e.id,
          e.name_en,
          e.name_fr,
          e.liftmanual_url,
          ue.position
        FROM user_exercises ue
        INNER JOIN exercises e
          ON e.id = ue.exercise_id
        WHERE ue.user_id = $1
        ORDER BY ue.position ASC
        `,
        [userId]
      )

      return reply.send(
        result.rows.map(exercise => ({
          id: exercise.id,
          nameEn: exercise.name_en,
          nameFr: exercise.name_fr,
          liftmanualUrl: exercise.liftmanual_url,
          position: exercise.position
        }))
      )
    })
  })
}