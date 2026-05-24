import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../../db/supabase.js'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error || !data.user) {
      return reply.code(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } })
    }

    const token = app.jwt.sign(
      { sub: data.user.id, email: data.user.email },
      { expiresIn: '7d' }
    )

    return { success: true, data: { token, user: { id: data.user.id, email: data.user.email } } }
  })

  app.get('/auth/me', {
    onRequest: [app.authenticate],
  }, async (request) => {
    return { success: true, data: request.user }
  })
}
