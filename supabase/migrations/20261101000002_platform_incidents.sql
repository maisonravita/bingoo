create or replace function public.platform_incidents() returns jsonb language sql stable security definer set search_path to 'public','cron' as $function$
  select coalesce(jsonb_agg(i), '[]') from (
    select 'Tâche « ' || j.jobname || ' » : ' || count(*) || ' échec(s) sur 24 h' i from cron.job j join cron.job_run_details d on d.jobid = j.jobid
      where d.status = 'failed' and d.start_time > now() - interval '24 hours' group by j.jobname
    union all
    select 'Appels automatiques en erreur sur 24 h : ' || count(*) from net._http_response h
      where h.created > now() - interval '24 hours' and (h.status_code is null or h.status_code >= 400) having count(*) > 0
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
    select 'Crédit IA : erreurs « crédit épuisé » détectées' from activity a where a.created_at > now() - interval '24 hours' and a.summary ilike '%crédit ia épuisé%' having count(*) > 0
  ) q $function$;
revoke all on function public.platform_incidents() from public, anon, authenticated;

create or replace function public.admin_incidents() returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not exists (select 1 from admins where user_id = auth.uid()) then raise exception 'Accès réservé à l''administrateur'; end if;
  return platform_incidents();
end $function$;

-- cron 'kairo-health' (25 7 * * *) → functions/v1/m/health (créé via SQL, clé lue dans app_secrets)
