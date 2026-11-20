-- Site web : demandes et inscriptions reçues avant que le gérant ait créé son accès (rattachées à son espace à la création)
create table if not exists public.saas_app_attente (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.saas_apps(id) on delete cascade,
  col text not null,
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists saas_app_attente_app on public.saas_app_attente(app_id, col, at);
alter table public.saas_app_attente enable row level security;
