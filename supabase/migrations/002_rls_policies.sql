-- Migration 002 — Row Level Security
-- The backend uses the service role key which bypasses RLS.
-- These policies protect direct client access (Supabase JS SDK from browser).

alter table clients enable row level security;
alter table bots enable row level security;
alter table integrations enable row level security;
alter table knowledge_sources enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table tool_logs enable row level security;

-- Service role bypasses all policies automatically.
-- No additional policies needed for the backend.
-- If we ever expose a client-side Supabase connection, add scoped policies here.
