# CLOUD AI — Project Context

## What is this project

Cloud AI is a **private internal platform** to administrate and execute conversational AI bots connected initially to WhatsApp via Kapso. It is NOT a SaaS product for end customers — the administrator sells the bot as a service, not the platform itself.

## Core principle

**Never hardcode client logic.** Everything must be a reusable runtime:
- Bots are configurable instances, not custom code.
- Tools, connectors, and AI providers are modular and reusable.
- Creating a new bot for a client = configure, not develop.

## Architecture flow

```
WhatsApp User → Kapso → Webhook → Cloud AI API Gateway
  → Bot Runtime Engine → AI Orchestrator → Tool Execution Layer
  → Connectors / External APIs → Response → Kapso → User
```

## Stack

| Layer      | Tech                                              |
|------------|---------------------------------------------------|
| Frontend   | React, TypeScript, Vite, TailwindCSS, shadcn/ui, React Query, Zustand |
| Backend    | Node.js, TypeScript, Fastify                      |
| Database   | Supabase (PostgreSQL, Auth, Storage, Realtime)    |
| AI initial | DeepSeek via abstract AIProvider interface        |
| Future AI  | OpenAI, Claude, Gemini, Kimi, Ollama              |

## Monorepo structure

```
Cloud_AI/
├── apps/
│   ├── frontend/          # Admin panel SPA
│   └── backend/           # API + Bot Runtime
├── packages/
│   └── shared/            # Shared TypeScript types
├── supabase/
│   └── migrations/        # SQL migrations
└── docs/
    ├── architecture.md
    └── roadmap.md
```

## Backend module layout (`apps/backend/src/`)

```
api/
  routes/          # Fastify route handlers
  middleware/      # Auth, rate limiting, validation
core/
  bot-runtime/     # BotRuntime — orchestrates a message flow
  ai-orchestrator/ # Builds context, manages memory, calls AI
  tool-execution/  # Executes tools, retries, logs
  connector/       # Connector registry + base class
providers/         # AI provider abstraction
  base.ts          # AIProvider interface
  deepseek.ts      # DeepSeek implementation
tools/             # Tool registry & definitions
connectors/        # Integration connectors (Gmail, GDrive, etc.)
db/
  supabase.ts      # Supabase client
  queries/         # DB query helpers
types/             # TypeScript types (re-exported from shared)
config/            # Env + app config
```

## AI Provider interface (NEVER hardcode the model)

```typescript
interface AIProvider {
  name: string
  generateResponse(context: AIContext): Promise<AIResponse>
  generateWithTools(context: AIContext, tools: ToolDefinition[]): Promise<AIResponse>
}
```

Each bot stores `{ provider: "deepseek", model: "deepseek-chat" }`. The runtime resolves the correct provider at execution time.

## Key API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/bots/:botId/message` | Receive message (Kapso webhook) |
| GET/POST | `/api/v1/bots` | List / create bots |
| GET/PUT/DELETE | `/api/v1/bots/:id` | Manage bot |
| GET/POST | `/api/v1/bots/:botId/integrations` | Bot integrations |
| GET | `/api/v1/conversations/:id` | Conversation detail |
| GET | `/api/v1/conversations/:id/messages` | Message history |

## Supabase tables

- `clients` — client accounts
- `bots` — bot instances per client
- `integrations` — connector configs per bot (credentials encrypted)
- `knowledge_sources` — knowledge per bot
- `conversations` — conversation sessions
- `messages` — message history
- `tool_logs` — tool execution audit log

## Kapso responsibility

Kapso ONLY handles: WhatsApp channel, send/receive messages, basic buttons/menus, simple flows, routing to webhook.  
Kapso does NOT handle: AI logic, memory, tools, RAG, integrations, workflows.

## Roadmap phases

1. **MVP** — login, dashboard, create bots, prompts, Kapso webhook, DeepSeek, conversation history, logs
2. **Integrations** — HTTP Tool, Gmail, Google Drive, AgendaPro, Tool Registry
3. **Knowledge + RAG** — PDF, embeddings, semantic search, pgvector
4. **Automation** — workflows, events, chaining, multi-agent
5. **Omnichannel** — Telegram, Instagram, Webchat, Discord
6. **Voice AI** — calls, STT, TTS, streaming

## Current phase: FASE 1 — MVP

## Development conventions

- All TypeScript, strict mode.
- Backend: Fastify with typed schemas (Zod for validation).
- Frontend: React Query for server state, Zustand for client state.
- No magic strings — use enums/constants for statuses, types, providers.
- Env variables via `config/` module, never `process.env` scattered.
- Credentials always encrypted before persisting (AES-256 or Supabase Vault).
- Every tool execution must be logged to `tool_logs`.
- Use `Result<T, E>` pattern for error handling in the runtime, not throws.
