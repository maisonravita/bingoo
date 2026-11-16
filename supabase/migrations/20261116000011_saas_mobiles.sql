-- Applis mobiles de l'Explorer (App Store, données publiques, collecte sans IA : workflow « Explorer – applis mobiles »)
create table if not exists public.saas_mobiles (
  id bigint primary key, nom text not null, editeur text, categorie text, description text,
  note numeric(3,2), avis integer, prix numeric(8,2), devise text, abonnement boolean default false,
  icone text, url text, site text, sortie date, maj date,
  rang_revenus integer, rang_pays text, rang_categorie text,
  created_at timestamptz default now(), vu_at timestamptz default now()
);
alter table public.saas_mobiles enable row level security;
create index if not exists saas_mobiles_avis_idx on public.saas_mobiles (avis desc nulls last);
create index if not exists saas_mobiles_rang_idx on public.saas_mobiles (rang_revenus) where rang_revenus is not null;
create index if not exists saas_mobiles_cat_idx on public.saas_mobiles (categorie);
-- saas_mobiles_liste(p_q, p_categorie, p_tri, p_abonnement, p_offset) et saas_mobiles_categories() : security definer,
-- exécutables par authenticated et service_role (texte complet dans la base).
-- Connecteur : quota mensuel par clé
alter table public.saas_api_cles add column if not exists appels_mois integer default 0, add column if not exists mois text;
-- Validateur d'idée sans IA : saas_valider_idee(p_texte) (security definer, authenticated + service_role) et index plein texte
-- saas_ok_texte_idx / saas_mobiles_texte_idx (texte complet dans la base).
