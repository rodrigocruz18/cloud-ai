# Cloud AI — Roadmap

## FASE 1 — MVP (current)
- [x] Project scaffold (monorepo, TS, Fastify, React)
- [x] Supabase schema (clients, bots, conversations, messages, tool_logs)
- [x] AI Provider abstraction + DeepSeek implementation
- [x] Bot Runtime Engine (message flow + agentic loop)
- [x] Tool Registry + Tool Execution Layer
- [x] API Gateway (bots CRUD, conversations, message webhook)
- [x] Admin panel (login, dashboard, bots list, conversation viewer)
- [ ] Supabase Auth integration (admin user)
- [ ] Deploy to production (Railway / Fly.io)

## FASE 2 — Integrations
- [ ] HTTP Request Tool (generic)
- [ ] Gmail connector (send, search)
- [ ] Google Drive connector (search, read docs)
- [ ] AgendaPro connector
- [ ] Connector credential UI in admin panel

## FASE 3 — Knowledge + RAG
- [ ] Enable pgvector in Supabase
- [ ] PDF/DOCX ingestion + chunking
- [ ] Text embedding (OpenAI embeddings or DeepSeek)
- [ ] Semantic search tool
- [ ] RAG integration in AI context

## FASE 4 — Automation
- [ ] Workflow engine (trigger → steps → actions)
- [ ] Event-based triggers
- [ ] Multi-agent chaining
- [ ] Scheduled jobs

## FASE 5 — Omnichannel
- [ ] Telegram connector
- [ ] Instagram connector
- [ ] Webchat widget
- [ ] Discord connector

## FASE 6 — Voice AI
- [ ] Phone call integration
- [ ] STT (speech to text)
- [ ] TTS (text to speech)
- [ ] Real-time audio streaming
