-- Salle de pilotage : objectif de la semaine, pipeline estimé, trois anneaux (réactivité, régularité, résultats),
-- part de marché par quartier, comptes stratégiques. Uniquement des données réelles ; les montants en euros
-- viennent des deux chiffres que le client saisit lui-même (valeur d'un client, part des rendez-vous qui signent).

-- Réglages : { objectif_rdv: 8, valeur_client: 3000, taux_signature: 33 }
alter table public.workspaces add column if not exists pilotage jsonb not null default '{}'::jsonb;

-- Compte stratégique : null = décidé par Bingoo! (taille de l'entreprise), true/false = choix du client
alter table public.prospects add column if not exists strategique boolean;

-- Réactivité : l'heure à laquelle une réponse a été traitée
alter table public.replies add column if not exists handled_at timestamptz;
create or replace function public.replies_handled_at() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.handled and not coalesce(old.handled, false) and new.handled_at is null then new.handled_at := now(); end if;
  return new;
end $$;
drop trigger if exists replies_handled_at on public.replies;
create trigger replies_handled_at before update of handled on public.replies for each row execute function public.replies_handled_at();

-- Régularité : les jours où quelqu'un de l'équipe a agi (réponse traitée, message validé, invitation LinkedIn validée)
create table if not exists public.pilotage_jours (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  jour date not null,
  primary key (workspace_id, jour)
);
alter table public.pilotage_jours enable row level security;
drop policy if exists pilotage_jours_read on public.pilotage_jours;
create policy pilotage_jours_read on public.pilotage_jours for select
  using (workspace_id in (select m.workspace_id from public.members m where m.user_id = (select auth.uid())));

create or replace function public.pilotage_jour(ws uuid) returns void language sql security definer set search_path to 'public' as $$
  insert into public.pilotage_jours (workspace_id, jour) values (ws, (now() at time zone 'Europe/Paris')::date) on conflict do nothing;
$$;
revoke all on function public.pilotage_jour(uuid) from public, anon, authenticated;

create or replace function public.pilotage_action() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_table_name = 'replies' and new.handled and not coalesce(old.handled, false) then perform public.pilotage_jour(new.workspace_id);
  elsif tg_table_name = 'prospects' and new.linkedin_status = 'a_envoyer' and coalesce(old.linkedin_status, '') = '' then perform public.pilotage_jour(new.workspace_id);
  elsif tg_table_name = 'messages' and new.status = 'envoye' and old.status is distinct from 'envoye'
    and (select autonomy from public.workspaces where id = new.workspace_id) is distinct from 'auto' then perform public.pilotage_jour(new.workspace_id);
  end if;
  return new;
end $$;
drop trigger if exists pilotage_action on public.replies;
create trigger pilotage_action after update of handled on public.replies for each row execute function public.pilotage_action();
drop trigger if exists pilotage_action on public.prospects;
create trigger pilotage_action after update of linkedin_status on public.prospects for each row execute function public.pilotage_action();
drop trigger if exists pilotage_action on public.messages;
create trigger pilotage_action after update of status on public.messages for each row execute function public.pilotage_action();
