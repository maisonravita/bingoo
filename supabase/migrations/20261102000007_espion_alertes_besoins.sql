-- Espion : alertes (dernier envoi), recherche hebdomadaire des besoins publics, nouveau type d'opportunité « besoin »
alter table public.workspaces add column if not exists spy_alert_at timestamptz, add column if not exists spy_needs_at timestamptz;
alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array['appel_offres','croissance','recrutement','besoin']));
