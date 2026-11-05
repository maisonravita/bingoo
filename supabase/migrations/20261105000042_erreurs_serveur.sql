-- Erreurs des fonctions (réponses 500) : gardées 30 jours et ajoutées au contrôle quotidien de la plateforme,
-- qui ne voyait jusqu'ici que les tâches planifiées. Les délais d'attente des appels « lancer puis oublier » des tâches
-- planifiées (5 s, la fonction continue derrière) ne sont plus comptés comme des pannes.
create table if not exists public.server_errors (
  id bigserial primary key, at timestamptz not null default now(),
  fonction text not null default '', message text not null default '', workspace_id uuid
);
alter table public.server_errors enable row level security;
create index if not exists server_errors_at on public.server_errors (at);

create or replace function public.purge_client_errors() returns void language sql security definer set search_path = public as $$
  delete from client_errors where at < now() - interval '30 days';
  delete from server_errors where at < now() - interval '30 days';
$$;

do $do$
declare def text := pg_get_functiondef('public.platform_incidents'::regproc);
begin
  if position('server_errors' in def) > 0 then return; end if;
  def := replace(def, $x$(h.status_code is null or h.status_code >= 500)$x$, $x$((h.status_code is null and coalesce(h.error_msg, '') not ilike 'Timeout of %') or h.status_code >= 500)$x$);
  def := replace(def, $x$  ) q $function$$x$, $x$    union all
    select 'Fonction « ' || e.fonction || ' » : ' || count(*) || ' erreur(s) sur 24 h, dernière : ' || left(max(e.message), 140) from server_errors e
      where e.at > now() - interval '24 hours' group by e.fonction
  ) q $function$$x$);
  execute def;
end $do$;
