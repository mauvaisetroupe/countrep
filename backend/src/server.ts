import Fastify from 'fastify'
import cors from '@fastify/cors'
import { pool } from './db.js'
import { userRoutes } from './routes/users.js'
import { workoutRoutes } from './routes/workouts.js'
import { authRoutes } from './routes/auth.js'

const app = Fastify({
  logger: true
})

await app.register(cors, {
  origin: [
    'http://localhost:5173',
    'http://192.168.1.109:5173'
  ]
})

app.get('/api/health', async () => {
  return {
    status: 'ok'
  }
})

app.get('/api/health/db', async () => {
  const result = await pool.query('SELECT NOW()')

  return {
    status: 'ok',
    database: result.rows[0]
  }
})

app.register(userRoutes)
app.register(workoutRoutes)
app.register(authRoutes)

const start = async () => {
  try {
    await app.listen({
      host: '0.0.0.0',
      port: 3000
    })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

start()