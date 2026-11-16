-- Cartes de l'Explorer : image du SaaS (og:image ou capture TrustMRR), capture App Store des applis,
-- colonnes image et cible ajoutées à la vue saas_liste (texte complet dans la base), index pour la liste triée.
alter table public.saas add column if not exists image text, add column if not exists image_at timestamptz;
alter table public.saas_mobiles add column if not exists capture text;
create index if not exists saas_ok_croissance_idx on public.saas (score_croissance desc nulls last, nom) where statut = 'ok';
