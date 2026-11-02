drop table if exists public.tech_seen;
drop table if exists public.company_scan;
delete from public.radar_opps where kind in ('obligation','abonnement','outil','avis','etablissement','demande','champion','essai');
alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array[
  'appel_offres','croissance','recrutement','besoin','renouvellement','dirigeant','demenagement','creation',
  'site','levee','permis','aide','budget','salon','difficulte','client_concurrent']));
