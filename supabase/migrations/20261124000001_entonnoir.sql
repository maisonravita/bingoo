-- Entonnoir visiteur → idée → aperçu → compte → construction → en ligne → payant.
-- Aucune donnée personnelle : des compteurs par jour (visites et idées saisies), le reste se lit dans les tables existantes,
-- sans les espaces des robots ni des tests.
create table if not exists public.entonnoir_jour (
  jour date not null default current_date,
  etape text not null check (etape in ('visite', 'idee')),
  n int not null default 0,
  primary key (jour, etape)
);
alter table public.entonnoir_jour enable row level security; -- aucune politique : écrit par la fonction, lu par l'admin

create or replace function public.entonnoir_compter(p_etape text)
returns void language sql security definer set search_path = public as $$
  insert into entonnoir_jour (jour, etape, n) select current_date, p_etape, 1 where p_etape in ('visite', 'idee')
  on conflict (jour, etape) do update set n = entonnoir_jour.n + 1;
$$;
grant execute on function public.entonnoir_compter(text) to anon, authenticated;

create or replace function public.admin_entonnoir(p_jours int default 30)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare depuis timestamptz := now() - make_interval(days => p_jours);
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  return jsonb_build_array(
    jsonb_build_object('etape', 'Visites de l''accueil', 'n', (select coalesce(sum(n), 0) from entonnoir_jour where etape = 'visite' and jour >= depuis::date)),
    jsonb_build_object('etape', 'Idées saisies', 'n', (select coalesce(sum(n), 0) from entonnoir_jour where etape = 'idee' and jour >= depuis::date)),
    jsonb_build_object('etape', 'Aperçus montrés', 'n', (select count(*) from activity a join workspaces w on w.id = a.workspace_id where a.kind in ('idee_apercu', 'site_apercu') and a.created_at > depuis and w.name not ilike '%robot%' and w.name not ilike '%test%')),
    jsonb_build_object('etape', 'Comptes créés', 'n', (select count(*) from auth.users u where u.created_at > depuis and not coalesce(u.is_anonymous, false) and coalesce(u.email, '') not ilike '%robot%' and coalesce(u.email, '') not ilike '%test%')),
    jsonb_build_object('etape', 'Constructions lancées', 'n', (select count(*) from saas_projets p join workspaces w on w.id = p.workspace_id where p.at > depuis and w.name not ilike '%robot%' and w.name not ilike '%test%' and w.name not ilike '%demo%')),
    jsonb_build_object('etape', 'Mis en ligne', 'n', (select count(*) from saas_apps a join workspaces w on w.id = a.workspace_id where a.at > depuis and a.statut = 'pret' and w.name not ilike '%robot%' and w.name not ilike '%test%' and w.name not ilike '%demo%')),
    jsonb_build_object('etape', 'Abonnés payants (aujourd''hui)', 'n', (select count(*) from workspaces w where w.plan not in ('essai') and w.plan_status = 'active' and w.name not ilike '%robot%' and w.name not ilike '%test%' and w.name not ilike '%demo%'))
  );
end $$;
