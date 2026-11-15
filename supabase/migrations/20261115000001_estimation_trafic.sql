-- Revenu estimé d'après le trafic (classement Tranco), sans IA, comme les outils de données SaaS :
-- pour chaque tranche de classement, les revenus publiés des SaaS comparables (25e et 50e centiles, par mois).
-- Seulement pour les SaaS sans revenu prouvé ni estimation par l'effectif. Fiabilité affichée : faible.
create or replace function saas_estimation_trafic() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  -- Le trafic : le classement Tranco connu devient le classement affiché quand aucun autre n'existe
  update saas s set rang_tranco = c.rang from saas_candidats c
    where c.domaine = s.domaine and s.statut = 'ok' and c.rang is not null and s.rang_tranco is distinct from c.rang;
  update saas set rang_web = rang_tranco where statut = 'ok' and rang_web is null and rang_web_avant is null and rang_tranco is not null;

  with d as (
    select case when rang_tranco < 10000 then 1 when rang_tranco < 50000 then 2 when rang_tranco < 150000 then 3 when rang_tranco < 300000 then 4 else 5 end b,
           (succes->>'montant')::numeric / 12 m
    from saas where statut = 'ok' and rang_tranco is not null
      and succes->>'type' in ('revenu_verifie', 'revenu', 'revenu_officiel', 'revenu_presse') and (succes->>'montant')::numeric > 0
  ), t as (
    select b, percentile_cont(0.25) within group (order by m) p25, percentile_cont(0.5) within group (order by m) p50, count(*) n from d group by b
  ), cible as (
    select s.id, jsonb_build_object('bas', round(t.p25), 'haut', round(t.p50), 'centre', round(sqrt(greatest(t.p25, 1) * t.p50)),
      'methode', 'trafic', 'rang', s.rang_tranco, 'comparables', t.n, 'fiabilite', 'faible', 'calcule_at', now()) e
    from saas s join t on t.b = case when s.rang_tranco < 10000 then 1 when s.rang_tranco < 50000 then 2 when s.rang_tranco < 150000 then 3 when s.rang_tranco < 300000 then 4 else 5 end
    where s.statut = 'ok' and s.succes is null and s.rang_tranco is not null and t.n >= 20
      and (s.estimation is null or s.estimation->>'methode' = 'trafic')
  )
  update saas s set estimation = c.e from cible c
    where s.id = c.id and (s.estimation->>'bas' is distinct from c.e->>'bas' or s.estimation->>'rang' is distinct from c.e->>'rang');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function saas_estimation_trafic() from public, anon, authenticated;
select cron.schedule('bingoo-estimation-trafic', '23 4 * * 1', $$select saas_estimation_trafic()$$);
