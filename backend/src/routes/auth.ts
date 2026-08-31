import type { FastifyInstance } from 'fastify'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'

const rpName = 'CountRep App'
const rpID = 'localhost'
const expectedOrigin = 'http://localhost:5173'

const users = new Map<string, any>()
const currentChallenges = new Map<string, string>()

export async function authRoutes(fastify: FastifyInstance) {
  
  // 1. Générer options d'enregistrement
  fastify.post('/api/auth/register-challenge', async (request, reply) => {
    const { username } = request.body as { username: string }
    if (!username) return reply.code(400).send({ error: 'Username requis' })

    let user = users.get(username)
    if (!user) {
      user = { id: Buffer.from(username), username, devices: [] }
      users.set(username, user)
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id,
      userName: username,
      excludeCredentials: user.devices.map((dev: any) => ({
        id: dev.credentialID,
        type: 'public-key',
      })),
    })

    currentChallenges.set(username, options.challenge)
    return options
  })

  // 2. Vérifier et enregistrer la clé
  fastify.post('/api/auth/register', async (request, reply) => {
    const { username, cred } = request.body as { username: string; cred: any }
    const user = users.get(username)
    const expectedChallenge = currentChallenges.get(username)

    if (!user || !expectedChallenge) {
      return reply.code(400).send({ error: 'Contexte invalide' })
    }

    try {
      const verification = await verifyRegistrationResponse({
        response: cred,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
      })

      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo
        user.devices.push({
          credentialID: credential.id,
          credentialPublicKey: credential.publicKey,
          counter: credential.counter,
          transports: credential.transports,
        })
        currentChallenges.delete(username)
        return { verified: true }
      }
      return { verified: false }
    } catch (error: any) {
      return reply.code(400).send({ error: error.message })
    }
  })

  // 3. Générer options de connexion
  fastify.post('/api/auth/login-challenge', async (request, reply) => {
    const { username } = request.body as { username: string }
    const user = users.get(username)

    if (!user) {
      return reply.code(404).send({ error: 'Utilisateur inconnu' })
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.devices.map((dev: any) => ({
        id: dev.credentialID,
        type: 'public-key',
        transports: dev.transports,
      })),
    })

    currentChallenges.set(username, options.challenge)
    return options
  })

  // 4. Vérifier la connexion
  fastify.post('/api/auth/login', async (request, reply) => {
    const { username, cred } = request.body as { username: string; cred: any }
    const user = users.get(username)
    const expectedChallenge = currentChallenges.get(username)

    if (!user || !expectedChallenge) {
      return reply.code(400).send({ error: 'Contexte invalide' })
    }

    const dbDevice = user.devices.find((dev: any) => dev.credentialID === cred.id)
    if (!dbDevice) {
      return reply.code(400).send({ error: 'Appareil non reconnu' })
    }

    try {
      const verification = await verifyAuthenticationResponse({
        response: cred,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: dbDevice.credentialID,
          publicKey: dbDevice.credentialPublicKey,
          counter: dbDevice.counter,
          transports: dbDevice.transports,
        },
      })

      if (verification.verified && verification.authenticationInfo) {
        dbDevice.counter = verification.authenticationInfo.newCounter
        currentChallenges.delete(username)
        return { verified: true }
      }
      return { verified: false }
    } catch (error: any) {
      return reply.code(400).send({ error: error.message })
    }
  })
}