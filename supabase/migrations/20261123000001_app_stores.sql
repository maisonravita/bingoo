-- Publication des apps sur l'App Store et Google Play, avec les comptes du membre (jamais son mot de passe) :
-- une clé API App Store Connect et un compte de service Google Play, rangés dans le coffre chiffré (Vault).
-- Le robot de compilation (GitHub Actions, déclenché seulement par planification ou à la main) lit les demandes en attente.

create table if not exists public.app_publications (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.saas_apps(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plateforme text not null check (plateforme in ('ios', 'android')),
  statut text not null default 'attente' check (statut in ('attente', 'construction', 'envoyee', 'erreur')),
  identifiant text not null,          -- bundle iOS ou paquet Android (fr.bingoo.<slug>)
  numero int not null default 1,      -- numéro de compilation, augmente à chaque envoi
  fichiers jsonb,                     -- la coque (App.js, nom, couleur, adresse) au moment de la demande
  message text,                       -- dernier message lisible par le membre (jamais une clé)
  lien text,                          -- lien de la compilation (ex. le fichier .aab pour le premier envoi manuel sur Google Play)
  at timestamptz not null default now(),
  maj timestamptz not null default now()
);
create index if not exists app_publications_attente on public.app_publications (statut, at);
alter table public.app_publications enable row level security;
drop policy if exists app_publications_membres on public.app_publications;
create policy app_publications_membres on public.app_publications for select using (is_member(workspace_id));

-- Les clés : seulement une référence au coffre et un aperçu non secret (identifiant de clé, adresse du compte de service)
create table if not exists public.app_stores_cles (
  app_id uuid not null references public.saas_apps(id) on delete cascade,
  plateforme text not null check (plateforme in ('ios', 'android')),
  secret_id uuid not null,
  apercu text,
  at timestamptz not null default now(),
  primary key (app_id, plateforme)
);
alter table public.app_stores_cles enable row level security; -- aucune politique : lisible seulement par le service

create or replace function public.stores_cle_poser(p_app uuid, p_plateforme text, p_secret text, p_apercu text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare v uuid; nom text := 'stores:' || p_app::text || ':' || p_plateforme;
begin
  select secret_id into v from public.app_stores_cles where app_id = p_app and plateforme = p_plateforme;
  if v is null then
    v := vault.create_secret(p_secret, nom, 'Clé de publication sur les stores');
  else
    perform vault.update_secret(v, p_secret, nom, 'Clé de publication sur les stores');
  end if;
  insert into public.app_stores_cles (app_id, plateforme, secret_id, apercu) values (p_app, p_plateforme, v, left(p_apercu, 120))
  on conflict (app_id, plateforme) do update set secret_id = excluded.secret_id, apercu = excluded.apercu, at = now();
end $$;
revoke all on function public.stores_cle_poser(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.stores_cle_retirer(p_app uuid, p_plateforme text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare v uuid;
begin
  delete from public.app_stores_cles where app_id = p_app and plateforme = p_plateforme returning secret_id into v;
  if v is not null then delete from vault.secrets where id = v; end if;
end $$;
revoke all on function public.stores_cle_retirer(uuid, text) from public, anon, authenticated;
