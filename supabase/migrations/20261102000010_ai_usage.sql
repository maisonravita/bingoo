-- Coût IA : chaque appel est mesuré (jetons, recherches web, coût en euros), imputé à un espace et à une fonction.
create table if not exists public.ai_usage (
  id bigserial primary key,
  at timestamptz not null default now(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  feature text not null default 'autre',
  model text not null default '',
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  searches int not null default 0,
  cost_eur numeric(10,5) not null default 0
);
create index if not exists ai_usage_ws_at on public.ai_usage (workspace_id, at desc);
create index if not exists ai_usage_at on public.ai_usage (at desc);
alter table public.ai_usage enable row level security;
-- Les membres voient la consommation de leur espace (lecture seule) ; l'écriture est réservée au serveur
drop policy if exists ai_usage_read on public.ai_usage;
create policy ai_usage_read on public.ai_usage for select using (workspace_id in (select workspace_id from public.members where user_id = auth.uid()));
alter table public.workspaces add column if not exists ai_budget_eur numeric(8,2);

-- Somme dépensée (espace depuis une date, ou toute la plateforme si p_ws est nul)
create or replace function public.ai_spent(p_ws uuid, p_since timestamptz) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(cost_eur), 0) from public.ai_usage where at >= p_since and (p_ws is null or workspace_id = p_ws);
$$;
revoke all on function public.ai_spent(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.ai_spent(uuid, timestamptz) to service_role;

-- Vue d'ensemble pour l'administrateur : coût du mois par espace et par fonction
create or replace function public.ai_overview(p_since timestamptz default date_trunc('month', now())) returns table(workspace_id uuid, name text, plan text, budget numeric, spent numeric, calls bigint, top jsonb)
language sql stable security definer set search_path = public as $$
  with u as (select * from public.ai_usage where at >= p_since),
  f as (select workspace_id, feature, sum(cost_eur) c from u group by 1, 2)
  select w.id, coalesce(w.name, 'Plateforme (non imputé)'), w.plan, w.ai_budget_eur, coalesce(sum(u.cost_eur), 0), count(u.id),
    (select jsonb_object_agg(feature, round(c, 3)) from (select feature, c from f where f.workspace_id is not distinct from d.workspace_id order by c desc limit 6) x)
  from (select distinct workspace_id from u) d left join public.workspaces w on w.id = d.workspace_id
  left join u on u.workspace_id is not distinct from d.workspace_id
  where public.is_admin()
  group by d.workspace_id, w.id, w.name, w.plan, w.ai_budget_eur order by 5 desc;
$$;
grant execute on function public.ai_overview(timestamptz) to authenticated;

-- Pour l'espace : dépense du mois et budget (budget propre, sinon celui de l'offre)
create or replace function public.ai_month(p_ws uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.members where workspace_id = p_ws and user_id = auth.uid()) then jsonb_build_object(
    'spent', (select coalesce(sum(cost_eur), 0) from public.ai_usage where workspace_id = p_ws and at >= date_trunc('month', now())),
    'budget', (select coalesce(ai_budget_eur, case plan when 'solo' then 14 when 'pro' then 26 when 'equipe' then 50 when 'fondateur' then 15 else 4 end) from public.workspaces where id = p_ws),
    'by', (select coalesce(jsonb_object_agg(f, c), '{}'::jsonb) from (select split_part(feature, '/', 1) || '/' || split_part(feature, '/', 2) f, round(sum(cost_eur), 2) c from public.ai_usage where workspace_id = p_ws and at >= date_trunc('month', now()) group by 1 order by 2 desc limit 8) x)
  ) end;
$$;
grant execute on function public.ai_month(uuid) to authenticated;
