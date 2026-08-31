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
  console.log('Methode recue :', JSON.stringify(request.method)) // Pour voir le contenu exact
  console.log('Methode recue :', JSON.stringify(request.raw?.method)) // Pour voir le contenu exact
  if (request.raw.method?.toUpperCase() === 'OPTIONS') {    console.log('OPTIONS')
    return
  }
  else {
    console.log('OPTIONS-ELSE')
  }
  const authHeader = request.headers.authorization
  console.log('Headers reçus :', request.headers)
  console.log('authHeader:' , authHeader)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Quel bazar')
    return reply.code(401).send({ error: 'Accès non autorisé : Token manquant' })
  }

  try {
    const token = authHeader.split(' ')[1] 
    const decoded: any = jwt.verify(token as string, JWT_SECRET)
    request.userId = decoded.userId // Récupéré et décodé de façon sécurisée
  } catch (err) {
    console.log('Erreur JWT :', err)
    return reply.code(401).send({ error: 'Token invalide ou expiré' })
  }
}