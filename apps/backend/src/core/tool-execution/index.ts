import type { ToolCall, ToolResult } from '@cloud-ai/shared'
import { supabase } from '../../db/supabase.js'
import { getTool, type ToolContext } from '../../tools/registry.js'

const TOOL_TIMEOUT_MS = 30_000

export class ToolExecutionLayer {
  async executeAll(
    toolCalls: ToolCall[],
    context: ToolContext
  ): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map((tc) => this.executeSingle(tc, context)))
  }

  private async executeSingle(
    toolCall: ToolCall,
    context: ToolContext
  ): Promise<ToolResult> {
    const startedAt = Date.now()
    const tool = getTool(toolCall.name)

    if (!tool) {
      await this.logExecution(context, toolCall, null, 'error', Date.now() - startedAt, `Tool not found: ${toolCall.name}`)
      return {
        tool_call_id: toolCall.id,
        content: `Error: tool "${toolCall.name}" is not registered.`,
        isError: true,
      }
    }

    try {
      const result = await Promise.race([
        tool.handler(toolCall.arguments, context),
        new Promise<ToolResult>((_, reject) =>
          setTimeout(() => reject(new Error('Tool execution timeout')), TOOL_TIMEOUT_MS)
        ),
      ])

      await this.logExecution(
        context,
        toolCall,
        result.content,
        result.isError ? 'error' : 'success',
        Date.now() - startedAt,
        null
      )

      return result
    } catch (cause) {
      const errorMessage = cause instanceof Error ? cause.message : String(cause)
      const latency = Date.now() - startedAt

      await this.logExecution(context, toolCall, null, 'error', latency, errorMessage)

      return {
        tool_call_id: toolCall.id,
        content: `Error executing tool "${toolCall.name}": ${errorMessage}`,
        isError: true,
      }
    }
  }

  private async logExecution(
    context: ToolContext,
    toolCall: ToolCall,
    result: unknown,
    status: 'success' | 'error' | 'timeout',
    latencyMs: number,
    errorMessage: string | null
  ): Promise<void> {
    await supabase.from('tool_logs').insert({
      bot_id: context.botId,
      conversation_id: context.conversationId,
      tool_name: toolCall.name,
      arguments: toolCall.arguments,
      result,
      status,
      latency_ms: latencyMs,
      error_message: errorMessage,
    })
  }
}
