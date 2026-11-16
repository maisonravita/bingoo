-- Qualité des données (16/11/2026, sans IA) : fiches non-logiciels écartées (médias, forums, romans…), fiches vides mises de côté,
-- noms-accroches remplacés par le nom tiré de l'adresse, catégories « Autre » reclassées, cible B2B/B2C déduite,
-- difficulté de construction estimée (colonne difficulte + fonction saas_difficulte + déclencheur saas_estimations_trg).
-- Vue saas_liste : colonne difficulte ajoutée. Texte complet dans la base.
alter table public.saas add column if not exists difficulte smallint;
-- saas_a_copier : renvoie aussi image, difficulte, cible (cartes « À lancer »). saas_stats_entete : renvoie aussi le nombre d'applis.
