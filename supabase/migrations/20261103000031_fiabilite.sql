-- Fiabilité : nettoyage des essais seulement après l'ouverture des abonnements ; erreurs d'affichage des utilisateurs
-- enregistrées et signalées dans l'alerte quotidienne.
create or replace function public.purge_old_data() returns jsonb language plpgsql security definer set search_path = public as $$
declare n_p int := 0; n_w int := 0; n_h int := 0;
begin
  with gone as (
    delete from prospects p
    where p.status not in ('client', 'rdv', 'repondu')
      and greatest(p.created_at, coalesce(p.updated_at, p.created_at),
                   coalesce((select max(m.sent_at) from messages m where m.prospect_id = p.id), p.created_at)) < now() - interval '3 years'
      and not exists (select 1 from meetings mt where mt.prospect_id = p.id)
      and not exists (select 1 from quotes q where q.prospect_id = p.id)
    returning 1)
  select count(*) into n_p from gone;

  with gone as (
    delete from workspaces w
    where coalesce(w.plan, 'essai') <> 'fondateur'
      and (
        -- Essais terminés : seulement une fois les abonnements ouverts (sinon le client n'a pas pu payer)
        (coalesce(w.plan, 'essai') = 'essai' and w.trial_ends is not null and w.trial_ends < (now() - interval '30 days')::date
         and exists (select 1 from app_secrets where name = 'payments_live' and value = '1'))
        or (coalesce(w.plan, 'essai') <> 'essai' and w.plan_status in ('canceled', 'incomplete_expired') and coalesce(w.period_end, w.created_at) < now() - interval '30 days')
      )
    returning 1)
  select count(*) into n_w from gone;

  delete from free_hits where day < current_date - 60;
  get diagnostics n_h = row_count;

  return jsonb_build_object('prospects', n_p, 'espaces', n_w, 'compteurs', n_h, 'at', now());
end $$;

create table if not exists public.client_errors (
  id bigserial primary key, at timestamptz not null default now(), user_id uuid default auth.uid(),
  page text not null default '', message text not null default '', stack text not null default ''
);
alter table public.client_errors enable row level security;
drop policy if exists client_errors_insert on public.client_errors;
create policy client_errors_insert on public.client_errors for insert to anon, authenticated
  with check (length(message) <= 500 and length(stack) <= 4000 and length(page) <= 300 and (user_id is null or user_id = auth.uid()));
grant insert on public.client_errors to anon, authenticated;
grant usage on sequence public.client_errors_id_seq to anon, authenticated;

-- Garde 30 jours d'erreurs
create or replace function public.purge_client_errors() returns void language sql security definer set search_path = public as $$
  delete from client_errors where at < now() - interval '30 days';
$$;
revoke all on function public.purge_client_errors() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'bingoo-erreurs-nettoyage';
select cron.schedule('bingoo-erreurs-nettoyage', '45 3 * * *', $$select public.purge_client_errors()$$);

-- Alerte quotidienne : ajoute les erreurs d'affichage et le plafond IA atteint
create or replace function public.platform_incidents() returns jsonb language sql stable security definer set search_path to 'public', 'cron' as $function$
  select coalesce(jsonb_agg(i), '[]') from (
    select 'Tâche « ' || j.jobname || ' » : ' || count(*) || ' échec(s) sur 24 h' i from cron.job j join cron.job_run_details d on d.jobid = j.jobid
      where d.status = 'failed' and d.start_time > now() - interval '24 hours' group by j.jobname
    union all
    select 'Appels automatiques en panne sur 24 h : ' || count(*) from net._http_response h
      where h.created > now() - interval '24 hours' and (h.status_code is null or h.status_code >= 500) having count(*) > 0
    union all
    select 'Boîte mail déconnectée : ' || w.name from workspaces w where (w.integrations->'mailbox'->>'ok')::boolean is false
    union all
    select w.name || ' : ' || count(*) || ' envoi(s) en échec sur 24 h' from messages m join workspaces w on w.id = m.workspace_id
      where m.status = 'echec' and m.created_at > now() - interval '24 hours' group by w.name
    union all
    select w.name || ' : ' || count(*) || ' rebond(s) sur 7 jours' from messages m join workspaces w on w.id = m.workspace_id
      where m.bounced and m.created_at > now() - interval '7 days' group by w.name having count(*) >= 3
    union all
    select 'Mission bloquée (' || w.name || ') : pilotage actif mais rien depuis 2 jours ouvrés' from missions m join workspaces w on w.id = m.workspace_id
      where m.status = 'active' and m.auto and m.run_at is not null and m.run_at < now() - interval '3 days'
    union all
    select 'Mission en erreur (' || w.name || ') : ' || left(m.last_error, 120) from missions m join workspaces w on w.id = m.workspace_id
      where m.status = 'active' and m.state = 'erreur'
    union all
    select 'Crédit IA : erreurs « crédit épuisé » détectées' from activity a where a.created_at > now() - interval '24 hours' and a.summary ilike '%crédit ia épuisé%' having count(*) > 0
    union all
    select 'Erreurs d''affichage chez les utilisateurs sur 24 h : ' || count(*) || ' (exemple : ' || left(max(message), 100) || ')' from client_errors
      where at > now() - interval '24 hours' having count(*) > 0
    union all
    select 'IA : ' || round(sum(cost_eur)::numeric, 2) || ' € dépensés hier (plafond quotidien proche ou atteint)' from ai_usage
      where at >= date_trunc('day', now()) - interval '1 day' and at < date_trunc('day', now()) having sum(cost_eur) >= 8
  ) q $function$;
