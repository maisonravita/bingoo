-- Kairo Intelligence : apprentissages tirés des réponses, RDV et devis
alter table public.workspaces add column if not exists intelligence jsonb, add column if not exists intelligence_at timestamptz;
