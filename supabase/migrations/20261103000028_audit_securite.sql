-- Audit du 03/11 : compteur atomique pour les limites (outils gratuits, réservations), fonction ai_cost figée,
-- et colonne autonomy (envoi automatique) réservée aux administrateurs de l'espace.

-- 1. Compteur atomique : incrémente et renvoie la nouvelle valeur (des requêtes simultanées ne passent plus toutes)
create or replace function public.hit(p_key text, p_day date) returns integer language sql volatile security definer set search_path = public as $$
  insert into free_hits(key, day, n) values (p_key, p_day, 1)
  on conflict (key, day) do update set n = free_hits.n + 1
  returning n;
$$;
revoke all on function public.hit(text, date) from public, anon, authenticated;
grant execute on function public.hit(text, date) to service_role;

-- 2. search_path figé (avertissement de sécurité Supabase)
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'ai_cost') then
    execute (select format('alter function public.ai_cost(%s) set search_path = public', pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'ai_cost' limit 1);
  end if;
end $$;

-- 3. Le passage en envoi automatique se fait par une route qui exige le rôle admin (k/autonomy), plus en écriture directe
revoke update (autonomy) on public.workspaces from authenticated;

-- 4. Réponses : empreinte du message pour ne traiter qu'une fois le même e-mail (reçu par Bingoo et dans la boîte du client),
--    sans ignorer un deuxième message différent du même prospect
alter table public.replies add column if not exists dedupe_key text;
create unique index if not exists replies_dedupe on public.replies (workspace_id, dedupe_key) where dedupe_key is not null;

-- 5. Cibles toujours sous forme de liste (une valeur d'un autre type faisait planter les missions en boucle)
update public.workspaces set targets = '[]'::jsonb where targets is null or jsonb_typeof(targets) <> 'array';
alter table public.workspaces drop constraint if exists workspaces_targets_array;
alter table public.workspaces add constraint workspaces_targets_array check (jsonb_typeof(targets) = 'array');
