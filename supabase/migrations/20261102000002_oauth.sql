-- CH02 lot B : jetons de connexion officielle (Google, Microsoft), chiffrés, jamais lisibles par le navigateur
alter table public.workspace_secrets add column if not exists oauth jsonb not null default '{}'::jsonb;
