-- Recopiée depuis l'historique de la base (appliquée le 01/11, absente du dépôt).
create table if not exists public.suppressions (email text primary key, created_at timestamptz not null default now(), source text not null default 'formulaire');
alter table public.suppressions enable row level security;

create or replace function public.opt_out(p_email text) returns boolean language plpgsql security definer set search_path to 'public' as $$
declare e text := lower(trim(p_email));
begin
  if e !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' or length(e) > 200 then raise exception 'Adresse e-mail invalide'; end if;
  insert into suppressions(email) values (e) on conflict do nothing;
  update prospects set status = 'refus', next_action_at = null, next_action = '',
    notes = coalesce(nullif(notes,'') || E'\n', '') || 'Opposition à toute sollicitation (formulaire public) le ' || to_char(now(), 'DD/MM/YYYY')
  where lower(email) = e and status <> 'refus';
  update messages set status = 'ignore', error = 'Opposition du destinataire'
  where status = 'brouillon' and prospect_id in (select id from prospects where lower(email) = e);
  return true;
end $$;
revoke all on function public.opt_out(text) from public;
grant execute on function public.opt_out(text) to anon, authenticated;

create or replace function public.enforce_suppression() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.email is not null and new.email <> '' and exists (select 1 from suppressions where email = lower(new.email)) then
    new.status := 'refus';
  end if;
  return new;
end $$;
revoke all on function public.enforce_suppression() from public, anon, authenticated;
drop trigger if exists prospects_suppression on public.prospects;
create trigger prospects_suppression before insert or update of email, status on public.prospects for each row execute function public.enforce_suppression();
