-- 1. Limites des missions (conditions d'arrêt)
alter table missions add column if not exists max_prospects int,
  add column if not exists max_budget numeric,
  add column if not exists spent numeric not null default 0,
  add column if not exists stop_reason text;

-- 2. Administrateurs de la plateforme (aucune règle d'accès : seul le serveur lit la table)
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
alter table public.admins enable row level security;
insert into public.admins (user_id) values ('f2c2fdfa-b3a9-4c50-8564-8d79069b5f06') on conflict do nothing;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from admins where user_id = auth.uid()) $$;

-- Coût IA estimé par action (en euros), mêmes repères que l'écran Résultats
create or replace function public.ai_cost(k text) returns numeric language sql immutable as $$
  select case k when 'analyse' then 0.06 when 'enquete' then 0.04 when 'enquete_plus' then 0.08 when 'redaction' then 0.01
    when 'linkedin' then 0.03 when 'analyse_prospect' then 0.04 when 'brief' then 0.04 when 'script' then 0.01 when 'veille' then 0.25
    when 'reponse' then 0.01 when 'social' then 0.1 when 'lettre' then 0.01 when 'contacts' then 0.05 when 'intelligence' then 0.1
    when 'mission' then 0.01 when 'radar_scan' then 0.2 when 'espion' then 0.02 when 'reco' then 0.01 else 0 end $$;

-- Vue d'ensemble pour l'administrateur : refusée à tout autre compte
create or replace function public.admin_overview() returns jsonb language plpgsql stable security definer set search_path = public, cron as $$
declare r jsonb;
begin
  if not exists (select 1 from admins where user_id = auth.uid()) then raise exception 'Accès réservé à l''administrateur'; end if;
  select jsonb_build_object(
    'at', now(),
    'workspaces', (select coalesce(jsonb_agg(x order by x->>'cost30' desc), '[]') from (
      select jsonb_build_object('id', w.id, 'name', w.name, 'plan', coalesce(w.plan, 'essai'), 'plan_status', w.plan_status, 'autonomy', w.autonomy,
        'mailbox_ok', coalesce((w.integrations->'mailbox'->>'ok')::boolean, null), 'domain', w.domain_status,
        'cost_today', (select round(coalesce(sum(ai_cost(a.kind)),0)::numeric, 2) from activity a where a.workspace_id = w.id and a.created_at >= date_trunc('day', now() at time zone 'utc')),
        'cost30', (select round(coalesce(sum(ai_cost(a.kind)),0)::numeric, 2) from activity a where a.workspace_id = w.id and a.created_at >= now() - interval '30 days'),
        'actions_today', (select coalesce(jsonb_object_agg(k, n), '{}') from (select a.kind k, count(*) n from activity a where a.workspace_id = w.id and a.created_at >= date_trunc('day', now() at time zone 'utc') group by 1) q),
        'sent7', (select count(*) from messages m where m.workspace_id = w.id and m.status = 'envoye' and m.sent_at > now() - interval '7 days'),
        'failed7', (select count(*) from messages m where m.workspace_id = w.id and m.status = 'echec' and m.created_at > now() - interval '7 days'),
        'bounced7', (select count(*) from messages m where m.workspace_id = w.id and m.bounced and m.created_at > now() - interval '7 days'),
        'refus', (select count(*) from prospects p where p.workspace_id = w.id and p.status = 'refus'),
        'drafts', (select count(*) from messages m where m.workspace_id = w.id and m.status = 'brouillon')) x
      from workspaces w) s),
    'missions', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'ws', w.name, 'objective', m.objective, 'status', m.status, 'auto', m.auto, 'stop_reason', m.stop_reason,
        'run_at', m.run_at, 'spent', m.spent, 'max_budget', m.max_budget, 'deadline', m.deadline, 'last', m.journal->-1) order by m.created_at desc), '[]')
      from missions m join workspaces w on w.id = m.workspace_id where m.status <> 'terminee'),
    'crons', (select coalesce(jsonb_agg(jsonb_build_object('name', j.jobname, 'schedule', j.schedule,
        'last', (select max(d.start_time) from cron.job_run_details d where d.jobid = j.jobid),
        'failed7', (select count(*) from cron.job_run_details d where d.jobid = j.jobid and d.status = 'failed' and d.start_time > now() - interval '7 days')) order by j.jobname), '[]') from cron.job j),
    'http_errors24', (select count(*) from net._http_response h where h.created > now() - interval '24 hours' and (h.status_code is null or h.status_code >= 400)),
    'errors', (select coalesce(jsonb_agg(e order by e->>'at' desc), '[]') from (
      select jsonb_build_object('at', m.created_at, 'ws', w.name, 'what', 'Envoi en échec', 'detail', left(m.error, 160)) e
      from messages m join workspaces w on w.id = m.workspace_id where m.status = 'echec' and m.created_at > now() - interval '7 days'
      union all
      select jsonb_build_object('at', h.created, 'ws', '—', 'what', 'Tâche automatique : réponse ' || coalesce(h.status_code::text, 'absente'), 'detail', left(coalesce(h.error_msg, h.content::text, ''), 160))
      from net._http_response h where h.created > now() - interval '3 days' and (h.status_code is null or h.status_code >= 400)
      limit 40) q)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
