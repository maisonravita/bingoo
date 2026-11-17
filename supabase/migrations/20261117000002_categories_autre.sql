-- Fiches rangées dans « Autre » : file de reclassement par l'IA (r/saas-categories-autre), une fois par fiche.
create table if not exists public._autre_vu (id uuid primary key);
alter table public._autre_vu enable row level security;
create table if not exists public._cats_autre_avant as select id, categorie from saas where statut = 'ok' and categorie = 'Autre';
create or replace function public.saas_autre_a_faire(lim int) returns table(id uuid, nom text, texte text) language sql stable security definer set search_path = public as $$
  select s.id, s.nom, coalesce(nullif(s.pitch_fr->>'fait', ''), nullif(s.trustmrr->>'proposition', ''), s.description)
  from saas s where s.statut = 'ok' and s.categorie = 'Autre' and coalesce(s.description, '') <> ''
    and not exists (select 1 from _autre_vu v where v.id = s.id)
  order by coalesce((s.succes->>'montant')::numeric, 0) desc limit lim;
$$;
revoke execute on function public.saas_autre_a_faire(int) from anon, authenticated, public;
-- Recharge du 17/11 : 5 $ (comptés 4,30 €), réserve des tâches de fond ramenée à 2 €. Tâches de fond IA lourdes mises en pause
-- (bingoo-explorer, bingoo-niches-rattrapage, pays, entreprises) pour réserver le crédit au réexamen des SaaS rentables et à « Autre ».
