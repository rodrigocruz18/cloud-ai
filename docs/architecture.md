# Cloud AI — Architecture

## Message Flow

```
WhatsApp User
    ↓
Kapso (channel layer)
    ↓ POST /api/v1/bots/{botId}/message
API Gateway (Fastify)
    ↓ verify webhook_secret
BotRuntime.processMessage()
    ├── loadBot()              — fetch bot config from Supabase
    ├── resolveConversation()  — find or create conversation
    ├── persistMessage()       — save user message
    ├── AIOrchestrator.buildContext()
    │     ├── load message history (last 50 msgs)
    │     └── load tool definitions
    └── AIOrchestrator.runAgenticLoop()
          ├── provider.generateResponse()   — call DeepSeek/OpenAI/etc
          ├── if tool_calls → ToolExecutionLayer.executeAll()
          │     ├── getTool() from registry
          │     ├── execute with timeout
          │     └── log to tool_logs
          └── repeat until no tool_calls or max iterations
    ↓
Response → Kapso → WhatsApp User
```

## AI Provider Pattern

All AI calls go through the `AIProvider` interface:

```typescript
interface AIProvider {
  name: string
  generateResponse(context: AIContext): Promise<AIResponse>
}
```

The `providerRegistry` maps `AIProviderName → AIProvider`.  
Each bot stores `{ provider, model }` and the runtime resolves at execution time.

## Tool System

Tools are registered globally:

```typescript
registerTool('gmail.send_email', {
  definition: { name, description, parameters },
  handler: async (args, context) => { ... },
  integrationRequired: 'gmail',
})
```

The AI Orchestrator fetches all tool definitions and passes them to the AI.  
When the AI returns tool_calls, the ToolExecutionLayer executes them.

## Data Model

See `supabase/migrations/001_initial_schema.sql` for the full schema.

Key relationships:
- `clients` → has many `bots`
- `bots` → has many `integrations`, `knowledge_sources`, `conversations`
- `conversations` → has many `messages`
- `bots` → has many `tool_logs`
