import type { Message } from './conversation.js'
import type { ToolDefinition, ToolCall } from './tool.js'

export interface AIContext {
  systemPrompt: string
  messages: Pick<Message, 'role' | 'content' | 'tool_calls' | 'tool_call_id'>[]
  tools?: ToolDefinition[]
  temperature?: number
  maxTokens?: number
}

export interface AIResponse {
  content: string | null
  toolCalls: ToolCall[] | null
  tokensUsed: number
  model: string
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error'
}
