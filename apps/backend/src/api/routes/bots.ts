import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../../db/supabase.js'
import { randomBytes } from 'crypto'

const CreateBotSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  prompt: z.string().min(1),
  provider: z.enum(['deepseek', 'openai', 'claude', 'gemini', 'ollama']).default('deepseek'),
  model: z.string().default('deepseek-chat'),
  temperature: z.number().min(0).max(2).default(0.7),
})

const UpdateBotSchema = CreateBotSchema.omit({ client_id: true }).partial().extend({
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  max_tokens: z.number().int().positive().optional(),
})

export async function botRoutes(app: FastifyInstance): Promise<void> {
  // List bots
  app.get('/bots', async (request, reply) => {
    const { clientId } = request.query as { clientId?: string }
    let query = supabase.from('bots').select('*').order('created_at', { ascending: false })
    if (clientId) query = query.eq('client_id', clientId)
    const { data, error } = await query
    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
    return { success: true, data }
  })

  // Get bot
  app.get('/bots/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase.from('bots').select('*').eq('id', id).single()
    if (error || !data) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Bot not found' } })
    return { success: true, data }
  })

  // Create bot
  app.post('/bots', async (request, reply) => {
    const parsed = CreateBotSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })

    const { data, error } = await supabase.from('bots').insert({
      ...parsed.data,
      status: 'draft',
      webhook_secret: randomBytes(32).toString('hex'),
    }).select().single()

    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
    return reply.code(201).send({ success: true, data })
  })

  // Update bot
  app.put('/bots/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateBotSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })

    const { data, error } = await supabase.from('bots').update(parsed.data).eq('id', id).select().single()
    if (error || !data) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Bot not found' } })
    return { success: true, data }
  })

  // Delete bot
  app.delete('/bots/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase.from('bots').delete().eq('id', id)
    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
    return reply.code(204).send()
  })
}
