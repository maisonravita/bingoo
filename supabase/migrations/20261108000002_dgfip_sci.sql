-- SCI propriétaires en Île-de-France (fichier DGFiP des locaux des personnes morales), chargées par le workflow « DGFiP locaux SCI IdF »
create table if not exists public.dgfip_sci (siren text primary key, denomination text, forme text, dep text, nb_locaux int, nb_etage int, communes text, adresse text, maj timestamptz default now());
alter table public.dgfip_sci enable row level security;
create index if not exists dgfip_sci_dep on public.dgfip_sci (dep, nb_locaux);
alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array['appel_offres','croissance','recrutement','besoin','renouvellement','dirigeant','demenagement','creation','site','levee','permis','aide','budget','salon','difficulte','client_concurrent','obligation','abonnement','outil','avis','etablissement','demande','champion','essai','visite','patrimoine']));
create or replace function public.sci_a_prospecter(ws uuid, motifs text[], maxl int, n int)
returns setof public.dgfip_sci language sql stable security definer set search_path = public as $$
  select d.* from dgfip_sci d
  where d.communes ~* motifs[1] and d.nb_locaux between 1 and maxl and d.nb_etage > 0
    and not exists (select 1 from radar_opps o where o.workspace_id = ws and o.key = 'sci:' || d.siren)
    and not exists (select 1 from prospects p where p.workspace_id = ws and p.siren = d.siren)
  order by md5(d.siren || current_date::text)
  limit n
$$;
revoke all on function public.sci_a_prospecter(uuid, text[], int, int) from public, anon, authenticated;
