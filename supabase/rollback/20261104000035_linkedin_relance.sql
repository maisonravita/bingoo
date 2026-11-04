delete from public.linkedin_actions where kind = 'relance';
alter table public.linkedin_actions drop constraint if exists linkedin_actions_kind_check;
alter table public.linkedin_actions add constraint linkedin_actions_kind_check check (kind in ('invitation', 'verifier', 'message'));
