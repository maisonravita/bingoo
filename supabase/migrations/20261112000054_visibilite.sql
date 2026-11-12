-- Visibilité : saas_pour_moi3 renvoie visiteurs, autorite, rang_web, rang_web_avant, pubs_actives (MCP) ;
-- historique hebdomadaire saas_visibilite + saas_visibilite_releve() + cron bingoo-visibilite (lundi 4h37 UTC)
create table if not exists public.saas_visibilite (
  saas_id uuid not null references public.saas(id) on delete cascade,
  jour date not null default current_date,
  visiteurs numeric, autorite numeric, pubs_actives int, rang_web int,
  primary key (saas_id, jour)
);
