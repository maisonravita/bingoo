-- Correctif : le déclencheur lisait new.handled même sur messages et prospects (« record "new" has no field "handled" »),
-- ce qui pouvait bloquer la mise à jour d'un message. Chaque champ n'est plus lu que dans la branche de sa table.
create or replace function public.pilotage_action() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'replies' then
    if new.handled and not coalesce(old.handled, false) then perform public.pilotage_jour(new.workspace_id); end if;
  elsif tg_table_name = 'prospects' then
    if new.linkedin_status = 'a_envoyer' and coalesce(old.linkedin_status, '') = '' then perform public.pilotage_jour(new.workspace_id); end if;
  elsif tg_table_name = 'messages' then
    if new.status = 'envoye' and old.status is distinct from 'envoye'
      and (select autonomy from public.workspaces where id = new.workspace_id) is distinct from 'auto' then perform public.pilotage_jour(new.workspace_id); end if;
  end if;
  return new;
end $$;
