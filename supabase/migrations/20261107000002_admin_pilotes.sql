-- Suivi des clients pilotes (administration) : ce qui compte pour la phase 1 du plan
-- 30 premiers jours depuis le premier paiement (ou l'inscription), objectif : au moins 2 rendez-vous
create or replace function public.admin_pilotes()
returns table(workspace_id uuid, name text, plan text, plan_status text, debut timestamptz, jours int,
  contactes bigint, positifs bigint, rdv bigint, rdv_30j bigint, rebonds bigint, emails_payants bigint,
  cout_ia numeric, cout_par_contact numeric, mois_offerts jsonb, parrain text)
language sql stable security definer set search_path to 'public' as $$
  with w as (
    select w.*, coalesce(w.paid_since, w.created_at) as d0 from workspaces w
    where public.is_admin() and w.onboarded and w.plan <> 'fondateur'
  )
  select w.id, w.name, w.plan, w.plan_status, w.d0, (extract(epoch from now() - w.d0) / 86400)::int,
    (select count(*) from messages m where m.workspace_id = w.id and m.status = 'envoye' and m.step = 0),
    (select count(distinct r.prospect_id) from replies r where r.workspace_id = w.id and r.class in ('interesse','question','prix','rappel')),
    (select count(*) from meetings x where x.workspace_id = w.id and x.status <> 'annule'),
    (select count(*) from meetings x where x.workspace_id = w.id and x.status <> 'annule' and x.created_at < w.d0 + interval '30 days'),
    (select count(*) from messages m where m.workspace_id = w.id and m.bounced),
    (select count(*) from prospects p where p.workspace_id = w.id and (p.email_source ilike 'trouvé!%' or p.email_source ilike 'Dropcontact%')),
    (select coalesce(round(sum(u.cost_eur), 2), 0) from ai_usage u where u.workspace_id = w.id),
    (select case when count(*) = 0 then null else round((select coalesce(sum(u.cost_eur), 0) from ai_usage u where u.workspace_id = w.id) / count(*), 3) end
       from messages m where m.workspace_id = w.id and m.status = 'envoye' and m.step = 0),
    coalesce((select jsonb_agg(p) from jsonb_array_elements(w.perks) p where not coalesce((p->>'applique')::boolean, false)), '[]'::jsonb),
    (select r.name from workspaces r where r.id = w.referred_by)
  from w order by w.d0 desc;
$$;
revoke all on function public.admin_pilotes() from public, anon;
grant execute on function public.admin_pilotes() to authenticated;

-- Marquer un mois offert comme appliqué dans Stripe
create or replace function public.admin_perk_applique(p_ws uuid, p_at text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  update workspaces set perks = (select coalesce(jsonb_agg(case when e->>'at' = p_at then e || '{"applique": true}'::jsonb else e end), '[]'::jsonb) from jsonb_array_elements(perks) e)
  where id = p_ws;
end $$;
revoke all on function public.admin_perk_applique(uuid, text) from public, anon;
grant execute on function public.admin_perk_applique(uuid, text) to authenticated;
