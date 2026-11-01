-- CH03 : état visible des missions, erreurs comptées, alerte plateforme
alter table public.missions
  add column if not exists state text not null default '',
  add column if not exists state_text text not null default '',
  add column if not exists last_error text not null default '',
  add column if not exists errors integer not null default 0,
  add column if not exists last_step_at timestamptz;

create or replace function public.platform_incidents() returns jsonb
language sql stable security definer set search_path to 'public', 'cron' as $function$
  select coalesce(jsonb_agg(i), '[]') from (
    select 'Tâche « ' || j.jobname || ' » : ' || count(*) || ' échec(s) sur 24 h' i from cron.job j join cron.job_run_details d on d.jobid = j.jobid
      where d.status = 'failed' and d.start_time > now() - interval '24 hours' group by j.jobname
    union all
    -- Pannes serveur uniquement (les refus d'accès volontaires, 401/403, ne sont pas des pannes)
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
  ) q $function$;
