-- Essai gratuit « jusqu'au premier rendez-vous » : 45 jours au plus ; dès le premier rendez-vous obtenu,
-- il reste 7 jours pour décider (le client paie après avoir vu un résultat, pas avant).
alter table workspaces alter column trial_ends set default (current_date + 45);
update workspaces set trial_ends = greatest(trial_ends, (created_at at time zone 'Europe/Paris')::date + 45)
  where coalesce(plan, 'essai') = 'essai' and trial_ends is not null;

create or replace function public.essai_premier_rdv() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from 'annule' then
    update workspaces set trial_ends = least(trial_ends, current_date + 7)
      where id = new.workspace_id and coalesce(plan, 'essai') = 'essai' and trial_ends is not null
        and not exists (select 1 from meetings m where m.workspace_id = new.workspace_id and m.id <> new.id and m.status <> 'annule');
  end if;
  return new;
end $$;
drop trigger if exists essai_premier_rdv on meetings;
create trigger essai_premier_rdv after insert on meetings for each row execute function public.essai_premier_rdv();
