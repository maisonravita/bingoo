-- Entreprises qui visitent le site du client (nom de l'entreprise seulement, jamais l'adresse IP)
alter table public.site_events add column if not exists org text;
create index if not exists site_events_org_idx on public.site_events (workspace_id, created_at desc) where org is not null;
-- Cache des registres publics d'adresses IP : plage → organisation (null = opérateur / hébergeur)
create table if not exists public.ip_orgs (
  start_ip inet not null, end_ip inet not null,
  org text, isp boolean not null default false,
  checked_at timestamptz not null default now(),
  primary key (start_ip, end_ip)
);
create index if not exists ip_orgs_range on public.ip_orgs (start_ip, end_ip);
alter table public.ip_orgs enable row level security; -- serveur uniquement
-- Page « Alternative à [concurrent] » rédigée par Espion
alter table public.competitors add column if not exists alt_page jsonb;
-- Signal Radar « visite »
alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array[
  'appel_offres','croissance','recrutement','besoin','renouvellement','dirigeant','demenagement','creation',
  'site','levee','permis','aide','budget','salon','difficulte','client_concurrent',
  'obligation','abonnement','outil','avis','etablissement','demande','champion','essai','visite']));
