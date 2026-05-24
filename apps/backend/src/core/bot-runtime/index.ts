import type { Bot, IncomingMessage, OutgoingMessage, Result } from '@cloud-ai/shared'
import { ok, err } from '@cloud-ai/shared'
import { supabase } from '../../db/supabase.js'
import { getProvider } from '../../providers/registry.js'
import { AIOrchestrator } from '../ai-orchestrator/index.js'
import { ToolExecutionLayer } from '../tool-execution/index.js'

export class BotRuntime {
  private orchestrator = new AIOrchestrator()
  private toolLayer = new ToolExecutionLayer()

  async processMessage(incoming: IncomingMessage): Promise<Result<OutgoingMessage>> {
    // 1. Load bot configuration
    const botResult = await this.loadBot(incoming.botId)
    if (!botResult.ok) return err(botResult.error)
    const bot = botResult.value

    if (bot.status !== 'active') {
      return err(new Error(`Bot ${bot.id} is not active`))
    }

    // 2. Resolve or create conversation
    const conversationResult = await this.resolveConversation(bot, incoming)
    if (!conversationResult.ok) return err(conversationResult.error)
    const conversationId = conversationResult.value

    // 3. Persist incoming message
    await this.persistMessage(conversationId, 'user', incoming.content)

    // 4. Build AI context (system prompt + history + tools)
    const contextResult = await this.orchestrator.buildContext(bot, conversationId)
    if (!contextResult.ok) return err(contextResult.error)

    // 5. Execute AI — agentic loop (handles tool calls)
    const provider = getProvider(bot.provider)
    const responseResult = await this.orchestrator.runAgenticLoop(
      provider,
      contextResult.value,
      bot,
      conversationId,
      this.toolLayer
    )
    if (!responseResult.ok) return err(responseResult.error)

    // 6. Persist assistant response
    await this.persistMessage(conversationId, 'assistant', responseResult.value.content)

    return ok({
      content: responseResult.value.content,
      conversationId,
      messageId: responseResult.value.messageId,
    })
  }

  private async loadBot(botId: string): Promise<Result<Bot>> {
    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .single()

    if (error || !data) {
      return err(new Error(`Bot not found: ${botId}`))
    }
    return ok(data as Bot)
  }

  private async resolveConversation(
    bot: Bot,
    incoming: IncomingMessage
  ): Promise<Result<string>> {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('bot_id', bot.id)
      .eq('user_phone', incoming.userPhone)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) return ok(existing.id as string)

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({
        bot_id: bot.id,
        user_phone: incoming.userPhone,
        user_name: incoming.userName ?? null,
        channel: incoming.channel,
        status: 'active',
        metadata: incoming.metadata ?? {},
      })
      .select('id')
      .single()

    if (error || !created) {
      return err(new Error('Failed to create conversation'))
    }
    return ok(created.id as string)
  }

  private async persistMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role,
      content,
    })
  }
}
