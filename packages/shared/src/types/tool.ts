export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required?: boolean
  enum?: string[]
  properties?: Record<string, ToolParameter>
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, ToolParameter>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResult {
  tool_call_id: string
  content: string
  isError: boolean
}

export type ToolExecutionStatus = 'success' | 'error' | 'timeout'

export interface ToolLog {
  id: string
  bot_id: string
  conversation_id: string
  tool_name: string
  arguments: Record<string, unknown>
  result: unknown
  status: ToolExecutionStatus
  latency_ms: number
  error_message: string | null
  created_at: string
}
