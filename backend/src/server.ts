// En premier : une configuration invalide arrête le processus (config.ts)
import { config } from './config.js'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { pool } from './db.js'
import { checkSchemaVersion, expectedSchemaVersion } from './schemaVersion.js'
import { setRoutes } from './routes/sets.js'
import { authRoutes } from './routes/auth.js'
import { exerciseRoutes } from './routes/exercises.js'
import { workoutRoutes } from './routes/workouts.js'

// Le frontend construit, servi par l'API dans l'image (ADR 0017). Absent
// en développement : Vite le sert.
const FRONTEND_DIRECTORY = fileURLToPath(new URL('../public/', import.meta.url))

const app = Fastify({
  logger: true
})

app.addHook('onClose', async () => {
  await pool.end()
})

// Arrêt propre quand le conteneur s'arrête : les requêtes en cours se
// terminent, puis les connexions à la base se ferment (onClose)
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, async () => {
    app.log.info(`${signal} received, shutting down`)
    try {
      await app.close()
      process.exit(0)
    } catch (error) {
      app.log.error(error)
      process.exit(1)
    }
  })
}

await app.register(cors, {
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
})

app.get('/api/health', async () => {
  return {
    status: 'ok'
  }
})

// Adresse de santé de l'exploitant : 200 si l'API et la base répondent
app.get('/api/health/db', async (request, reply) => {
  try {
    const result = await pool.query('SELECT NOW()')
    return {
      status: 'ok',
      database: result.rows[0]
    }
  } catch (error) {
    request.log.error(error)
    return reply.code(503).send({ status: 'unavailable' })
  }
})

app.register(setRoutes)
app.register(authRoutes)
app.register(exerciseRoutes)
app.register(workoutRoutes)

if (existsSync(FRONTEND_DIRECTORY)) {
  await app.register(fastifyStatic, {
    root: FRONTEND_DIRECTORY,
    wildcard: false,
    cacheControl: false,
    setHeaders: (reply, path) => {
      // Noms avec empreinte : jamais modifiés. Le reste (index.html, le
      // service worker, le manifeste) est revalidé à chaque chargement,
      // sinon une nouvelle version n'arriverait pas (ADR 0015).
      reply.header(
        'Cache-Control',
        path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
      )
    }
  })

  // Routes de l'application (historique du navigateur) : index.html
  app.setNotFoundHandler((request, reply) => {
    if (request.method !== 'GET' || request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'Not found' })
    }
    reply.header('Cache-Control', 'no-cache')
    return reply.sendFile('index.html')
  })
}

try {
  const schema = await checkSchemaVersion(pool, await expectedSchemaVersion())
  if (schema.warning) {
    app.log.warn(schema.warning)
  }
  app.log.info(`Database schema at version ${schema.current}`)

  await app.listen({
    host: config.host,
    port: config.port
  })
} catch (error) {
  app.log.fatal(error)
  await pool.end().catch(() => {})
  process.exit(1)
}
