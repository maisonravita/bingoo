-- Acheter / vendre : description en français (résumé vérifié) quand elle existe ; les annonces à vendre passent en tête de la file de traduction
create or replace function public.saas_a_vendre(ws uuid)
 returns json language sql stable security definer set search_path to 'public'
as $function$
  select case when public.saas_acces() then (
  select coalesce(json_agg(x order by x.source, x.mrr desc nulls last), '[]') from (
    select 'bingoo' source, a.id::text id, a.domaine, coalesce(a.nom, s.nom, a.domaine) nom, coalesce(s.categorie, '') categorie, s.pays,
      coalesce(nullif(concat_ws(' Pour : ', s.pitch_fr->>'fait', s.pitch_fr->>'pour_qui'), ''), s.description, '') description,
      a.prix, case when s.succes->>'type' = 'revenu_verifie' then round(coalesce((s.succes->>'montant')::numeric, 0) / 12) end mrr, a.mrr_declare,
      (s.succes->>'type' = 'revenu_verifie') verifie, a.message, null::numeric offres, null::text multiple, null::text offre_url, a.created_at::date depuis, (a.workspace_id = ws) moi
    from saas_annonces a left join saas s on s.domaine = a.domaine
    where a.statut = 'active'
    union all
    select 'trustmrr', s.id::text, s.domaine, s.nom, s.categorie, s.pays,
      coalesce(nullif(concat_ws(' Pour : ', s.pitch_fr->>'fait', s.pitch_fr->>'pour_qui'), ''), s.description),
      (s.trustmrr->'vente'->>'prix')::numeric::int, round(coalesce((s.trustmrr->>'mrr')::numeric, (s.succes->>'montant')::numeric / 12)), null,
      true, s.trustmrr->'vente'->>'message', (s.trustmrr->'vente'->>'offres')::numeric, s.trustmrr->'vente'->>'multiple', s.trustmrr->'vente'->>'offre_url', (s.trustmrr->'vente'->>'depuis')::date, false
    from saas s where s.statut in ('ok', 'a_lire') and (s.trustmrr->'vente'->>'a_vendre')::boolean
  ) x
) end;
$function$;

create or replace function public.saas_pitch_a_faire(lim integer)
 returns table(id uuid, nom text, domaine text, texte text, persona text)
 language sql stable security definer set search_path to 'public'
as $function$
  select * from (
    (select s.id, s.nom, s.domaine, left(coalesce(nullif(s.trustmrr->>'proposition', ''), s.description), 400), s.trustmrr->>'persona'
     from saas s
     where s.statut in ('ok', 'a_lire') and (s.trustmrr->'vente'->>'a_vendre')::boolean and (s.pitch_fr->>'verifie') is null
       and coalesce(s.description, s.trustmrr->>'proposition') is not null
     order by (s.trustmrr->>'mrr')::numeric desc nulls last limit lim)
    union all
    (select s.id, s.nom, s.domaine, left(coalesce(nullif(s.trustmrr->>'proposition', ''), s.description), 400), s.trustmrr->>'persona'
     from saas_choix c join saas s on s.id = c.id
     where s.statut = 'ok' and s.constructible_ia is null and (s.pitch_fr->>'verifie') is null and coalesce(s.description, s.trustmrr->>'proposition') is not null and c.m_mrr >= 2000
     order by c.m_mrr desc nulls last limit lim)
  ) t limit lim;
$function$;
