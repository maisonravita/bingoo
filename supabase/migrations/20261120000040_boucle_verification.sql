-- Boucle « construire → tester → corriger » avant livraison.
-- saas_apps.verif porte l'état de la vérification : phase (en_cours | fini), essais par écran, écrans en réparation,
-- journal des vrais événements (affiché au membre en direct) et mesure de la construction (taux de réussite, essais, coût).

-- Événement atomique : une ligne au journal, et l'écran retiré de la liste « en réparation » (réparation terminée)
create or replace function public.saas_verif_evt(p_app uuid, p_texte text, p_retirer text default null, p_type text default 'info')
returns void language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select coalesce(verif, '{}'::jsonb) into v from saas_apps where id = p_app for update;
  if p_texte is not null then
    v := jsonb_set(v, '{journal}', coalesce(v->'journal', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('at', now(), 't', left(p_texte, 300), 'type', p_type)));
    -- le journal reste court
    if jsonb_array_length(v->'journal') > 40 then v := jsonb_set(v, '{journal}', (select jsonb_agg(x order by i) from (select x, i from jsonb_array_elements(v->'journal') with ordinality t(x, i) order by i desc limit 40) y)); end if;
  end if;
  if p_retirer is not null then
    v := jsonb_set(v, '{en_reparation}', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(coalesce(v->'en_reparation', '[]'::jsonb)) x where x <> p_retirer), '[]'::jsonb));
  end if;
  update saas_apps set verif = v where id = p_app;
end $$;
revoke all on function public.saas_verif_evt(uuid, text, text, text) from public, anon, authenticated;

-- Mesure des constructions, par famille de SaaS et par modèle : réussite au premier passage, essais, coût des corrections
create or replace function public.admin_mesures_construction(p_jours int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  return (select coalesce(jsonb_agg(x order by (x->>'constructions')::int desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'famille', coalesce(nullif(spec->>'modele', ''), 'IA : ' || coalesce(spec->>'famille', '?')),
      'constructions', count(*),
      'premier_ok', count(*) filter (where (verif->'mesure'->'premier'->>'ok')::boolean),
      'ecrans_ko_premier', round(avg((verif->'mesure'->'premier'->>'ko')::numeric), 1),
      'essais', round(avg(coalesce((verif->'mesure'->>'essais')::numeric, 0)), 1),
      'cout', round(avg(coalesce((verif->'mesure'->>'cout')::numeric, 0)), 3),
      'final_ok', count(*) filter (where (verif->>'ok')::boolean and verif->>'phase' = 'fini'),
      'en_cours', count(*) filter (where verif->>'phase' = 'en_cours')
    ) x
    from saas_apps
    where verif ? 'mesure' and coalesce((verif->'mesure'->>'debut')::timestamptz, at) > now() - make_interval(days => p_jours)
    group by coalesce(nullif(spec->>'modele', ''), 'IA : ' || coalesce(spec->>'famille', '?'))
  ) t);
end $$;
revoke all on function public.admin_mesures_construction(int) from public, anon;
grant execute on function public.admin_mesures_construction(int) to authenticated;

-- Le coût des corrections est noté par SaaS (« construire/reparer/<id> ») : le tableau de bord IA les regroupe en une seule ligne
create or replace function public.admin_ia_credit()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
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
        select regexp_replace(coalesce(feature, '?'), '/[0-9a-f-]{36}$', '') f, sum(cost_eur) c, count(*) n from ai_usage where at >= coalesce(v_depuis, date_trunc('day', now())) group by 1 order by 2 desc limit 12) y),
    'par_client', (select coalesce(jsonb_agg(jsonb_build_object('nom', coalesce(w.name, 'Plateforme'), 'eur', round(c, 2)) order by c desc), '[]') from (
        select workspace_id, sum(cost_eur) c from ai_usage where at >= coalesce(v_depuis, date_trunc('day', now())) group by 1 order by 2 desc limit 8) z
        left join workspaces w on w.id = z.workspace_id)
  );
end $function$;
