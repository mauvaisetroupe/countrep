import type { FastifyInstance } from 'fastify'
import { pool } from '../db.js'

export async function userRoutes(app: FastifyInstance) {

  //LCO
  // app.post('/api/users', async (request, reply) => {

  //   const body = request.body as {
  //     id: string
  //     name: string
  //   }

  //   const result = await pool.query(
  //     `
  //     INSERT INTO users (id, name)
  //     VALUES ($1, $2)
  //     RETURNING
  //       id,
  //       name,
  //       created_at
  //     `,
  //     [
  //       body.id,
  //       body.name
  //     ]
  //   )

  //   const user = result.rows[0]

  //   return reply.code(201).send({
  //     id: user.id,
  //     name: user.name,
  //     createdAt: user.created_at
  //   })
  // })


  app.get('/api/users', async () => {

    const result = await pool.query(`
      SELECT
        id,
        name,
        created_at
      FROM users
      ORDER BY created_at
    `)

    return result.rows.map(user => ({
      id: user.id,
      name: user.name,
      createdAt: user.created_at
    }))
  })

  app.get('/api/users/by-name/:name', async (request, reply) => {

    const { name } = request.params as { name: string }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        created_at
      FROM users
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1
      `,
      [name]
    )

    if (result.rows.length === 0) {
      return reply.code(404).send({
        message: 'User not found'
      })
    }

    return result.rows[0]
  })
}