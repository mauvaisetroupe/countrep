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

// Le nom reste unique tant que la connexion par passkey (qui s'en sert
// comme identifiant) existe : « Lionel », puis « Lionel 2 »…
async function availableName(base: string): Promise<string> {
  const name = base.trim().slice(0, 90) || 'CountRep'

  for (let suffix = 1; suffix < 1000; suffix++) {
    const candidate = suffix === 1 ? name : `${name} ${suffix}`
    const taken = await pool.query('SELECT 1 FROM users WHERE name = $1', [candidate])
    if (taken.rowCount === 0) return candidate
  }

  return `${name} ${randomUUID().slice(0, 8)}`
}

export async function googleAuthRoutes(app: FastifyInstance) {

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
      await pool.query(
        'INSERT INTO users (id, name, google_sub, created_at) VALUES ($1, $2, $3, now())',
        [userId, await availableName(identity.givenName ?? ''), identity.sub]
      )
    }

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
    return { token, created }
  })

  // Association d'un compte Google au compte connecté (migration des
  // comptes créés avec une passkey)
  app.post('/api/auth/google/link', { preHandler: verifyJWT }, async (request, reply) => {
    const { idToken } = (request.body ?? {}) as { idToken?: unknown }
    const identity = await verifyGoogleToken(idToken)

    if (!identity) {
      return reply.code(401).send({ error: 'Invalid Google token' })
    }

    const owner = await pool.query(
      'SELECT id FROM users WHERE google_sub = $1',
      [identity.sub]
    )

    if (owner.rowCount && owner.rows[0].id !== request.userId) {
      return reply.code(409).send({ error: 'Google account already linked to another user' })
    }

    await pool.query(
      'UPDATE users SET google_sub = $1 WHERE id = $2',
      [identity.sub, request.userId]
    )

    return { linked: true }
  })

  // Profil du compte connecté
  app.get('/api/auth/me', { preHandler: verifyJWT }, async (request, reply) => {
    const result = await pool.query(
      'SELECT name, google_sub IS NOT NULL AS google_linked FROM users WHERE id = $1',
      [request.userId]
    )

    if (result.rowCount === 0) {
      return reply.code(401).send({ error: 'Unknown user' })
    }

    return {
      name: result.rows[0].name,
      googleLinked: result.rows[0].google_linked
    }
  })
}
