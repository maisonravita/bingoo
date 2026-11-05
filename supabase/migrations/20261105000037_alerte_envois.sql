-- Alerte quotidienne : deux contrôles de plus. 1) des messages programmés qui auraient dû partir et ne sont pas partis ;
-- 2) une boîte connectée dont les réponses ne sont plus relevées depuis plus d'un jour.
-- On ajoute ces lignes à la fonction existante (sans la réécrire), pour ne rien perdre de ce qu'elle contrôle déjà.
do $do$
declare def text := pg_get_functiondef('public.platform_incidents'::regproc);
begin
  if position('toujours pas partis' in def) > 0 then return; end if;
  def := replace(def, $x$  ) q $function$$x$, $x$    union all
    select w.name || ' : ' || count(*) || ' envoi(s) en retard (prévus il y a plus de 3 h, toujours pas partis)' from messages m join workspaces w on w.id = m.workspace_id
      where m.status = 'brouillon' and m.due_at is not null and m.due_at < now() - interval '3 hours' and m.due_at > now() - interval '3 days' and w.autonomy = 'auto'
      group by w.name
    union all
    select 'Boîte de ' || w.name || ' : réponses plus relevées depuis le ' || to_char(((w.integrations->'mailbox'->>'imap_at')::timestamptz), 'DD/MM HH24:MI')
      from workspaces w where (w.integrations->'mailbox'->>'ok')::boolean is true and (w.integrations->'mailbox'->>'imap_at') is not null
      and (w.integrations->'mailbox'->>'imap_at')::timestamptz < now() - interval '26 hours'
  ) q $function$$x$);
  execute def;
end $do$;
-- Retour arrière : rejouer la définition de platform_incidents de 20261103000031_fiabilite.sql
