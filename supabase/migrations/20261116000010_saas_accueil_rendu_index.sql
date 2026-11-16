create index if not exists saas_accueil_rendu_idx on public.saas (accueil_rendu_at) where accueil_rendu is not null;
create index if not exists saas_candidats_statut_rang_idx on public.saas_candidats (statut, rang);
