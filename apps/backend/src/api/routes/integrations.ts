import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../../db/supabase.js'
import { encrypt } from '../../lib/encrypt.js'
import { executeHttpRequest } from '../../tools/executors/http-request.js'

const CreateSchema = z.object({
  type: z.enum(['gmail','google_drive','agendapro','salesforce','hubspot','shopify','http_request']),
  name: z.string().min(1),
  config: z.record(z.unknown()).default({}),
  credentials: z.record(z.unknown()).default({}),
})

export async function integrationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/bots/:botId/integrations', async (request, reply) => {
    const { botId } = request.params as { botId: string }
    const { data, error } = await supabase
      .from('integrations')
      .select('id, bot_id, type, name, status, config, created_at, updated_at')
      .eq('bot_id', botId)
      .order('created_at')
    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
    return { success: true, data }
  })

  app.post('/bots/:botId/integrations', async (request, reply) => {
    const { botId } = request.params as { botId: string }
    const parsed = CreateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })

    const { credentials, config, type, name } = parsed.data
    const credentials_encrypted = Object.keys(credentials).length > 0
      ? encrypt(JSON.stringify(credentials))
      : null

    const { data, error } = await supabase
      .from('integrations')
      .insert({ bot_id: botId, type, name, config, credentials_encrypted, status: type === 'http_request' ? 'active' : 'inactive' })
      .select('id, bot_id, type, name, status, config, created_at, updated_at')
      .single()

    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
    return reply.code(201).send({ success: true, data })
  })

  app.put('/bots/:botId/integrations/:id', async (request, reply) => {
    const { botId, id } = request.params as { botId: string; id: string }
    const body = request.body as Record<string, unknown>
    const credentials_encrypted = body['credentials'] && Object.keys(body['credentials'] as object).length > 0
      ? encrypt(JSON.stringify(body['credentials']))
      : undefined

    const updateData: Record<string, unknown> = {}
    if (body['name']) updateData['name'] = body['name']
    if (body['config']) updateData['config'] = body['config']
    if (body['status']) updateData['status'] = body['status']
    if (credentials_encrypted) updateData['credentials_encrypted'] = credentials_encrypted

    const { data, error } = await supabase
      .from('integrations')
      .update(updateData)
      .eq('id', id)
      .eq('bot_id', botId)
      .select('id, bot_id, type, name, status, config, created_at, updated_at')
      .single()

    if (error || !data) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } })
    return { success: true, data }
  })

  app.post('/bots/:botId/integrations/:id/test', async (request, reply) => {
    const { botId, id } = request.params as { botId: string; id: string }
    const args = (request.body as Record<string, unknown>) ?? {}

    const { data } = await supabase
      .from('integrations')
      .select('config, credentials_encrypted')
      .eq('id', id).eq('bot_id', botId)
      .single()

    if (!data) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } })

    const result = await executeHttpRequest(
      data.config as Parameters<typeof executeHttpRequest>[0],
      data.credentials_encrypted as string | null,
      args,
      'test'
    )

    return { success: true, data: { content: result.content, isError: result.isError } }
  })

  app.delete('/bots/:botId/integrations/:id', async (request, reply) => {
    const { botId, id } = request.params as { botId: string; id: string }
    const { error } = await supabase.from('integrations').delete().eq('id', id).eq('bot_id', botId)
    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
    return reply.code(204).send()
  })
}
