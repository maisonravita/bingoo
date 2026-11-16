-- Audit du 16/11 (appliqué via MCP) :
-- 1. saas_valider_idee : revenu et croissance de chaque concurrent masqués sans abonnement ('verrouille'),
--    les chiffres agrégés (médiane, nombre) restent visibles pour le score.
-- 2. saas_favoris_liste : revenu masqué sans abonnement + champ 'vitrine'.
-- 3. Données : ~190 noms de société remplacés par le nom du produit (sauvegarde public._noms_avant),
--    entités HTML décodées, 61 sites de jeux d'argent / adultes / IA sans garde-fou passés en pas_saas
--    (sauvegarde public._exclus_audit), 6 applis casino/paris sortis (public._mobiles_exclus),
--    catégories d'applis anglaises traduites.
-- 4. cron bingoo-pitch-fr mis en pause (appelait toutes les 10 min une tâche IA en pause).
select 1;
