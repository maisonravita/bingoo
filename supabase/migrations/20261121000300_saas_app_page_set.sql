-- Page de présentation d'un SaaS écrite par le moteur de pages : enregistrée sans écraser les écrans écrits en parallèle
create or replace function public.saas_app_page_set(p_app uuid, p_page jsonb, p_gen jsonb)
returns text language plpgsql security definer set search_path to 'public' as $$
declare b jsonb; s jsonb;
begin
  select brouillon, spec into b, s from saas_apps where id = p_app for update;
  if b is not null then
    b := jsonb_set(b, '{site}', coalesce(b->'site', '{}'::jsonb) || case when p_page is null then '{}'::jsonb else jsonb_build_object('page', p_page) end);
    b := jsonb_set(b, '{gen}', coalesce(p_gen, '{}'::jsonb));
    update saas_apps set brouillon = b, maj = now() where id = p_app;
    return 'brouillon';
  end if;
  if s is null then return 'absent'; end if;
  s := jsonb_set(s, '{site}', coalesce(s->'site', '{}'::jsonb) || case when p_page is null then '{}'::jsonb else jsonb_build_object('page', p_page) end);
  s := jsonb_set(s, '{gen}', coalesce(p_gen, '{}'::jsonb));
  update saas_apps set spec = s, version = version + case when p_page is null then 0 else 1 end, maj = now() where id = p_app;
  return 'spec';
end $$;
revoke all on function public.saas_app_page_set(uuid, jsonb, jsonb) from public, anon, authenticated;
