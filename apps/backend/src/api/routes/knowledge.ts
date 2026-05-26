import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { supabase } from '../../db/supabase.js'

const CreateSchema = z.object({
  type: z.enum(['text', 'url']),
  name: z.string().min(1),
  content: z.string().min(1),
})

async function scrapeUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloudAI-Bot/1.0)' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} al acceder a ${url}`)

  const html = await response.text()

  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#\d+;/g, '')       // remove remaining numeric entities
    .replace(/&[a-z]+;/g, ' ')    // remove remaining named entities
    .replace(/[ \t]+/g, ' ')      // collapse horizontal whitespace only
    .replace(/\n[ \t]+/g, '\n')   // trim leading spaces on each line
    .replace(/\n{3,}/g, '\n\n')   // max 2 consecutive blank lines
    .trim()

  if (text.length > 50_000) text = text.slice(0, 50_000) + '\n...[contenido truncado]'
  if (text.length < 50) throw new Error('La página no tiene contenido legible (puede ser una SPA renderizada en cliente)')

  return text
}

export async function knowledgeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/bots/:botId/knowledge', async (request, reply) => {
    const { botId } = request.params as { botId: string }
    const { data, error } = await supabase
      .from('knowledge_sources')
      .select('id, bot_id, type, name, status, config, content, error_message, created_at, updated_at')
      .eq('bot_id', botId)
      .order('created_at')
    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
    return { success: true, data }
  })

  app.post('/bots/:botId/knowledge', async (request, reply) => {
    const { botId } = request.params as { botId: string }
    const parsed = CreateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })

    const { type, name, content } = parsed.data

    if (type === 'text') {
      const { data, error } = await supabase
        .from('knowledge_sources')
        .insert({ bot_id: botId, type, name, content, config: {}, status: 'ready' })
        .select('id, bot_id, type, name, status, config, error_message, created_at, updated_at')
        .single()
      if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
      return reply.code(201).send({ success: true, data })
    }

    // type === 'url' — insert as processing, then scrape async
    const { data: row, error: insertError } = await supabase
      .from('knowledge_sources')
      .insert({ bot_id: botId, type, name, content: null, config: { url: content }, status: 'processing' })
      .select('id, bot_id, type, name, status, config, error_message, created_at, updated_at')
      .single()

    if (insertError || !row) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: insertError?.message } })

    // Scrape in background — don't await
    scrapeUrl(content)
      .then((scraped) =>
        supabase
          .from('knowledge_sources')
          .update({ content: scraped, status: 'ready', error_message: null })
          .eq('id', row.id)
      )
      .catch((err: unknown) =>
        supabase
          .from('knowledge_sources')
          .update({ status: 'error', error_message: err instanceof Error ? err.message : String(err) })
          .eq('id', row.id)
      )

    return reply.code(201).send({ success: true, data: row })
  })

  app.put('/bots/:botId/knowledge/:id', async (request, reply) => {
    const { botId, id } = request.params as { botId: string; id: string }
    const parsed = CreateSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })

    const { type, name, content } = parsed.data

    if (type === 'text') {
      const { data, error } = await supabase
        .from('knowledge_sources')
        .update({ name, content, status: 'ready', error_message: null })
        .eq('id', id).eq('bot_id', botId)
        .select('id, bot_id, type, name, status, config, content, error_message, created_at, updated_at')
        .single()
      if (error || !data) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Source not found' } })
      return { success: true, data }
    }

    // type === 'url' — update name + re-scrape if URL changed
    const { data: existing } = await supabase.from('knowledge_sources').select('config').eq('id', id).single()
    const oldUrl = (existing?.config as Record<string, string>)?.url
    const urlChanged = oldUrl !== content

    const { data: row, error } = await supabase
      .from('knowledge_sources')
      .update({
        name,
        config: { url: content },
        ...(urlChanged ? { status: 'processing', content: null, error_message: null } : {}),
      })
      .eq('id', id).eq('bot_id', botId)
      .select('id, bot_id, type, name, status, config, content, error_message, created_at, updated_at')
      .single()

    if (error || !row) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Source not found' } })

    if (urlChanged) {
      scrapeUrl(content)
        .then((scraped) => supabase.from('knowledge_sources').update({ content: scraped, status: 'ready', error_message: null }).eq('id', id))
        .catch((err: unknown) => supabase.from('knowledge_sources').update({ status: 'error', error_message: err instanceof Error ? err.message : String(err) }).eq('id', id))
    }

    return { success: true, data: row }
  })

  app.delete('/bots/:botId/knowledge/:id', async (request, reply) => {
    const { botId, id } = request.params as { botId: string; id: string }
    const { error } = await supabase.from('knowledge_sources').delete().eq('id', id).eq('bot_id', botId)
    if (error) return reply.code(500).send({ success: false, error: { code: 'DB_ERROR', message: error.message } })
    return reply.code(204).send()
  })
}
