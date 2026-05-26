import type { ToolCall } from './tool.js'

export type ConversationStatus = 'active' | 'closed' | 'archived'
export type ConversationChannel = 'whatsapp' | 'telegram' | 'instagram' | 'webchat'
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface Conversation {
  id: string
  bot_id: string
  user_phone: string
  user_name: string | null
  channel: ConversationChannel
  status: ConversationStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  tool_calls: ToolCall[] | null
  tool_call_id: string | null
  tokens_used: number | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface IncomingMessage {
  botId: string
  userPhone: string
  userName?: string
  content: string
  channel: ConversationChannel
  metadata?: Record<string, unknown>
}

export interface OutgoingMessage {
  content: string
  conversationId: string
  messageId: string
}
