import type { FastifyInstance } from 'fastify'
import { TOOL_CATALOG } from '../../tools/catalog.js'
import { supabase } from '../../db/supabase.js'

export async function toolRoutes(app: FastifyInstance): Promise<void> {
  // Full tool catalog
  app.get('/tools', async () => ({ success: true, data: TOOL_CATALOG }))

  // Tool logs for a specific bot
  app.get('/bots/:botId/logs', async (request, reply) => {
    const { botId } = request.params as { botId: string }
    const { page = '1', pageSize = '30' } = request.query as Record<string, string>
    const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10)

    const { data, error, count } = await supabase
      .from('tool_logs')
      .select('*', { count: 'exact' })
      .eq('bot_id', botId)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(pageSize, 10) - 1)

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
}
