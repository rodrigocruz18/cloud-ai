import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../../db/supabase.js'

const CreateClientSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})

export async function clientRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients', async (request, reply) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name')
    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
    return { success: true, data }
  })

  app.post('/clients', async (request, reply) => {
    const parsed = CreateClientSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })

    const { data, error } = await supabase
      .from('clients')
      .insert(parsed.data)
      .select()
      .single()

    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
    return reply.code(201).send({ success: true, data })
  })

  app.delete('/clients/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
    return reply.code(204).send()
  })
}
