function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env variable: ${key}`)
  return value
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const config = {
  port: parseInt(optional('PORT', '3001'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),

  supabase: {
    url: required('SUPABASE_URL'),
    anonKey: required('SUPABASE_ANON_KEY'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },

  auth: {
    jwtSecret: required('JWT_SECRET'),
  },

  encryption: {
    key: required('ENCRYPTION_KEY'),
  },

  kapso: {
    webhookSecret: optional('KAPSO_WEBHOOK_SECRET', ''),
  },

  ai: {
    deepseek: {
      apiKey: optional('DEEPSEEK_API_KEY', ''),
      baseUrl: optional('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
    },
    openai: {
      apiKey: optional('OPENAI_API_KEY', ''),
    },
    anthropic: {
      apiKey: optional('ANTHROPIC_API_KEY', ''),
    },
  },
} as const
