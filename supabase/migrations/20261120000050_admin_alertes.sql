-- Alertes pour l'administrateur : écran d'un modèle fait main livré en échec (souci de données, à corriger à la main sous 24 h)
create table if not exists public.admin_alertes (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  workspace_id uuid references workspaces(id) on delete cascade,
  app_id uuid references saas_apps(id) on delete cascade,
  ecran text,
  texte text not null,
  traitee_at timestamptz
);
alter table public.admin_alertes enable row level security;
create index if not exists admin_alertes_ouvertes on public.admin_alertes (at desc) where traitee_at is null;
create unique index if not exists admin_alertes_unique_ouverte on public.admin_alertes (app_id, ecran) where traitee_at is null;

create or replace function public.admin_alertes_liste()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'at', a.at, 'texte', a.texte, 'ecran', a.ecran, 'app', s.slug, 'nom', s.spec->>'nom', 'client', w.name) order by a.at desc), '[]'::jsonb)
    from admin_alertes a left join saas_apps s on s.id = a.app_id left join workspaces w on w.id = a.workspace_id where a.traitee_at is null);
end $$;
create or replace function public.admin_alerte_traitee(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  update admin_alertes set traitee_at = now() where id = p_id;
end $$;
revoke all on function public.admin_alertes_liste() from public, anon;
revoke all on function public.admin_alerte_traitee(uuid) from public, anon;
grant execute on function public.admin_alertes_liste() to authenticated;
grant execute on function public.admin_alerte_traitee(uuid) to authenticated;
