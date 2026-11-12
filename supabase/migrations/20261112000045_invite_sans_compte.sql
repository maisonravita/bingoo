-- Visiteurs sans compte (connexion anonyme) : pas d'annonce, de demande ni de clé de connecteur
create policy pas_invite on public.saas_annonces as restrictive for insert to authenticated with check (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);
create policy pas_invite on public.saas_demandes as restrictive for insert to authenticated with check (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);
create or replace function public.pas_invite() returns trigger language plpgsql as $$
begin
  if coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then raise exception 'Crée ton compte gratuit pour continuer.'; end if;
  return new;
end $$;
create trigger pas_invite before insert on public.saas_api_cles for each row execute function public.pas_invite();
