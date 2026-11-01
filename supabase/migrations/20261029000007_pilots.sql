-- Suivi des pilotes : temps passé (minutes actives par jour) et avis
create table if not exists public.usage (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  minutes int not null default 0,
  primary key (workspace_id, user_id, day)
);
alter table public.usage enable row level security;
create policy usage_select on public.usage for select to authenticated using (public.is_member(workspace_id));
revoke insert, update, delete on public.usage from authenticated, anon;
create or replace function public.track_usage(ws uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_member(ws) then return; end if;
  insert into public.usage (workspace_id, user_id, day, minutes) values (ws, auth.uid(), (now() at time zone 'Europe/Paris')::date, 1)
  on conflict (workspace_id, user_id, day) do update set minutes = least(public.usage.minutes + 1, 1440);
end $$;
revoke execute on function public.track_usage(uuid) from public, anon;
grant execute on function public.track_usage(uuid) to authenticated;
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  score int check (score between 0 and 10),
  would_pay text not null default '',
  message text not null default '',
  page text not null default '',
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
create policy fb_select on public.feedback for select to authenticated using (public.is_member(workspace_id));
create policy fb_insert on public.feedback for insert to authenticated with check (public.is_member(workspace_id) and user_id = (select auth.uid()));
grant select, insert on public.feedback to authenticated;
