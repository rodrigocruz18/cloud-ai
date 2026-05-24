import type { AIContext, AIResponse } from '@cloud-ai/shared'

export interface AIProvider {
  readonly name: string
  generateResponse(context: AIContext): Promise<AIResponse>
}

export class AIProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(`[${provider}] ${message}`)
    this.name = 'AIProviderError'
  }
}
