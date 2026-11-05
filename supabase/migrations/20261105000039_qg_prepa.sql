-- Carte de l'équipe : les villes préparées la nuit. Les prospects sont placés une fois pour toutes (Base Adresse Nationale),
-- les zones de chaque espace sont calculées et leurs immeubles téléchargés à l'avance : la carte s'ouvre en quelques secondes.
alter table public.prospects add column if not exists geo_lat double precision;
alter table public.prospects add column if not exists geo_lon double precision;
alter table public.prospects add column if not exists geo_at timestamptz;
create index if not exists prospects_geo_todo on public.prospects (geo_at) where geo_at is null;
alter table public.workspaces add column if not exists qg_zones jsonb not null default '[]'::jsonb;
-- [{ lat, lon, n, ville }] : centres arrondis au centième de degré, du plus actif au moins actif

select cron.unschedule('bingoo-qg-prepa') where exists (select 1 from cron.job where jobname = 'bingoo-qg-prepa');
select cron.schedule('bingoo-qg-prepa', '*/15 * * * *', $$select net.http_post(url:='https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/m/qg-prepa', headers:=jsonb_build_object('content-type','application/json','x-cron-key',(select value from app_secrets where name='cron_key')), body:='{}'::jsonb, timeout_milliseconds:=150000)$$);
