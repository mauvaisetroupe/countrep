import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { pool } from '../db.js'
import jwt from 'jsonwebtoken'

const rpName = 'CountRep App'
// Récupérez les valeurs depuis les variables d'environnement avec des replis pour le local
const rpID = process.env.RP_ID || 'localhost'
const expectedOrigin = process.env.EXPECTED_ORIGIN || 'http://localhost:5173'

const JWT_SECRET: string = process.env.JWT_SECRET || 'votre_secret_super_securise'

const currentChallenges = new Map<string, string>()

export async function authRoutes(fastify: FastifyInstance) {
  
  fastify.post('/api/auth/register-challenge', async (request, reply) => {
    const { username } = request.body as { username: string }
    if (!username) return reply.code(400).send({ error: 'Username requis' })

    let userResult = await pool.query('SELECT id FROM users WHERE name = $1', [username])
    let userId: string

    if (userResult.rows.length === 0) {
      //LCO
      userId = randomUUID()
      const now = new Date()
      await pool.query(
        'INSERT INTO users (id, name, created_at) VALUES ($1, $2, $3)',
        [userId, username, now]
      )
    } else {
      return reply.code(400).send({ error: 'Ce nom d\'utilisateur est déjà pris' })
    }

    const devicesRes = await pool.query(
      'SELECT credential_id, transports FROM user_devices WHERE user_id = $1',
      [userId]
    )

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(userId),
      userName: username,
      excludeCredentials: devicesRes.rows.map((dev: any) => ({
        id: dev.credential_id,
        type: 'public-key',
        transports: dev.transports,
      })),
    })

    currentChallenges.set(username, options.challenge)
    return options
  })

  fastify.post('/api/auth/register', async (request, reply) => {
    const { username, cred } = request.body as { username: string; cred: any }
    const expectedChallenge = currentChallenges.get(username)

    const userResult = await pool.query('SELECT id FROM users WHERE name = $1', [username])
    if (userResult.rows.length === 0 || !expectedChallenge) {
      return reply.code(400).send({ error: 'Contexte invalide' })
    }
    const userId = userResult.rows[0].id

    try {
      const verification = await verifyRegistrationResponse({
        response: cred,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
      })

      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo

        await pool.query(
          `INSERT INTO user_devices (user_id, credential_id, credential_public_key, counter, transports)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (credential_id) DO NOTHING`,
          [
            userId,
            credential.id,
            Buffer.from(credential.publicKey),
            credential.counter,
            credential.transports || [],
          ]
        )

        currentChallenges.delete(username)
        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
        return { verified: true, token }
      }
      return { verified: false }
    } catch (error: any) {
      return reply.code(400).send({ error: error.message })
    }
  })

  fastify.post('/api/auth/login-challenge', async (request, reply) => {
    const { username } = request.body as { username: string }
    
    const userResult = await pool.query('SELECT id FROM users WHERE name = $1', [username])
    if (userResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Utilisateur inconnu' })
    }
    const userId = userResult.rows[0].id

    const devicesRes = await pool.query(
      'SELECT credential_id, transports FROM user_devices WHERE user_id = $1',
      [userId]
    )

    if (devicesRes.rows.length === 0) {
      return reply.code(400).send({ error: 'Aucun appareil enregistré pour cet utilisateur' })
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: devicesRes.rows.map((dev: any) => ({
        id: dev.credential_id,
        type: 'public-key',
        transports: dev.transports,
      })),
    })

    currentChallenges.set(username, options.challenge)
    return options
  })

  fastify.post('/api/auth/login', async (request, reply) => {
    const { username, cred } = request.body as { username: string; cred: any }
    const expectedChallenge = currentChallenges.get(username)

    const userResult = await pool.query('SELECT id FROM users WHERE name = $1', [username])
    if (userResult.rows.length === 0 || !expectedChallenge) {
      return reply.code(400).send({ error: 'Contexte invalide' })
    }
    const userId = userResult.rows[0].id

    const deviceRes = await pool.query(
      'SELECT credential_id, credential_public_key, counter, transports FROM user_devices WHERE user_id = $1 AND credential_id = $2',
      [userId, cred.id]
    )

    if (deviceRes.rows.length === 0) {
      return reply.code(400).send({ error: 'Appareil non reconnu' })
    }

    const dbDevice = deviceRes.rows[0]

    try {
      const verification = await verifyAuthenticationResponse({
        response: cred,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: dbDevice.credential_id,
          publicKey: dbDevice.credential_public_key,
          counter: Number(dbDevice.counter),
          transports: dbDevice.transports,
        },
      })

      if (verification.verified && verification.authenticationInfo) {
        await pool.query(
          'UPDATE user_devices SET counter = $1 WHERE credential_id = $2',
          [verification.authenticationInfo.newCounter, dbDevice.credential_id]
        )

        currentChallenges.delete(username)
        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
        return { verified: true, token }
      }
      return { verified: false }
    } catch (error: any) {
      return reply.code(400).send({ error: error.message })
    }
  })
}