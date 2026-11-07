-- Garantie « premier rendez-vous » : date du premier paiement, posée une fois quand l'abonnement devient actif
alter table workspaces add column if not exists paid_since timestamptz;
alter table workspaces add column if not exists referral_code text unique;
alter table workspaces add column if not exists referred_by uuid references workspaces(id) on delete set null;
alter table workspaces add column if not exists perks jsonb not null default '[]'::jsonb;

create or replace function set_paid_since() returns trigger language plpgsql as $$
begin
  if new.plan_status = 'active' and new.paid_since is null and new.plan not in ('essai', 'fondateur') then
    new.paid_since := now();
  end if;
  return new;
end $$;
drop trigger if exists trg_paid_since on workspaces;
create trigger trg_paid_since before insert or update of plan_status, plan on workspaces for each row execute function set_paid_since();

-- Code de parrainage court, lisible, pour chaque espace
update workspaces set referral_code = lower(substr(replace(id::text, '-', ''), 1, 8)) where referral_code is null;
create or replace function set_referral_code() returns trigger language plpgsql as $$
begin
  if new.referral_code is null then new.referral_code := lower(substr(replace(new.id::text, '-', ''), 1, 8)); end if;
  return new;
end $$;
drop trigger if exists trg_referral_code on workspaces;
create trigger trg_referral_code before insert on workspaces for each row execute function set_referral_code();
