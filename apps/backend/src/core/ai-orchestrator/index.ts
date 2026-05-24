import type { Bot, AIContext, Message, Result } from '@cloud-ai/shared'
import { ok, err } from '@cloud-ai/shared'
import { supabase } from '../../db/supabase.js'
import type { AIProvider } from '../../providers/base.js'
import { getToolDefinitions } from '../../tools/registry.js'
import type { ToolExecutionLayer } from '../tool-execution/index.js'

const MAX_TOOL_ITERATIONS = 10

interface AgenticResult {
  content: string
  messageId: string
}

export class AIOrchestrator {
  async buildContext(bot: Bot, conversationId: string): Promise<Result<AIContext>> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('role, content, tool_calls, tool_call_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) return err(new Error('Failed to load message history'))

    const context: AIContext = {
      systemPrompt: bot.prompt,
      messages: (messages ?? []) as Message[],
      tools: getToolDefinitions(),
      temperature: bot.temperature,
      maxTokens: bot.max_tokens ?? undefined,
    }

    return ok(context)
  }

  async runAgenticLoop(
    provider: AIProvider,
    context: AIContext,
    bot: Bot,
    conversationId: string,
    toolLayer: ToolExecutionLayer
  ): Promise<Result<AgenticResult>> {
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

      // No tool calls — we have the final answer
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

      // Execute tool calls
      const toolResults = await toolLayer.executeAll(
        response.toolCalls,
        { botId: bot.id, conversationId }
      )

      // Append assistant tool-call turn + tool results to context
      currentContext = {
        ...currentContext,
        messages: [
          ...currentContext.messages,
          {
            role: 'assistant',
            content: response.content,
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
