create or replace function public.prospects_no_auditor() returns trigger language plpgsql set search_path = public as $$
begin
  -- Le registre liste aussi les commissaires aux comptes : ce ne sont jamais des interlocuteurs commerciaux
  if new.contact_role ~* '(commissaire|suppl[ée]ant|auditeur)' then
    new.contact_name := ''; new.contact_role := '';
  end if;
  return new;
end $$;
drop trigger if exists prospects_no_auditor on public.prospects;
create trigger prospects_no_auditor before insert or update of contact_role on public.prospects for each row execute function public.prospects_no_auditor();
