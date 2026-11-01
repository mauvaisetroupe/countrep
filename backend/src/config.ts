import 'dotenv/config'

// Configuration de l'API, lue dans les variables d'environnement seulement
// (ADR 0017) ; chaque variable est décrite dans docs/exploitation.md.
// Importé avant tout autre module de l'API : une configuration invalide
// arrête le processus avant qu'il n'écoute, avec toutes les erreurs d'un coup.

export interface Config {
  database: {
    host: string
    port: number
    name: string
    user: string
    password: string
  }
  jwtSecret: string
  googleClientIds: string[]
  // Origines admises par CORS en plus de la même origine
  corsOrigins: string[]
  host: string
  port: number
}

// L'ancienne valeur par défaut du code : un token signé avec elle est falsifiable
const DEMO_JWT_SECRET = 'votre_secret_super_securise'

const REQUIRED = [
  'DATABASE_HOST',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'JWT_SECRET',
  'GOOGLE_CLIENT_IDS'
] as const

type Env = Record<string, string | undefined>

const list = (value: string | undefined) =>
  (value ?? '').split(',').map(item => item.trim()).filter(Boolean)

export function loadConfig(env: Env): Config {
  const errors: string[] = []

  const missing = REQUIRED.filter(name => !env[name]?.trim())
  if (missing.length > 0) {
    errors.push(`missing required variables: ${missing.join(', ')}`)
  }

  if (env.JWT_SECRET === DEMO_JWT_SECRET) {
    errors.push('JWT_SECRET is the demo value of the code, choose a secret')
  }

  const integer = (name: string, fallback: number) => {
    const value = env[name]?.trim()
    if (!value) return fallback
    if (!/^\d+$/.test(value)) {
      errors.push(`${name} must be a positive integer, got "${value}"`)
      return fallback
    }
    return Number(value)
  }

  const config: Config = {
    database: {
      host: env.DATABASE_HOST?.trim() ?? '',
      port: integer('DATABASE_PORT', 5432),
      name: env.DATABASE_NAME?.trim() ?? '',
      user: env.DATABASE_USER?.trim() ?? '',
      password: env.DATABASE_PASSWORD ?? ''
    },
    jwtSecret: env.JWT_SECRET ?? '',
    googleClientIds: list(env.GOOGLE_CLIENT_IDS),
    corsOrigins: [
      // Application Android Capacitor (ADR 0012)
      'https://localhost',
      env.EXPECTED_ORIGIN?.trim() || 'https://countrep.architech.lu',
      // Serveurs de développement (Vite), dans backend/.env
      ...list(env.CORS_ORIGINS)
    ],
    host: env.HOST?.trim() || '0.0.0.0',
    port: integer('PORT', 3000)
  }

  if (errors.length > 0) {
    throw new Error(`Invalid configuration: ${errors.join('; ')}`)
  }

  return config
}

function loadOrExit(): Config {
  try {
    return loadConfig(process.env)
  } catch (error) {
    // Même format que le journal de Fastify, qui n'existe pas encore
    console.error(JSON.stringify({ level: 60, time: Date.now(), msg: (error as Error).message }))
    process.exit(1)
  }
}

export const config = loadOrExit()
