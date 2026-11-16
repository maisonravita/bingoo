-- Page d'accueil : vitrine publique (5 SaaS en croissance, revenus vérifiés déjà publics sur TrustMRR)
-- et 3 questions d'exemple pour « Bingoo! dans ton IA ». Appliquée via MCP.
create or replace function public.saas_accueil_vitrine() returns json language sql stable security definer set search_path = public as $$
  with b as (
    select s.domaine, s.nom, s.categorie, s.image, s.difficulte, s.pays,
      coalesce(nullif(s.trustmrr->>'audience', ''), case when s.cible in ('B2B','B2C') then s.cible end) audience,
      round(coalesce((s.succes->>'montant')::numeric, 0) / 12) mrr,
      nullif(replace(replace(coalesce(s.trustmrr->>'croissance_mrr_30j', s.succes->>'croissance_30j'), '%', ''), ',', '.'), '')::numeric crois,
      (s.trustmrr->>'visiteurs_30j')::numeric visiteurs, coalesce(s.trustmrr->'canaux', '[]') canaux,
      (select jsonb_agg(c->'v' order by c->>'m') from jsonb_array_elements(coalesce(s.succes->'courbe', '[]')) c where c->>'m' < to_char(now(), 'YYYY-MM')) courbe
    from saas s
    where s.statut = 'ok' and s.succes->>'type' = 'revenu_verifie' and not coalesce(s.revenu_suspect, false) and s.nom !~* '^todo'
  ),
  v as (select * from b where crois >= 10 and crois < 400 and jsonb_array_length(coalesce(courbe, '[]')) >= 6 and image is not null order by mrr desc limit 5),
  q1 as (select * from b where categorie = 'Prospection et emailing' and mrr >= 1000 and crois between 0 and 400 and jsonb_array_length(coalesce(courbe, '[]')) >= 6 order by mrr desc limit 3),
  q2 as (select * from b where categorie = 'IA et automatisation' and mrr >= 1000 and crois between 0 and 400 and jsonb_array_length(coalesce(courbe, '[]')) >= 6 order by crois desc limit 3),
  q3 as (select * from b where categorie = 'Réseaux sociaux et contenu' and mrr > 0 and crois > 0 and jsonb_array_length(coalesce(courbe, '[]')) >= 6 order by mrr desc limit 3)
  select json_build_object(
    'saas', (select json_agg(v) from v),
    'questions', json_build_array(
      json_build_object('q', 'Quels SaaS de prospection encaissent le plus ?', 'saas', (select json_agg(json_build_object('nom', nom, 'domaine', domaine, 'mrr', mrr, 'crois', crois, 'courbe', courbe)) from q1)),
      json_build_object('q', 'Quels SaaS IA ont le plus grandi ce mois-ci ?', 'saas', (select json_agg(json_build_object('nom', nom, 'domaine', domaine, 'mrr', mrr, 'crois', crois, 'courbe', courbe)) from q2)),
      json_build_object('q', 'Quels SaaS pour les réseaux sociaux encaissent le plus ?', 'saas', (select json_agg(json_build_object('nom', nom, 'domaine', domaine, 'mrr', mrr, 'crois', crois, 'courbe', courbe)) from q3))
    ));
$$;
grant execute on function public.saas_accueil_vitrine() to anon, authenticated;

-- Cache : le calcul prend ~6 s, il est fait toutes les 3 heures et la page lit le résultat.
alter function public.saas_accueil_vitrine() rename to saas_accueil_vitrine_calc;
revoke execute on function public.saas_accueil_vitrine_calc() from anon, authenticated, public;
create table if not exists public.accueil_cache (id int primary key, data json not null, maj timestamptz not null default now());
alter table public.accueil_cache enable row level security;
insert into public.accueil_cache(id, data) values (1, public.saas_accueil_vitrine_calc()) on conflict (id) do update set data = excluded.data, maj = now();
create or replace function public.saas_accueil_vitrine() returns json language sql stable security definer set search_path = public as $$ select data from accueil_cache where id = 1 $$;
grant execute on function public.saas_accueil_vitrine() to anon, authenticated;
select cron.schedule('bingoo-accueil-vitrine', '17 */3 * * *', $$insert into public.accueil_cache(id, data) values (1, public.saas_accueil_vitrine_calc()) on conflict (id) do update set data = excluded.data, maj = now()$$);

-- Vitrine : seulement des courbes qui montent vraiment (dernier mois ≥ 85 % du record, et plus haut qu'il y a 6 mois).
-- Appliqué via MCP en remplaçant le filtre « v » de saas_accueil_vitrine_calc :
--   and (courbe->>-1)::numeric >= 0.85 * (select max(x::numeric) from jsonb_array_elements_text(courbe) x)
--   and (courbe->>-1)::numeric > (courbe->>-6)::numeric
