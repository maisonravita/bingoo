-- Source du décideur (registre, trouvé!, recherche web, extension, réservation)
alter table public.prospects add column if not exists contact_source text not null default '';
update public.prospects set contact_source = 'registre des dirigeants (INSEE)' where contact_source = '' and source = 'registre' and coalesce(contact_name, '') <> '';
update public.prospects set contact_source = 'LinkedIn (extension)' where contact_source = '' and source = 'extension' and coalesce(contact_name, '') <> '';
update public.prospects set contact_source = 'réservation en ligne' where contact_source = '' and source = 'réservation en ligne';
