import type { ToolDefinition, ToolResult } from '@cloud-ai/shared'

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext
) => Promise<ToolResult>

export interface ToolContext {
  botId: string
  conversationId: string
  integrationConfig?: Record<string, unknown>
}

export interface RegisteredTool {
  definition: ToolDefinition
  handler: ToolHandler
  integrationRequired?: string
}

const tools = new Map<string, RegisteredTool>()

export function registerTool(name: string, tool: RegisteredTool): void {
  tools.set(name, tool)
}

export function getTool(name: string): RegisteredTool | undefined {
  return tools.get(name)
}

export function getAllTools(): RegisteredTool[] {
  return Array.from(tools.values())
}

export function getToolDefinitions(): ToolDefinition[] {
  return Array.from(tools.values()).map((t) => t.definition)
}
