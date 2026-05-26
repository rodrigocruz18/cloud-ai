import type { FastifyInstance } from 'fastify'
import { supabase } from '../../db/supabase.js'

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  // List conversations (optional filters: botId, clientId)
  app.get('/conversations', async (request, reply) => {
    const { botId, clientId, page = '1', pageSize = '20' } = request.query as Record<string, string>
    const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10)

    let query = supabase
      .from('conversations')
      .select('*, bots!inner(id, name, client_id)', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + parseInt(pageSize, 10) - 1)

    if (botId) query = query.eq('bot_id', botId)
    if (clientId) query = query.eq('bots.client_id', clientId)

    const { data, error, count } = await query
    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })

    return {
      success: true,
      data: {
        items: data ?? [],
        total: count ?? 0,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
      },
    }
  })

  // Get conversation with messages
  app.get('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !conversation) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } })

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    return { success: true, data: { ...conversation, messages: messages ?? [] } }
  })
}
