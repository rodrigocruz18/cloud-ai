export type KnowledgeSourceType = 'text' | 'url'
export type KnowledgeSourceStatus = 'pending' | 'processing' | 'ready' | 'error'

export interface KnowledgeSource {
  id: string
  bot_id: string
  type: KnowledgeSourceType
  name: string
  status: KnowledgeSourceStatus
  content: string | null
  config: Record<string, unknown>
  error_message: string | null
  created_at: string
  updated_at: string
}
