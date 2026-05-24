import type { AIProviderName } from '@cloud-ai/shared'
import type { AIProvider } from './base.js'
import { DeepSeekProvider } from './deepseek.js'

const providers = new Map<AIProviderName, AIProvider>([
  ['deepseek', new DeepSeekProvider()],
])

export function getProvider(name: AIProviderName): AIProvider {
  const provider = providers.get(name)
  if (!provider) throw new Error(`AI provider not registered: ${name}`)
  return provider
}

export function registerProvider(name: AIProviderName, provider: AIProvider): void {
  providers.set(name, provider)
}
