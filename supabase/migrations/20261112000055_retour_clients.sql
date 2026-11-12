-- Faire revenir les clients : alerte « Nouveau client sur ton SaaS ! » (cron bingoo-nouveaux-clients, toutes les 20 min → r/saas-nouveaux-clients)
-- et bloc « Toi cette semaine » dans l'e-mail du lundi (saas_ws_bilan). Appliqué via MCP.
alter table public.saas_app_users add column if not exists createur_prevenu_at timestamptz;
