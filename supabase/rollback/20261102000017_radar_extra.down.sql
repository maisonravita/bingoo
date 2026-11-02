drop table if exists public.radar_partners;
alter table public.radar_watch drop column if exists tech, drop column if exists tech_at;
delete from public.radar_opps where kind = 'client_concurrent';
-- puis remettre la contrainte de 20261102000013
