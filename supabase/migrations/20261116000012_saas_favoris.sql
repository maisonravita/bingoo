-- Favoris : SaaS et applis mis de côté par un espace (cœur partout dans l'Explorer, page « Mes favoris »)
create table if not exists public.saas_favoris (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  saas_id uuid references public.saas(id) on delete cascade,
  mobile_id bigint references public.saas_mobiles(id) on delete cascade,
  created_at timestamptz default now(),
  check ((saas_id is null) <> (mobile_id is null))
);
create unique index if not exists saas_favoris_saas_uniq on public.saas_favoris (workspace_id, saas_id) where saas_id is not null;
create unique index if not exists saas_favoris_mobile_uniq on public.saas_favoris (workspace_id, mobile_id) where mobile_id is not null;
create index if not exists saas_favoris_saas_idx on public.saas_favoris (saas_id);
create index if not exists saas_favoris_mobile_idx on public.saas_favoris (mobile_id);
alter table public.saas_favoris enable row level security;
create policy saas_favoris_membres on public.saas_favoris for all using (is_member(workspace_id)) with check (is_member(workspace_id));
-- saas_favoris_liste(ws) : security definer, authenticated (texte complet dans la base)
