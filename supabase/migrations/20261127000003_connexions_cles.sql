-- Clés Notion et Airtable des connexions d'un projet (jamais renvoyées au navigateur)
alter table public.saas_app_secrets add column if not exists connexions_cles jsonb;
