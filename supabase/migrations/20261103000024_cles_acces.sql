-- Clés d'accès personnelles (extension Chrome, assistants IA) : seule l'empreinte est gardée
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  name text not null default 'Clé', prefix text not null, key_hash text not null unique,
  created_at timestamptz not null default now(), last_used_at timestamptz, revoked_at timestamptz
);
create index if not exists api_keys_ws on public.api_keys (workspace_id);
alter table public.api_keys enable row level security; -- serveur uniquement
