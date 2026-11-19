-- Résultats « Trouver mon SaaS » : aussi les SaaS pas encore vérifiés (vérifiés à la volée quand le membre lance sa version) ;
-- seuls ceux vérifiés « non constructibles » sont écartés.
do $$
declare r record; def text;
begin
  for r in select oid from pg_proc where pronamespace = 'public'::regnamespace and proname in ('saas_pour_moi_strict', 'saas_pour_moi_apercu', 'saas_a_copier', 'saas_pour_moi2') loop
    def := pg_get_functiondef(r.oid);
    def := regexp_replace(def, '(constructible(_ia)?) is true', '\1 is not false', 'g');
    execute def;
  end loop;
end $$;
