-- Retour arrière de 20261102000003_mission_state.sql : colonnes retirées ; platform_incidents à remettre depuis 20261101000002_platform_incidents.sql
alter table public.missions drop column if exists state, drop column if exists state_text, drop column if exists last_error, drop column if exists errors, drop column if exists last_step_at;
