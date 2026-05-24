export type IntegrationType =
  | 'gmail'
  | 'google_drive'
  | 'agendapro'
  | 'salesforce'
  | 'hubspot'
  | 'shopify'
  | 'notion'
  | 'http_request'

export type IntegrationStatus = 'active' | 'inactive' | 'error'

export interface Integration {
  id: string
  bot_id: string
  type: IntegrationType
  name: string
  status: IntegrationStatus
  config: Record<string, unknown>
  // credentials_encrypted is never sent to the client
  created_at: string
  updated_at: string
}

export interface CreateIntegrationInput {
  bot_id: string
  type: IntegrationType
  name: string
  config: Record<string, unknown>
  credentials: Record<string, unknown>
}
