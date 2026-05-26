-- Add content column to knowledge_sources for direct text/scraped storage
alter table knowledge_sources add column if not exists content text;
