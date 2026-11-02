-- Radar étape 2 : le marché public de ton secteur (contrats attribués, titulaires, montants, échéances)
create table if not exists public.public_contracts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  buyer_id text, buyer_name text,
  holder_id text, holder_name text,
  objet text not null default '',
  montant numeric,
  notified date,
  duree_mois int,
  fin date,
  dept text,
  procedure text,
  relevant boolean,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);
create index if not exists public_contracts_fin on public.public_contracts (workspace_id, fin);
create index if not exists public_contracts_buyer on public.public_contracts (workspace_id, buyer_id);
alter table public.public_contracts enable row level security;
drop policy if exists public_contracts_read on public.public_contracts;
create policy public_contracts_read on public.public_contracts for select using (workspace_id in (select workspace_id from public.members where user_id = auth.uid()));

-- Noms officiels (registre) mis en cache : acheteurs et titulaires
create table if not exists public.company_names (
  siren text primary key,
  nom text not null,
  naf text, ville text,
  updated_at timestamptz not null default now()
);
alter table public.company_names enable row level security;
drop policy if exists company_names_read on public.company_names;
create policy company_names_read on public.company_names for select using (auth.role() = 'authenticated');

alter table public.workspaces add column if not exists market_at timestamptz;
-- Mise à jour du marché : un espace toutes les 2 heures (chacun une fois par semaine), puis les noms manquants
select cron.schedule('kairo-marche-public', '20 */2 * * *', $$select net.http_post(url:='https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/r/market-cron', headers:=jsonb_build_object('content-type','application/json','x-cron-key',(select value from public.app_secrets where name='cron_key')), body:='{}'::jsonb, timeout_milliseconds:=150000)$$);
