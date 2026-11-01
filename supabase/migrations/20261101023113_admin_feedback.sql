-- Recopiée depuis l'historique de la base (appliquée le 01/11, absente du dépôt).
create or replace function public.admin_feedback() returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from admins where user_id = auth.uid()) then raise exception 'Accès réservé à l''administrateur'; end if;
  return coalesce((select jsonb_agg(x order by x->>'at' desc) from (
    select jsonb_build_object('at', f.created_at, 'ws', w.name, 'email', u.email, 'score', f.score, 'page', f.page, 'message', f.message) x
    from feedback f join workspaces w on w.id = f.workspace_id left join auth.users u on u.id = f.user_id
    order by f.created_at desc limit 30) q), '[]');
end $$;
revoke all on function public.admin_feedback() from public, anon;
grant execute on function public.admin_feedback() to authenticated;
