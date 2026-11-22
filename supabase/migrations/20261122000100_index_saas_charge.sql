-- Charge de la base (nuit du 21 au 22/11) : trois requêtes fréquentes relisaient toute la table saas.
-- Index partiels appliqués en ligne (create index concurrently) le 22/11 ; ce fichier les garde dans l'historique.
create index if not exists saas_sans_succes_essais_idx on public.saas (statut, created_at) where succes is null and essais < 3;
create index if not exists saas_avec_succes_essais_idx on public.saas (statut) where succes is not null and essais < 3;
create index if not exists saas_ok_pubs_idx on public.saas (pubs_at asc nulls first, score_croissance desc) where statut = 'ok';
