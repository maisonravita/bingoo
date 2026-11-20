-- 20 nov. 2026 : page Admin → « Crédit IA » : ce qui reste sur le compte Anthropic, ce qui a été consommé (par jour, par fonction),
-- et la saisie d'une recharge (au lieu de modifier app_secrets à la main).
create or replace function public.admin_ia_credit()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_credit numeric; v_depuis timestamptz; v_reel numeric; v_epuise timestamptz;
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  select nullif(value, '')::numeric into v_credit from app_secrets where name = 'ia_credit_eur';
  select nullif(value, '')::timestamptz into v_depuis from app_secrets where name = 'ia_credit_depuis';
  select nullif(value, '')::timestamptz into v_epuise from app_secrets where name = 'ia_credit_epuise_at';
  select coalesce(sum(cost_eur), 0) into v_reel from ai_usage where at >= coalesce(v_depuis, now());
  return jsonb_build_object(
    'credit', v_credit, 'depuis', v_depuis,
    'depense_reelle', round(v_reel, 2), 'depense_compteur', round(v_reel * 1.3, 2),
    'restant_compteur', round(coalesce(v_credit, 0) - v_reel * 1.3, 2), 'restant_reel', round(coalesce(v_credit, 0) - v_reel, 2),
    'epuise', v_epuise is not null and v_depuis is not null and v_epuise > v_depuis,
    'aujourdhui', (select round(coalesce(sum(cost_eur), 0), 2) from ai_usage where at >= date_trunc('day', now())),
    'plafond_jour', (select nullif(value, '')::numeric from app_secrets where name = 'ia_plafond_jour'),
    'reserve', (select nullif(value, '')::numeric from app_secrets where name = 'ia_reserve_eur'),
    'sans_limite', coalesce((select value = '1' from app_secrets where name = 'ia_sans_limite'), false),
    'par_jour', (select coalesce(jsonb_agg(jsonb_build_object('jour', j, 'eur', round(c, 2)) order by j), '[]') from (
        select date_trunc('day', at)::date j, sum(cost_eur) c from ai_usage where at >= date_trunc('day', now()) - interval '13 days' group by 1) x),
    'par_fonction', (select coalesce(jsonb_agg(jsonb_build_object('fonction', f, 'eur', round(c, 2), 'appels', n) order by c desc), '[]') from (
        select coalesce(feature, '?') f, sum(cost_eur) c, count(*) n from ai_usage where at >= coalesce(v_depuis, date_trunc('day', now())) group by 1 order by 2 desc limit 12) y),
    'par_client', (select coalesce(jsonb_agg(jsonb_build_object('nom', coalesce(w.name, 'Plateforme'), 'eur', round(c, 2)) order by c desc), '[]') from (
        select workspace_id, sum(cost_eur) c from ai_usage where at >= coalesce(v_depuis, date_trunc('day', now())) group by 1 order by 2 desc limit 8) z
        left join workspaces w on w.id = z.workspace_id)
  );
end $$;

-- Recharge saisie par Jean : montant DISPONIBLE maintenant sur le compte Anthropic (le compteur repart de là)
create or replace function public.admin_ia_recharge(p_montant numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  if p_montant is null or p_montant <= 0 or p_montant > 10000 then raise exception 'Montant invalide'; end if;
  insert into app_secrets (name, value) values ('ia_credit_eur', round(p_montant, 2)::text) on conflict (name) do update set value = excluded.value;
  insert into app_secrets (name, value) values ('ia_credit_depuis', now()::text) on conflict (name) do update set value = excluded.value;
  delete from app_secrets where name in ('ia_alerte_stop', 'ia_alerte_bas', 'ia_alerte_reserve');
  return public.admin_ia_credit();
end $$;

-- Interrupteur « les clients ne sont jamais bloqués par la pause automatique »
create or replace function public.admin_ia_sans_limite(p_actif boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  insert into app_secrets (name, value) values ('ia_sans_limite', case when p_actif then '1' else '0' end) on conflict (name) do update set value = excluded.value;
  return public.admin_ia_credit();
end $$;

revoke all on function public.admin_ia_credit() from public, anon;
revoke all on function public.admin_ia_recharge(numeric) from public, anon;
revoke all on function public.admin_ia_sans_limite(boolean) from public, anon;
grant execute on function public.admin_ia_credit() to authenticated;
grant execute on function public.admin_ia_recharge(numeric) to authenticated;
grant execute on function public.admin_ia_sans_limite(boolean) to authenticated;
