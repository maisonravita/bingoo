-- 27 nov. 2026 : pack de démarrage (paiement unique, un mois de Site ou de SaaS) : date de fin du mois offert par le pack
alter table public.workspaces add column if not exists pack_ends date;
