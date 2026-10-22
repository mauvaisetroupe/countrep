import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_super_securise'

// Extension du type FastifyRequest pour typer request.userId
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
  }
}

export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Accès non autorisé : Token manquant' })
  }

  try {
    const token = authHeader.split(' ')[1]
    const decoded: any = jwt.verify(token as string, JWT_SECRET)
    request.userId = decoded.userId // Récupéré et décodé de façon sécurisée
  } catch {
    return reply.code(401).send({ error: 'Token invalide ou expiré' })
  }
}