-- Radar : avancement réel du scan (étapes, heures, comptes), lu par l'écran pendant l'analyse
alter table public.workspaces add column if not exists radar_progress jsonb;
