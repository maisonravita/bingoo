-- Nouveaux prix (59 / 129 / 249 €) : enveloppes IA ajustées (11 / 24 / 46 €)
create or replace function public.ai_month(p_ws uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.members where workspace_id = p_ws and user_id = auth.uid()) then jsonb_build_object(
    'spent', (select coalesce(sum(cost_eur), 0) from public.ai_usage where workspace_id = p_ws and at >= date_trunc('month', now())),
    'budget', (select coalesce(ai_budget_eur, case plan when 'solo' then 11 when 'pro' then 24 when 'equipe' then 46 when 'fondateur' then 15 else 4 end) from public.workspaces where id = p_ws),
    'by', (select coalesce(jsonb_object_agg(f, c), '{}'::jsonb) from (select split_part(feature, '/', 1) || '/' || split_part(feature, '/', 2) f, round(sum(cost_eur), 2) c from public.ai_usage where workspace_id = p_ws and at >= date_trunc('month', now()) group by 1 order by 2 desc limit 8) x)
  ) end;
$$;
