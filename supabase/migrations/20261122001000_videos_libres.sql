-- Appliquée via MCP le 2026-11-22 : vidéos en motion design sans SaaS (produit « Vidéo » ouvert à tous)
alter table saas_videos alter column app_id drop not null;
alter table saas_videos add column if not exists texte text;
create index if not exists saas_videos_libres_idx on saas_videos (workspace_id, at desc) where app_id is null;
