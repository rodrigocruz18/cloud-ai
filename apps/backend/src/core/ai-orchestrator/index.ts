import type { Bot, AIContext, Message, Result, ToolDefinition } from '@cloud-ai/shared'
import { ok, err } from '@cloud-ai/shared'
import { supabase } from '../../db/supabase.js'
import type { AIProvider } from '../../providers/base.js'
import { getToolDefinitions } from '../../tools/registry.js'
import { executeHttpRequest } from '../../tools/executors/http-request.js'
import type { ToolExecutionLayer } from '../tool-execution/index.js'

const MAX_TOOL_ITERATIONS = 10

interface AgenticResult {
  content: string
  messageId: string
}

interface HttpIntegration {
  id: string
  config: Record<string, unknown>
  credentials_encrypted: string | null
}

export class AIOrchestrator {
  async buildContext(bot: Bot, conversationId: string): Promise<Result<AIContext>> {
    const [messagesResult, httpIntegrations, knowledge] = await Promise.all([
      supabase
        .from('messages')
        .select('role, content, tool_calls, tool_call_id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(50),
      this.loadHttpIntegrations(bot.id),
      this.loadKnowledge(bot.id),
    ])

    if (messagesResult.error) return err(new Error('Failed to load message history'))

    // Log knowledge injection to tool_logs for auditability
    if (knowledge.sources.length > 0) {
      void supabase.from('tool_logs').insert({
        bot_id: bot.id,
        conversation_id: conversationId,
        tool_name: 'knowledge.context_loaded',
        arguments: {
          sources: knowledge.sources.map((s) => ({ name: s.name, type: s.type, chars: s.chars })),
          total_chars: knowledge.sources.reduce((sum, s) => sum + s.chars, 0),
        },
        result: { injected: knowledge.context !== '' },
        status: 'success',
        latency_ms: 0,
      })
    }

    // Build tool list: static registry + dynamic HTTP tools from bot integrations
    const staticTools = getToolDefinitions()
    const httpTools = this.buildHttpToolDefinitions(httpIntegrations)
    const allTools = [...staticTools, ...httpTools]

    const context: AIContext = {
      systemPrompt: bot.prompt + knowledge.context,
      messages: (messagesResult.data ?? []) as Message[],
      tools: allTools.length > 0 ? allTools : undefined,
      temperature: bot.temperature,
      maxTokens: bot.max_tokens ?? undefined,
    }

    return ok(context)
  }

  private async loadKnowledge(botId: string): Promise<{
    context: string
    sources: Array<{ name: string; type: string; chars: number }>
  }> {
    const { data } = await supabase
      .from('knowledge_sources')
      .select('name, content, type, config')
      .eq('bot_id', botId)
      .eq('status', 'ready')

    if (!data || data.length === 0) return { context: '', sources: [] }

    const loaded: Array<{ name: string; type: string; chars: number; section: string }> = []

    for (const s of data) {
      const text = (s.content as string | null)?.trim()
      if (!text) continue
      const label = s.type === 'url'
        ? `${s.name} (${(s.config as Record<string, string>).url ?? ''})`
        : s.name
      loaded.push({ name: s.name as string, type: s.type as string, chars: text.length, section: `--- ${label} ---\n${text}` })
    }

    if (loaded.length === 0) return { context: '', sources: [] }

    const sections = loaded.map((l) => l.section).join('\n\n')
    const context = `\n\n[BASE DE CONOCIMIENTO]\nResponde ÚNICAMENTE usando la información que aparece a continuación. Si la respuesta no está en este contenido, di claramente que no tienes esa información. NO inventes datos, direcciones, precios, horarios ni ningún otro detalle que no esté explícitamente escrito aquí.\n\n${sections}\n[FIN BASE DE CONOCIMIENTO]`

    return { context, sources: loaded.map(({ name, type, chars }) => ({ name, type, chars })) }
  }

  private async loadHttpIntegrations(botId: string): Promise<HttpIntegration[]> {
    const { data } = await supabase
      .from('integrations')
      .select('id, config, credentials_encrypted')
      .eq('bot_id', botId)
      .eq('type', 'http_request')
      .eq('status', 'active')
    return (data ?? []) as HttpIntegration[]
  }

  private buildHttpToolDefinitions(integrations: HttpIntegration[]): ToolDefinition[] {
    return integrations.map((integration) => {
      const cfg = integration.config as {
        tool_name: string
        tool_description: string
        ai_parameters: Array<{
          name: string
          description: string
          type: string
          required: boolean
        }>
      }

      return {
        name: `http_${cfg.tool_name}`,
        description: cfg.tool_description,
        parameters: Object.fromEntries(
          (cfg.ai_parameters ?? []).map((p) => [
            p.name,
            {
              type: p.type as 'string' | 'number' | 'boolean',
              description: p.description,
              required: p.required,
            },
          ])
        ),
      }
    })
  }

  async runAgenticLoop(
    provider: AIProvider,
    context: AIContext,
    bot: Bot,
    conversationId: string,
    toolLayer: ToolExecutionLayer
  ): Promise<Result<AgenticResult>> {
    // Pre-load HTTP integrations for dynamic tool execution
    const httpIntegrations = await this.loadHttpIntegrations(bot.id)
    const httpIntegrationMap = new Map(
      httpIntegrations.map((i) => {
        const cfg = i.config as { tool_name: string }
        return [`http_${cfg.tool_name}`, i]
      })
    )

    let currentContext = context
    let iterations = 0

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++

      let response
      try {
        response = await provider.generateResponse(currentContext)
      } catch (cause) {
        return err(cause instanceof Error ? cause : new Error(String(cause)))
      }

      if (!response.toolCalls || response.toolCalls.length === 0) {
        const content = response.content ?? ''
        const { data: msg } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content,
            tokens_used: response.tokensUsed,
          })
          .select('id')
          .single()

        return ok({ content, messageId: (msg?.id as string) ?? '' })
      }

      // Execute tool calls — HTTP tools handled directly, others via registry
      const toolResults = await Promise.all(
        response.toolCalls.map(async (toolCall) => {
          const httpIntegration = httpIntegrationMap.get(toolCall.name)
          if (httpIntegration) {
            const cfg = httpIntegration.config as unknown as Parameters<typeof executeHttpRequest>[0]
            return executeHttpRequest(cfg, httpIntegration.credentials_encrypted, toolCall.arguments, toolCall.id)
          }
          // Fall back to static tool registry
          const results = await toolLayer.executeAll([toolCall], { botId: bot.id, conversationId })
          return results[0]!
        })
      )

      currentContext = {
        ...currentContext,
        messages: [
          ...currentContext.messages,
          {
            role: 'assistant' as const,
            content: response.content ?? '',
            tool_calls: response.toolCalls,
            tool_call_id: null,
          },
          ...toolResults.map((r) => ({
            role: 'tool' as const,
            content: r.content,
            tool_calls: null,
            tool_call_id: r.tool_call_id,
          })),
        ],
      }
    }

    return err(new Error('Max tool iterations reached'))
  }
}
