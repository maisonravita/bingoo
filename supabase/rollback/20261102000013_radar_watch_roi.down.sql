drop function if exists public.radar_roi(uuid, timestamptz);
drop table if exists public.radar_watch;
delete from public.radar_opps where kind in ('site','levee','permis','aide','budget','salon','difficulte');
alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array['appel_offres','croissance','recrutement','besoin','renouvellement','dirigeant','demenagement','creation']));
