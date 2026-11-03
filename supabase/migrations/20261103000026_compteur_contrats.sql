-- Contrats publics trouvés par l'outil gratuit (dédoublonnés) : comptés dans le compteur de la page d'accueil.
create table if not exists public.radar_found (k text primary key, kind text not null default 'contrat', at timestamptz not null default now());
alter table public.radar_found enable row level security;
create or replace function public.radar_live() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', (select count(*) from radar_opps) + (select count(*) from prospects) + (select count(*) from radar_found),
    'signaux', (select count(*) from radar_opps),
    'marches', (select count(*) from radar_opps where kind in ('appel_offres','renouvellement')) + (select count(*) from radar_found where kind = 'contrat'),
    'prospects', (select count(*) from prospects),
    'contacts', (select count(*) from contacts),
    'derniere', (select max(created_at) from radar_opps)
  );
$$;
