export type KnowledgeSourceType = 'text' | 'pdf' | 'docx' | 'url' | 'google_drive'
export type KnowledgeSourceStatus = 'pending' | 'processing' | 'ready' | 'error'

export interface KnowledgeSource {
  id: string
  bot_id: string
  type: KnowledgeSourceType
  name: string
  status: KnowledgeSourceStatus
  config: Record<string, unknown>
  error_message: string | null
  created_at: string
  updated_at: string
}
