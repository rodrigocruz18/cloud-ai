import type { FastifyInstance } from 'fastify'

export async function authMiddleware(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } })
    }
  })
}
