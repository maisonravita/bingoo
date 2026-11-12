-- Semaine des 10 premiers clients démarrée, avec l'e-mail de chaque matin (cron bingoo-semaine-clients → r/saas-semaine-cron)
create table if not exists public.saas_lancements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  domaine text not null,
  titre text not null,
  etapes jsonb not null,
  debut date not null default (now() at time zone 'Europe/Paris')::date,
  emails boolean not null default true,
  dernier_envoi int not null default 0,
  created_at timestamptz not null default now(),
  unique (workspace_id, domaine)
);
alter table public.saas_lancements enable row level security;
create policy gerer on public.saas_lancements for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
select cron.schedule('bingoo-semaine-clients', '17 6,8,11 * * *', $$select net.http_post(url:='https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/r/saas-semaine-cron', headers:=jsonb_build_object('content-type','application/json','x-cron-key',(select value from app_secrets where name='cron_key')), body:='{}'::jsonb, timeout_milliseconds:=60000)$$);
