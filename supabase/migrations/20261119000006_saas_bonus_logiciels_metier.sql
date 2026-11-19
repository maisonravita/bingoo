-- Trouver mon SaaS : les logiciels métier pour TPE françaises (santé, restauration, commerce, artisans, RH, CRM, immobilier, juridique,
-- comptabilité, beauté, sport, événementiel, logistique, éducation) passent devant les outils de réseaux sociaux et de gestion de projet.
do $$
declare def text; re text := 'sant|restaur|commerce|crm|vente|paie|rh\b|immobil|juridi|compta|factur|artisan|btp|beaut|sport|événement|evenement|logisti|transport|éducation|formation|tourisme|hôtel|hotel|agricul';
begin
  def := pg_get_functiondef('public.saas_pour_moi_strict'::regproc);
  def := replace(def, 'from h order by note desc, mrr desc limit 30',
    'from h order by note + (case when coalesce(categorie, '''') ~* ''' || re || ''' then 12 else 0 end) desc, mrr desc limit 30');
  def := replace(def, 'x.note desc), ''[]'')',
    'x.note + (case when coalesce(x.categorie, '''') ~* ''' || re || ''' then 12 else 0 end) desc), ''[]'')');
  if position('then 12 else 0' in def) = 0 then raise exception 'motif introuvable'; end if;
  execute def;
end $$;
