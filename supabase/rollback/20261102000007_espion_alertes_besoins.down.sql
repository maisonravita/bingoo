select cron.unschedule('kairo-espion-alertes');
delete from public.radar_opps where kind = 'besoin';
alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array['appel_offres','croissance','recrutement']));
alter table public.workspaces drop column if exists spy_alert_at, drop column if exists spy_needs_at;
