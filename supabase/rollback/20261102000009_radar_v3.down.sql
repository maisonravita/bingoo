drop function if exists public.radar_set_scores(jsonb);
drop index if exists radar_opps_ws_group; drop index if exists radar_opps_ws_score;
delete from public.radar_opps where kind in ('renouvellement','dirigeant','demenagement','creation');
update public.radar_opps set status = 'ecarte' where status in ('expire','filtre');
alter table public.radar_opps drop column if exists siren, drop column if exists expires_at, drop column if exists score, drop column if exists score_why, drop column if exists group_key, drop column if exists feedback, drop column if exists alerted_at;
alter table public.radar_opps drop constraint if exists radar_opps_status_check;
alter table public.radar_opps add constraint radar_opps_status_check check (status = any (array['nouveau','suivi','ajoute','ecarte']));
alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array['appel_offres','croissance','recrutement','besoin']));
