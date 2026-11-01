-- Mesure du site (Kairo Distribution / Conversion) : pixel sans cookie, sans donnée personnelle.
-- Une « visite » = une session de navigation (identifiant aléatoire en mémoire de session), pas une personne.
alter table public.workspaces add column if not exists track_key text unique default encode(extensions.gen_random_bytes(12), 'hex');
update public.workspaces set track_key = encode(extensions.gen_random_bytes(12), 'hex') where track_key is null;

create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  session_id text not null,
  type text not null check (type in ('view','lead')),
  path text not null default '/',
  title text not null default '',
  source text not null default 'direct',
  referrer_host text not null default '',
  utm_campaign text not null default '',
  utm_medium text not null default '',
  device text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists site_events_ws_idx on public.site_events (workspace_id, created_at desc);
alter table public.site_events enable row level security;
create policy site_events_select on public.site_events for select to authenticated using (public.is_member(workspace_id));

-- Agrégats du site sur une période et la période précédente
create or replace function public.site_stats(p_ws uuid, p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t1 timestamptz := now(); t0 timestamptz := now() - make_interval(days => p_days); tp timestamptz := now() - make_interval(days => 2 * p_days); r jsonb;
begin
  if not public.is_member(p_ws) then raise exception 'Accès refusé'; end if;
  with e as (select * from public.site_events where workspace_id = p_ws and created_at >= tp),
  cur as (select * from e where created_at >= t0), prv as (select * from e where created_at < t0),
  first_src as (select distinct on (session_id) session_id, source from cur where type = 'view' order by session_id, created_at)
  select jsonb_build_object(
    'visits', (select count(distinct session_id) from cur where type = 'view'),
    'views', (select count(*) from cur where type = 'view'),
    'leads', (select count(*) from cur where type = 'lead'),
    'prev', jsonb_build_object('visits', (select count(distinct session_id) from prv where type = 'view'), 'views', (select count(*) from prv where type = 'view'), 'leads', (select count(*) from prv where type = 'lead')),
    'by_source', coalesce((select jsonb_agg(x order by x.visits desc) from (
        select f.source, count(*) as visits, (select count(*) from cur l where l.type = 'lead' and l.session_id in (select session_id from first_src f2 where f2.source = f.source)) as leads
        from first_src f group by f.source) x), '[]'),
    'by_day', coalesce((select jsonb_agg(x order by x.d) from (
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as d, count(distinct session_id) filter (where type = 'view') as visits, count(*) filter (where type = 'lead') as leads
        from cur group by 1) x), '[]'),
    'pages', coalesce((select jsonb_agg(x order by x.views desc) from (
        select c.path, max(c.title) as title, count(*) filter (where c.type = 'view') as views, count(distinct c.session_id) filter (where c.type = 'view') as visits, count(*) filter (where c.type = 'lead') as leads,
          (select count(*) from prv p where p.path = c.path and p.type = 'view') as prev_views
        from cur c group by c.path order by 3 desc limit 25) x), '[]'),
    'campaigns', coalesce((select jsonb_agg(x order by x.visits desc) from (
        select utm_campaign as campaign, max(source) as source, max(utm_medium) as medium, count(distinct session_id) filter (where type = 'view') as visits, count(*) filter (where type = 'lead') as leads
        from cur where utm_campaign <> '' group by utm_campaign limit 20) x), '[]'),
    'last_event_at', (select max(created_at) from public.site_events where workspace_id = p_ws)
  ) into r;
  return r;
end $$;
revoke all on function public.site_stats(uuid, int) from public, anon;
grant execute on function public.site_stats(uuid, int) to authenticated;

-- Indicateurs de prospection sur une période et la précédente
create or replace function public.pro_stats(p_ws uuid, p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t0 timestamptz := now() - make_interval(days => p_days); tp timestamptz := now() - make_interval(days => 2 * p_days); r jsonb;
begin
  if not public.is_member(p_ws) then raise exception 'Accès refusé'; end if;
  select jsonb_build_object(
    'prospects', (select count(*) from public.prospects where workspace_id = p_ws and created_at >= t0),
    'sent', (select count(*) from public.messages where workspace_id = p_ws and sent_at >= t0),
    'replies', (select count(*) from public.replies where workspace_id = p_ws and created_at >= t0 and class not in ('absence')),
    'rdv', (select count(*) from public.meetings where workspace_id = p_ws and created_at >= t0 and status <> 'annule'),
    'quotes', (select count(*) from public.quotes where workspace_id = p_ws and sent_at >= t0),
    'clients', (select count(*) from public.quotes where workspace_id = p_ws and signed_at >= t0),
    'ca', (select coalesce(sum(total_ht), 0) from public.quotes where workspace_id = p_ws and signed_at >= t0),
    'prev', jsonb_build_object(
      'prospects', (select count(*) from public.prospects where workspace_id = p_ws and created_at >= tp and created_at < t0),
      'sent', (select count(*) from public.messages where workspace_id = p_ws and sent_at >= tp and sent_at < t0),
      'replies', (select count(*) from public.replies where workspace_id = p_ws and created_at >= tp and created_at < t0 and class not in ('absence')),
      'rdv', (select count(*) from public.meetings where workspace_id = p_ws and created_at >= tp and created_at < t0 and status <> 'annule'),
      'quotes', (select count(*) from public.quotes where workspace_id = p_ws and sent_at >= tp and sent_at < t0),
      'clients', (select count(*) from public.quotes where workspace_id = p_ws and signed_at >= tp and signed_at < t0)),
    'total_prospects', (select count(*) from public.prospects where workspace_id = p_ws),
    'total_clients', (select count(*) from public.prospects where workspace_id = p_ws and status = 'client')
  ) into r;
  return r;
end $$;
revoke all on function public.pro_stats(uuid, int) from public, anon;
grant execute on function public.pro_stats(uuid, int) to authenticated;
