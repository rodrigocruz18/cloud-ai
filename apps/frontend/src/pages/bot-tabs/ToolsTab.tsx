import type { Bot } from '@cloud-ai/shared'
import { HttpRequestConfigurator } from './tools/HttpRequestConfigurator'

export function ToolsTab({ bot }: { bot: Bot }) {
  return <HttpRequestConfigurator bot={bot} />
}
