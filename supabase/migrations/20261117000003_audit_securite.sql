-- Audit 17/11 : tables de sauvegarde fermées au public, radar_live réservé au serveur,
-- bingoo_sante n'expose plus le montant du crédit IA (appelable sans connexion).
alter table public._constr_avant enable row level security;
alter table public._paris_exclus enable row level security;
alter table public._fait_avant enable row level security;
alter table public._cats_autre_avant enable row level security;
alter table public._sans_desc enable row level security;
revoke execute on function public.radar_live() from anon, authenticated, public;
