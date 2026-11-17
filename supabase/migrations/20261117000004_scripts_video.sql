-- Scripts de vidéos prêts à tourner (10 par lot, 40 par mois en formule Lancer), lus et écrits par la fonction r uniquement.
create table if not exists public.saas_scripts (app_id uuid primary key references public.saas_apps(id) on delete cascade, workspace_id uuid not null, scripts jsonb not null default '[]', at timestamptz not null default now());
alter table public.saas_scripts enable row level security;
