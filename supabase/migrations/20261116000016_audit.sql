-- Audit du 16/11/2026 : bilan de santé de 6,3 s à 0,3 s (index sur saas.pubs_at, contrôle du validateur allégé),
-- search_path fixé sur saas_difficulte / saas_estimations / saas_revenu_suspect, index inutile saas_mobiles_rang_idx retiré.
create index if not exists saas_pubs_at_idx on public.saas (pubs_at) where pubs_at is not null;
alter function public.saas_difficulte(text, int) set search_path = public;
alter function public.saas_estimations() set search_path = public;
drop index if exists public.saas_mobiles_rang_idx;
