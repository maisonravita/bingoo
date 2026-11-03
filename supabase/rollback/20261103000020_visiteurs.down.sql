delete from public.radar_opps where kind = 'visite';
alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array[
  'appel_offres','croissance','recrutement','besoin','renouvellement','dirigeant','demenagement','creation',
  'site','levee','permis','aide','budget','salon','difficulte','client_concurrent',
  'obligation','abonnement','outil','avis','etablissement','demande','champion','essai']));
alter table public.competitors drop column if exists alt_page;
drop table if exists public.ip_orgs;
drop index if exists public.site_events_org_idx;
alter table public.site_events drop column if exists org;
