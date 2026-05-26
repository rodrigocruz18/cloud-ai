import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { config } from './config/index.js'
import { authRoutes } from './api/routes/auth.js'
import { botRoutes } from './api/routes/bots.js'
import { clientRoutes } from './api/routes/clients.js'
import { messageRoutes } from './api/routes/messages.js'
import { conversationRoutes } from './api/routes/conversations.js'
import { toolRoutes } from './api/routes/tools.js'
import { integrationRoutes } from './api/routes/integrations.js'
import { knowledgeRoutes } from './api/routes/knowledge.js'

const app = Fastify({
  logger: {
    transport:
      config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

async function bootstrap(): Promise<void> {
  await app.register(helmet)
  await app.register(cors, {
    origin: [config.frontendUrl, 'http://localhost:5174', 'http://localhost:5173'],
    credentials: true,
  })
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })
  await app.register(jwt, {
    secret: config.auth.jwtSecret,
  })

  // Expose authenticate decorator used by protected routes
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch {
      reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } })
    }
  })

  // Health check
  app.get('/health', async () => ({ status: 'ok', version: '0.1.1', node: process.version }))

  // Routes
  await app.register(authRoutes, { prefix: '/api/v1' })

  // Protected routes
  await app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', async (request: any, reply: any) => {
      try {
        await request.jwtVerify()
      } catch {
        reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } })
      }
    })
    await protectedApp.register(clientRoutes, { prefix: '/api/v1' })
    await protectedApp.register(botRoutes, { prefix: '/api/v1' })
    await protectedApp.register(conversationRoutes, { prefix: '/api/v1' })
    await protectedApp.register(toolRoutes, { prefix: '/api/v1' })
    await protectedApp.register(integrationRoutes, { prefix: '/api/v1' })
    await protectedApp.register(knowledgeRoutes, { prefix: '/api/v1' })
  })

  // Webhook route — authenticated via webhook_secret, not JWT
  await app.register(messageRoutes, { prefix: '/api/v1' })

  await app.listen({ port: config.port, host: '0.0.0.0' })
  app.log.info(`Cloud AI backend running on port ${config.port}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
