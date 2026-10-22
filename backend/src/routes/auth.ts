import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

// Connexion par compte Google (voir docs/adr/0013). Le client obtient un
// jeton d'identité Google (plugin @capgo/capacitor-social-login, web ou
// Android) ; le serveur le vérifie et ouvre la session de l'application
// (JWT de 7 jours, renouvellement glissant de l'ADR 0003).

const JWT_SECRET: string = process.env.JWT_SECRET || 'votre_secret_super_securise'

// Identifiants client OAuth acceptés (web, Android), séparés par des virgules
const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_CLIENT_IDS ?? '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean)

const googleClient = new OAuth2Client()

interface GoogleIdentity {
  sub: string
  givenName: string | null
}

// Vérifie signature, émetteur, audience et expiration du jeton Google.
// Seul l'identifiant `sub` est gardé, et le prénom pour le nom affiché :
// pas d'adresse e-mail (ADR 0013).
async function verifyGoogleToken(idToken: unknown): Promise<GoogleIdentity | null> {
  if (typeof idToken !== 'string' || GOOGLE_CLIENT_IDS.length === 0) {
    return null
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_IDS
    })
    const payload = ticket.getPayload()
    if (!payload?.sub) return null

    return { sub: payload.sub, givenName: payload.given_name ?? null }
  } catch {
    return null
  }
}

const sessionToken = (userId: string) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })

export async function authRoutes(app: FastifyInstance) {

  // Connexion : retrouve le compte associé à ce compte Google, ou le crée
  app.post('/api/auth/google', async (request, reply) => {
    const { idToken } = (request.body ?? {}) as { idToken?: unknown }
    const identity = await verifyGoogleToken(idToken)

    if (!identity) {
      return reply.code(401).send({ error: 'Invalid Google token' })
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE google_sub = $1',
      [identity.sub]
    )

    let userId: string = existing.rows[0]?.id
    const created = !userId

    if (!userId) {
      userId = randomUUID()
      const name = identity.givenName?.trim().slice(0, 100) || 'CountRep'
      await pool.query(
        'INSERT INTO users (id, name, google_sub, created_at) VALUES ($1, $2, $3, now())',
        [userId, name, identity.sub]
      )
    }

    return { token: sessionToken(userId), created }
  })

  // Renouvellement glissant : un token encore valide est échangé
  // contre un nouveau token de 7 jours (voir docs/adr/0003).
  app.post('/api/auth/refresh', { preHandler: verifyJWT }, async (request, reply) => {
    const userId = request.userId!

    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return reply.code(401).send({ error: 'Utilisateur inconnu' })
    }

    return { token: sessionToken(userId) }
  })

  // Profil du compte connecté
  app.get('/api/auth/me', { preHandler: verifyJWT }, async (request, reply) => {
    const result = await pool.query(
      'SELECT name FROM users WHERE id = $1',
      [request.userId]
    )

    if (result.rowCount === 0) {
      return reply.code(401).send({ error: 'Unknown user' })
    }

    return { name: result.rows[0].name }
  })
}
