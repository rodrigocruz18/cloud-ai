import type { AIContext, AIResponse, ToolCall } from '@cloud-ai/shared'
import { config } from '../config/index.js'
import { AIProviderError, type AIProvider } from './base.js'

interface DeepSeekMessage {
  role: string
  content: string | null
  tool_calls?: DeepSeekToolCall[]
  tool_call_id?: string
}

interface DeepSeekToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface DeepSeekResponse {
  id: string
  choices: Array<{
    finish_reason: string
    message: DeepSeekMessage
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model: string
}

export class DeepSeekProvider implements AIProvider {
  readonly name = 'deepseek'

  async generateResponse(context: AIContext): Promise<AIResponse> {
    const messages: DeepSeekMessage[] = [
      { role: 'system', content: context.systemPrompt },
      ...context.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls as unknown as DeepSeekToolCall[] } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
    ]

    const tools =
      context.tools && context.tools.length > 0
        ? context.tools.map((t) => ({
            type: 'function' as const,
            function: {
              name: t.name,
              description: t.description,
              parameters: {
                type: 'object',
                properties: t.parameters,
                required: Object.entries(t.parameters)
                  .filter(([, v]) => v.required)
                  .map(([k]) => k),
              },
            },
          }))
        : undefined

    let response: Response
    try {
      response = await fetch(`${config.ai.deepseek.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.ai.deepseek.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          tools,
          temperature: context.temperature ?? 0.7,
          max_tokens: context.maxTokens ?? 2048,
        }),
      })
    } catch (cause) {
      throw new AIProviderError(this.name, 'Network error calling DeepSeek API', cause)
    }

    if (!response.ok) {
      const body = await response.text()
      throw new AIProviderError(this.name, `API error ${response.status}: ${body}`)
    }

    const data = (await response.json()) as DeepSeekResponse
    const choice = data.choices[0]
    if (!choice) throw new AIProviderError(this.name, 'Empty response from API')

    const toolCalls: ToolCall[] | null =
      choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      })) ?? null

    const finishReason = choice.finish_reason === 'tool_calls' ? 'tool_calls'
      : choice.finish_reason === 'length' ? 'length'
      : 'stop'

    return {
      content: choice.message.content,
      toolCalls,
      tokensUsed: data.usage.total_tokens,
      model: data.model,
      finishReason,
    }
  }
}
