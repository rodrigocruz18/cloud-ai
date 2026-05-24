export type AIProviderName = 'deepseek' | 'openai' | 'claude' | 'gemini' | 'ollama'

export type BotStatus = 'active' | 'inactive' | 'draft'

export interface Bot {
  id: string
  client_id: string
  name: string
  description: string | null
  prompt: string
  provider: AIProviderName
  model: string
  temperature: number
  max_tokens: number | null
  status: BotStatus
  webhook_secret: string
  created_at: string
  updated_at: string
}

export interface CreateBotInput {
  client_id: string
  name: string
  description?: string
  prompt: string
  provider?: AIProviderName
  model?: string
  temperature?: number
}

export interface UpdateBotInput {
  name?: string
  description?: string
  prompt?: string
  provider?: AIProviderName
  model?: string
  temperature?: number
  max_tokens?: number
  status?: BotStatus
}
