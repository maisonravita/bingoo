-- Visiteurs sans compte jamais convertis : espace et utilisateur anonymes supprimés après 30 jours
create or replace function public.nettoyer_invites() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from workspaces w where w.profile->>'invite' = 'true'
    and not exists (select 1 from members m join auth.users u on u.id = m.user_id where m.workspace_id = w.id and coalesce(u.is_anonymous, false) = false)
    and w.created_at < now() - interval '30 days';
  delete from auth.users where is_anonymous and created_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.nettoyer_invites() from public, anon, authenticated;
select cron.schedule('bingoo-nettoyage-invites', '41 3 * * *', 'select public.nettoyer_invites()');
