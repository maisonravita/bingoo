-- Base saturée la nuit (validé par Jean le 22/11), appliquée via MCP :
-- 1. Lecture des nouveaux SaaS : 2 lecteurs toutes les 2 minutes au lieu de 8 chaque minute
update public.cron_dispatch set actif = false where jobname in ('bingoo-explorer-decouvertes-2','bingoo-explorer-decouvertes-3','bingoo-explorer-decouvertes-4','bingoo-explorer-decouvertes-5','bingoo-explorer-decouvertes-6','bingoo-explorer-decouvertes-7');
update public.cron_dispatch set every_min = 2, command = replace(command, '"parts":8', '"parts":2') where jobname in ('bingoo-explorer-decouvertes','bingoo-explorer-decouvertes-1');
-- 2. saas_constructible_maj tournait 3 fois : on garde celle des 3 h (cron 62)
update public.cron_dispatch set actif = false where jobname = 'bingoo-constructible-maj';
-- 3. Dimanche : vacuum analyze au lieu de vacuum full (qui bloquait la table)
select cron.alter_job(76, command := 'vacuum analyze public.saas');
select cron.alter_job(77, command := 'vacuum analyze public.saas_mobiles');
