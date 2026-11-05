-- « Ton équipe cette nuit » : les villes déjà construites (immeubles et arbres OpenStreetMap), partagées entre les clients
-- pour que la carte s'ouvre en quelques secondes. Lecture publique (ce sont des données OpenStreetMap), écriture par le serveur seulement.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qg-villes', 'qg-villes', true, 15728640, array['application/gzip'])
on conflict (id) do nothing;
-- Retour arrière : delete from storage.objects where bucket_id = 'qg-villes'; delete from storage.buckets where id = 'qg-villes';
