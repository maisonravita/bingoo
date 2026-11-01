revoke execute on function public.is_member(uuid) from anon, public;
revoke execute on function public.track_usage(uuid) from anon, public;
revoke execute on function public.create_workspace(text, text) from anon, public;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.track_usage(uuid) to authenticated;
grant execute on function public.create_workspace(text, text) to authenticated;
