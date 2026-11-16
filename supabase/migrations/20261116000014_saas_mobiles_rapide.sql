-- Applis mobiles : un index par tri et une liste qui suit l'index (plus de tri ni de comptage sur toute la table)
create index if not exists saas_mobiles_rang_avis_idx on public.saas_mobiles (rang_revenus asc nulls last, avis desc nulls last);
create index if not exists saas_mobiles_note_idx on public.saas_mobiles (note desc nulls last, avis desc nulls last);
create index if not exists saas_mobiles_maj_idx on public.saas_mobiles (maj desc nulls last, avis desc nulls last);
create index if not exists saas_mobiles_cat_avis_idx on public.saas_mobiles (categorie, avis desc nulls last);
-- saas_mobiles_liste réécrite en plpgsql (tri par index, total compté seulement avec un filtre) : texte complet dans la base
