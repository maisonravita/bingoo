-- Essais gratuits du client : domaines d'entreprise qui s'inscrivent (jamais l'adresse complète)
create table if not exists public.trial_signups (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  domain text not null,
  n int not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (workspace_id, domain)
);
alter table public.trial_signups enable row level security;
drop policy if exists trial_signups_read on public.trial_signups;
create policy trial_signups_read on public.trial_signups for select using (workspace_id in (select workspace_id from public.members where user_id = auth.uid()));
create or replace function public.trial_hit(p_ws uuid, p_domain text) returns void language sql security definer set search_path = public as $$
  insert into trial_signups (workspace_id, domain) values (p_ws, p_domain)
  on conflict (workspace_id, domain) do update set
    n = case when trial_signups.last_at < now() - interval '30 days' then 1 else trial_signups.n + 1 end,
    first_at = case when trial_signups.last_at < now() - interval '30 days' then now() else trial_signups.first_at end,
    last_at = now();
$$;
revoke all on function public.trial_hit(uuid, text) from public, anon, authenticated;
