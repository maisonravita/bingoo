-- Appliqué via MCP (concurrently) le 22/11 : saas_leaders et les tris par revenu vérifié passaient 2,2 s (délai dépassé pour les visiteurs) → 1,5 ms
create index concurrently if not exists saas_revenu_verifie_idx on public.saas (((succes->>'montant')::numeric) desc)
  where statut = 'ok' and succes->>'type' = 'revenu_verifie' and not coalesce(revenu_suspect, false);
