-- 20 nov. 2026 : Bingoo! sait lancer TOUS les SaaS de la base. Plus de refus « pas constructible » :
-- Bingoo! construit la meilleure version possible, annonce ce qui est adapté, et le membre ajuste ensuite.
do $$
declare
  r record; def text; neuf text;
begin
  for r in select * from (values
    ('saas_preparer_lancement', ' and s.constructible_ia is true', ''),
    ('saas_a_copier', ' and s.constructible is not false', ''),
    ('saas_pour_moi_strict', 'where s.constructible is not false and s.m_mrr >= 2000 and exists (select 1 from saas v where not coalesce(v.revenu_suspect, false) and v.id = s.id and v.constructible_ia is not false)', 'where s.m_mrr >= 2000 and exists (select 1 from saas v where not coalesce(v.revenu_suspect, false) and v.id = s.id)'),
    ('saas_pour_moi_apercu', 'where s.constructible is not false and s.m_mrr >= 2000 and exists (select 1 from saas v where  not coalesce(v.revenu_suspect, false) and v.id = s.id and v.constructible_ia is not false)', 'where s.m_mrr >= 2000 and exists (select 1 from saas v where  not coalesce(v.revenu_suspect, false) and v.id = s.id)')
  ) as t(fn, avant, apres) loop
    select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = r.fn;
    if position(r.avant in def) = 0 then raise exception 'motif introuvable dans %', r.fn; end if;
    neuf := replace(def, r.avant, r.apres);
    execute neuf;
  end loop;
end $$;
