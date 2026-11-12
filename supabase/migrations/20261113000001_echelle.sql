-- Tenir la charge : vue matérialisée saas_choix (SaaS au revenu vérifié, champs extraits, rafraîchie chaque heure par le cron bingoo-saas-choix),
-- lue par saas_pour_moi3 et saas_pour_moi_apercu (5 fois plus rapides) ; index pour les alertes et l'accompagnement. Appliqué via MCP.
create index if not exists saas_app_users_a_prevenir on public.saas_app_users (app_id) where createur_prevenu_at is null and (abonnement->>'statut') in ('active','past_due');
create index if not exists saas_app_users_app_statut on public.saas_app_users (app_id, (abonnement->>'statut'));
create index if not exists saas_lancements_envoi on public.saas_lancements (emails, dernier_envoi);
create index if not exists saas_preferences_ws on public.saas_preferences (workspace_id);
