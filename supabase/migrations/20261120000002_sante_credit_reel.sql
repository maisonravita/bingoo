-- Bilan de santé : le crédit IA suit le vrai refus d'Anthropic (solde insuffisant), et le compteur estimé prend 30 % de marge
do $$
declare d text := pg_get_functiondef('public.bingoo_sante_calcul'::regproc);
begin
  d := replace(d,
    $a$json_build_object('nom', 'Crédit IA au-dessus de 2 €', 'ok', coalesce((select value::numeric from app_secrets where name = 'ia_credit_eur'), 0) - coalesce((select sum(cost_eur) * 1.15 from ai_usage where at >= (select value::timestamptz from app_secrets where name = 'ia_credit_depuis')), 0) > 2, 'grave', true)$a$,
    $b$json_build_object('nom', 'Crédit IA au-dessus de 2 € (et aucun refus « solde insuffisant » d''Anthropic depuis la dernière recharge)', 'ok', coalesce((select value::numeric from app_secrets where name = 'ia_credit_eur'), 0) - coalesce((select sum(cost_eur) * 1.3 from ai_usage where at >= (select value::timestamptz from app_secrets where name = 'ia_credit_depuis')), 0) > 2 and not exists (select 1 from app_secrets e where e.name = 'ia_credit_epuise_at' and e.value::timestamptz > (select value::timestamptz from app_secrets where name = 'ia_credit_depuis')), 'grave', true)$b$);
  if position('ia_credit_epuise_at' in d) = 0 then raise exception 'remplacement non appliqué'; end if;
  execute d;
end $$;
insert into app_secrets (name, value) values ('ia_credit_epuise_at', '2026-11-20T00:07:00Z') on conflict (name) do update set value = excluded.value;
select bingoo_sante_maj();
