-- Comparaison entre clients (anonyme) : taux de réponses positives par type de signal.
-- Les chiffres des autres clients ne sont rendus qu'à partir de 3 espaces et 100 envois.
create or replace function public.bench_signaux(p_ws uuid)
returns table(signal text, espaces bigint, envois bigint, positifs bigint, taux numeric, mes_envois bigint, mon_taux numeric, assez boolean)
language sql stable security definer set search_path to 'public' as $$
  with moi as (select 1 where exists (select 1 from members m where m.workspace_id = p_ws and m.user_id = auth.uid())),
  envoyes as (
    select distinct p.id, p.workspace_id, p.signals from prospects p
    join messages m on m.prospect_id = p.id and m.status = 'envoye' and m.step = 0
    join workspaces w on w.id = p.workspace_id
    where w.plan <> 'fondateur' or p.workspace_id = p_ws
  ),
  pos as (select distinct prospect_id from replies where class in ('interesse','question','prix','rappel')),
  lignes as (
    select e.workspace_id, coalesce(s->>'type', 'aucun') as signal, (e.id in (select prospect_id from pos)) as positif
    from envoyes e left join lateral jsonb_array_elements(case when jsonb_typeof(e.signals) = 'array' then e.signals else '[]'::jsonb end) s on true
    where coalesce(s->>'type', 'aucun') not in ('taille', 'reseau')
  ),
  agg as (
    select signal, count(distinct workspace_id) es, count(*) n, count(*) filter (where positif) np,
      count(*) filter (where workspace_id = p_ws) mn, count(*) filter (where positif and workspace_id = p_ws) mp
    from lignes where exists (select 1 from moi) group by signal
  )
  select signal,
    case when es >= 3 and n >= 100 then es end, case when es >= 3 and n >= 100 then n end, case when es >= 3 and n >= 100 then np end,
    case when es >= 3 and n >= 100 then round(100.0 * np / n, 1) end,
    mn, round(100.0 * mp / nullif(mn, 0), 1), es >= 3 and n >= 100
  from agg order by (es >= 3 and n >= 100) desc, mn desc;
$$;
revoke all on function public.bench_signaux(uuid) from public, anon;
grant execute on function public.bench_signaux(uuid) to authenticated;
