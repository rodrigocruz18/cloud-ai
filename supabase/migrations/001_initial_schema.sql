-- Cloud AI — Initial Schema
-- Migration 001

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- CLIENTS
-- ============================================================
create table clients (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  email       text,
  phone       text,
  status      text not null default 'active' check (status in ('active', 'inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- BOTS
-- ============================================================
create table bots (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references clients(id) on delete cascade,
  name            text not null,
  description     text,
  prompt          text not null default '',
  provider        text not null default 'deepseek'
                    check (provider in ('deepseek', 'openai', 'claude', 'gemini', 'ollama')),
  model           text not null default 'deepseek-chat',
  temperature     numeric(3,2) not null default 0.70
                    check (temperature >= 0 and temperature <= 2),
  max_tokens      integer,
  status          text not null default 'draft'
                    check (status in ('active', 'inactive', 'draft')),
  webhook_secret  text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index bots_client_id_idx on bots(client_id);
create index bots_status_idx on bots(status);

-- ============================================================
-- INTEGRATIONS
-- ============================================================
create table integrations (
  id                    uuid primary key default uuid_generate_v4(),
  bot_id                uuid not null references bots(id) on delete cascade,
  type                  text not null
                          check (type in ('gmail','google_drive','agendapro','salesforce',
                                         'hubspot','shopify','notion','http_request')),
  name                  text not null,
  status                text not null default 'inactive'
                          check (status in ('active', 'inactive', 'error')),
  config                jsonb not null default '{}',
  credentials_encrypted text,  -- AES-256-GCM encrypted JSON
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index integrations_bot_id_idx on integrations(bot_id);

-- ============================================================
-- KNOWLEDGE SOURCES
-- ============================================================
create table knowledge_sources (
  id            uuid primary key default uuid_generate_v4(),
  bot_id        uuid not null references bots(id) on delete cascade,
  type          text not null
                  check (type in ('text','pdf','docx','url','google_drive')),
  name          text not null,
  status        text not null default 'pending'
                  check (status in ('pending','processing','ready','error')),
  config        jsonb not null default '{}',
  error_message text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index knowledge_sources_bot_id_idx on knowledge_sources(bot_id);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table conversations (
  id          uuid primary key default uuid_generate_v4(),
  bot_id      uuid not null references bots(id) on delete cascade,
  user_phone  text not null,
  user_name   text,
  channel     text not null default 'whatsapp'
                check (channel in ('whatsapp','telegram','instagram','webchat')),
  status      text not null default 'active'
                check (status in ('active','closed','archived')),
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index conversations_bot_id_idx on conversations(bot_id);
create index conversations_user_phone_idx on conversations(user_phone);
create index conversations_status_idx on conversations(status);
-- For resolving active conversations by user
create index conversations_active_lookup_idx
  on conversations(bot_id, user_phone, status)
  where status = 'active';

-- ============================================================
-- MESSAGES
-- ============================================================
create table messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  role             text not null check (role in ('user','assistant','system','tool')),
  content          text not null default '',
  tool_calls       jsonb,
  tool_call_id     text,
  tokens_used      integer,
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

create index messages_conversation_id_idx on messages(conversation_id);
create index messages_created_at_idx on messages(created_at);

-- ============================================================
-- TOOL LOGS
-- ============================================================
create table tool_logs (
  id               uuid primary key default uuid_generate_v4(),
  bot_id           uuid not null references bots(id) on delete cascade,
  conversation_id  uuid not null references conversations(id) on delete cascade,
  tool_name        text not null,
  arguments        jsonb not null default '{}',
  result           jsonb,
  status           text not null check (status in ('success','error','timeout')),
  latency_ms       integer not null,
  error_message    text,
  created_at       timestamptz not null default now()
);

create index tool_logs_bot_id_idx on tool_logs(bot_id);
create index tool_logs_conversation_id_idx on tool_logs(conversation_id);
create index tool_logs_created_at_idx on tool_logs(created_at);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_updated_at before update on clients
  for each row execute function update_updated_at();

create trigger bots_updated_at before update on bots
  for each row execute function update_updated_at();

create trigger integrations_updated_at before update on integrations
  for each row execute function update_updated_at();

create trigger knowledge_sources_updated_at before update on knowledge_sources
  for each row execute function update_updated_at();

create trigger conversations_updated_at before update on conversations
  for each row execute function update_updated_at();
