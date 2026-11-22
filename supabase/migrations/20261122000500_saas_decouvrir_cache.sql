-- La page publique lit un résultat préparé (une ligne), calculé à chaque mise à jour de la vitrine (avant : 5 à 8 s au chargement,
-- au-delà du délai des visiteurs). Appliquée via MCP le 22/11 (saas_decouvrir_cache + vitrine_maj_remplit_cache).
create table if not exists public.saas_decouvrir_cache (id int primary key default 1 check (id = 1), data json not null, at timestamptz not null default now());
alter table public.saas_decouvrir_cache enable row level security;
-- saas_decouvrir_calcul() : l'ancien corps de saas_decouvrir() (voir 20261122000300) ; saas_decouvrir() et saas_compte_public()
-- lisent saas_decouvrir_cache ; saas_vitrine_maj() le remplit en dernière étape.
