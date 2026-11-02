-- Recharges IA : le client achète du travail IA en plus quand son enveloppe du mois est utilisée.
-- Les recharges ne périment pas : elles sont consommées seulement au-delà de l'enveloppe mensuelle.
create table if not exists public.ai_topups (
  id bigserial primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  at timestamptz not null default now(),
  pack text not null,
  paid_eur numeric(8,2) not null,
  credit_eur numeric(8,2) not null,
  stripe_session text unique
);
create index if not exists ai_topups_ws on public.ai_topups (workspace_id, at);
alter table public.ai_topups enable row level security;
drop policy if exists ai_topups_read on public.ai_topups;
create policy ai_topups_read on public.ai_topups for select using (workspace_id in (select workspace_id from public.members where user_id = auth.uid()));

-- Enveloppe mensuelle d'un espace (réglage propre, sinon celle de l'offre)
create or replace function public.ai_envelope(p_ws uuid) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(ai_budget_eur, case plan when 'solo' then 11 when 'pro' then 24 when 'equipe' then 46 when 'fondateur' then 15 else 4 end) from public.workspaces where id = p_ws;
$$;

-- Solde des recharges : achats − dépassements de l'enveloppe, mois par mois, depuis la première recharge
create or replace function public.ai_balance(p_ws uuid) returns numeric language sql stable security definer set search_path = public as $$
  with t as (select coalesce(sum(credit_eur), 0) bought, min(at) first from public.ai_topups where workspace_id = p_ws),
  m as (select date_trunc('month', at) mo, sum(cost_eur) spent from public.ai_usage, t where workspace_id = p_ws and t.first is not null and at >= date_trunc('month', t.first) group by 1)
  select greatest(0, (select bought from t) - coalesce((select sum(greatest(0, spent - public.ai_envelope(p_ws))) from m), 0));
$$;
revoke all on function public.ai_envelope(uuid) from public, anon, authenticated;
revoke all on function public.ai_balance(uuid) from public, anon, authenticated;
grant execute on function public.ai_envelope(uuid) to service_role;
grant execute on function public.ai_balance(uuid) to service_role;

create or replace function public.ai_month(p_ws uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.members where workspace_id = p_ws and user_id = auth.uid()) then jsonb_build_object(
    'spent', (select coalesce(sum(cost_eur), 0) from public.ai_usage where workspace_id = p_ws and at >= date_trunc('month', now())),
    'budget', public.ai_envelope(p_ws),
    'balance', public.ai_balance(p_ws),
    'by', (select coalesce(jsonb_object_agg(f, c), '{}'::jsonb) from (select split_part(feature, '/', 1) || '/' || split_part(feature, '/', 2) f, round(sum(cost_eur), 2) c from public.ai_usage where workspace_id = p_ws and at >= date_trunc('month', now()) group by 1 order by 2 desc limit 8) x)
  ) end;
$$;
