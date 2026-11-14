-- Crédits Bingoo! : achetés par packs (Stripe), dépensés pour une modification en plus, un autre SaaS, une vidéo pub.
create table if not exists public.credits (
  id bigserial primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  delta integer not null,
  motif text not null,
  ref text unique,
  at timestamptz not null default now()
);
create index if not exists credits_ws on public.credits(workspace_id, at desc);
alter table public.credits enable row level security;

create or replace function public.credits_solde(p_ws uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from credits where workspace_id = p_ws
$$;

-- Dépense atomique : refusée (false) si le solde ne suffit pas
create or replace function public.credits_depenser(p_ws uuid, p_n integer, p_motif text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('credits:' || p_ws::text));
  if (select coalesce(sum(delta), 0) from credits where workspace_id = p_ws) < p_n then return false; end if;
  insert into credits(workspace_id, delta, motif) values (p_ws, -p_n, p_motif);
  return true;
end $$;
revoke all on function public.credits_solde(uuid) from public, anon, authenticated;
revoke all on function public.credits_depenser(uuid, integer, text) from public, anon, authenticated;

-- Vidéos pub générées (le scénario ; la vidéo est rendue dans le navigateur, autant de fois que voulu)
create table if not exists public.saas_videos (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.saas_apps(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  format text not null default 'vertical',
  script jsonb not null,
  at timestamptz not null default now()
);
create index if not exists saas_videos_app on public.saas_videos(app_id, at desc);
alter table public.saas_videos enable row level security;
