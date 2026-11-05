-- Notifications sur le téléphone : un abonnement par appareil (navigateur ou appli installée) et par espace.
-- Lu et écrit seulement par les fonctions (clé de service) ; aucun accès direct depuis le navigateur.
create table if not exists public.push_subs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  appareil text,
  created_at timestamptz not null default now(),
  unique (workspace_id, endpoint)
);
alter table public.push_subs enable row level security;
create index if not exists push_subs_ws on public.push_subs (workspace_id);

-- Ce que Bingoo! apprend des résultats de l'espace (calcul statistique, sans IA) : { calcule_at, contactes, positifs, base, assez, facteurs[] }
alter table public.workspaces add column if not exists appris jsonb;
