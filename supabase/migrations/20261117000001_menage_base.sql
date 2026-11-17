-- Ménage de la base (443 Mo → 319 Mo sur 500 Mo du plan gratuit). Appliqué via MCP.
-- Les tables saas, saas_mobiles et saas_candidats gonflaient à cause des mises à jour fréquentes (place morte jamais rendue).
--   vacuum full analyze public.saas_mobiles; vacuum full analyze public.saas; vacuum full analyze public.saas_candidats;
-- Textes de pages de tarifs périmés (utilisés seulement 8 jours) : vidés.
update public.saas set prix_rendu = null where prix_rendu is not null and (prix_rendu_at is null or prix_rendu_at < now() - interval '8 days');
drop index if exists public.saas_mobiles_maj_idx; -- jamais utilisé
alter table public.saas set (autovacuum_vacuum_scale_factor = 0.03, autovacuum_analyze_scale_factor = 0.03);
alter table public.saas_mobiles set (autovacuum_vacuum_scale_factor = 0.05);
alter table public.saas_candidats set (autovacuum_vacuum_scale_factor = 0.05);
delete from cron.job_run_details where end_time < now() - interval '3 days';
select cron.schedule('bingoo-menage-logs', '23 4 * * *', $$delete from cron.job_run_details where end_time < now() - interval '3 days'$$);

-- Trouver mon SaaS : parmi les 30 SaaS retenus, ceux qui montent (+5 % ou plus sur 30 jours) passent devant.
-- Appliqué via MCP : dans saas_pour_moi_coeur, « json_agg(x order by x.note desc) » devient
--   json_agg(x order by coalesce(x.croissance >= 5, false) desc, x.note desc)

-- Fiches (appliqué via MCP) :
-- * 27 sites de paris, casinos et loteries sortis de la base (statut pas_saas, sauvegarde _paris_exclus) ; 22 applis de paris/poker/loterie
--   retirées de saas_mobiles (sauvegarde _mobiles_exclus). Le filtre INTERDIT bloque désormais ces sites à l'entrée.
-- * 160 phrases « fait » au vouvoiement passées au tutoiement (sauvegarde _fait_avant).
-- * Descriptions vides : reprises depuis la proposition TrustMRR ou la phrase « fait » quand elles existent ;
--   les autres fiches sans aucun texte repartent en lecture (statut a_lire, sauvegarde _sans_desc).

-- Accueil (appliqué via MCP) : la vitrine « La base de SaaS » ne montre que des SaaS que Bingoo! sait construire
-- (constructible et constructible_ia non refusé), puisque sa tuile propose de « lancer ta version ». Les questions
-- de « Bingoo! dans ton IA » restent sur toute la base.

-- Trouver mon SaaS : voir 20261117 « trouver_jamais_vide » (appliqué via MCP) — saas_pour_moi_coeur devient un repli
-- autour de saas_pour_moi_strict (catégorie, puis canaux/refus, puis objectif/audience/métier).
