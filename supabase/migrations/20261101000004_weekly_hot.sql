alter table public.replies add column if not exists notified_at timestamptz;
alter table public.workspaces add column if not exists weekly_report boolean not null default true;

create or replace function public.notify_hot_reply() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.class in ('interesse','question','prix','rappel') then
    perform net.http_post(
      url := 'https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/m/hot',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-key',(select value from public.app_secrets where name='cron_key')),
      body := jsonb_build_object('reply_id', new.id),
      timeout_milliseconds := 30000);
  end if;
  return new;
end $$;
revoke all on function public.notify_hot_reply() from public, anon, authenticated;
drop trigger if exists replies_hot on public.replies;
create trigger replies_hot after insert on public.replies for each row execute function public.notify_hot_reply();

-- cron 'kairo-weekly' : lundi 7 h UTC (8 h Paris) → functions/v1/m/weekly
