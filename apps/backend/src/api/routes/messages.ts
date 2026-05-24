import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { BotRuntime } from '../../core/bot-runtime/index.js'
import { supabase } from '../../db/supabase.js'
import { createHmac, timingSafeEqual } from 'crypto'

const IncomingMessageSchema = z.object({
  userPhone: z.string().min(1),
  userName: z.string().optional(),
  content: z.string().min(1),
  channel: z.enum(['whatsapp', 'telegram', 'instagram', 'webchat']).default('whatsapp'),
  metadata: z.record(z.unknown()).optional(),
})

const runtime = new BotRuntime()

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function messageRoutes(app: FastifyInstance): Promise<void> {
  // Kapso webhook — receives incoming messages
  app.post('/bots/:botId/message', async (request, reply) => {
    const { botId } = request.params as { botId: string }

    // Load bot to get webhook_secret
    const { data: bot } = await supabase
      .from('bots')
      .select('webhook_secret, status')
      .eq('id', botId)
      .single()

    if (!bot) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Bot not found' } })
    if (bot.status !== 'active') return reply.code(422).send({ success: false, error: { code: 'BOT_INACTIVE', message: 'Bot is not active' } })

    // Verify webhook signature if secret is set
    const signature = request.headers['x-kapso-signature'] as string | undefined
    if (bot.webhook_secret && signature) {
      const rawBody = JSON.stringify(request.body)
      if (!verifyWebhookSignature(rawBody, signature, bot.webhook_secret as string)) {
        return reply.code(401).send({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } })
      }
    }

    const parsed = IncomingMessageSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })

    const result = await runtime.processMessage({ botId, ...parsed.data })

    if (!result.ok) {
      app.log.error({ botId, error: result.error.message }, 'Bot runtime error')
      return reply.code(500).send({ success: false, error: { code: 'RUNTIME_ERROR', message: result.error.message } })
    }

    return { success: true, data: result.value }
  })
}
