-- Seed data for development
-- Run after migrations

-- Insert a default client
insert into clients (id, name, email) values
  ('00000000-0000-0000-0000-000000000001', 'Cliente Demo', 'demo@empresa.cl');

-- Insert a demo bot
insert into bots (client_id, name, description, prompt, provider, model, temperature, status, webhook_secret)
values (
  '00000000-0000-0000-0000-000000000001',
  'Bot Demo',
  'Bot de demostración para pruebas',
  'Eres un asistente amable y útil. Responde siempre en español de forma concisa.',
  'deepseek',
  'deepseek-chat',
  0.7,
  'active',
  'demo-webhook-secret-change-in-production'
);
