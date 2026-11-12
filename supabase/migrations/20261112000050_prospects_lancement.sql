-- Prospects trouvés par Bingoo! pour lancer « ta version », et leur suivi
create table if not exists public.saas_prospects_lancement (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  domaine text not null,
  siret text not null,
  nom text not null,
  adresse text, ville text, code_postal text, dirigeant text, prenom text, depuis text, maps text,
  etat text not null default '' check (etat in ('', 'contacte', 'repondu', 'essai', 'payant', 'non')),
  note text,
  created_at timestamptz not null default now(),
  maj timestamptz not null default now(),
  unique (workspace_id, domaine, siret)
);
alter table public.saas_prospects_lancement enable row level security;
create policy gerer on public.saas_prospects_lancement for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create index if not exists saas_prospects_lancement_ws on public.saas_prospects_lancement (workspace_id, domaine);
create or replace function public.saas_paye_ws(p_ws uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspaces w where w.id = p_ws and (w.plan = 'fondateur' or (w.plan in ('explorer','explorer_pro','business','solo','pro') and w.plan_status in ('active','trialing','past_due'))));
$$;
revoke all on function public.saas_paye_ws(uuid) from public, anon, authenticated;
