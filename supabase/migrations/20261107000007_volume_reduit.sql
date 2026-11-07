-- Moins de messages, mais meilleurs : 10 premiers messages par jour par défaut (au lieu de 20)
alter table workspaces alter column daily_limit set default 10;
update workspaces set daily_limit = 10 where daily_limit = 20;
