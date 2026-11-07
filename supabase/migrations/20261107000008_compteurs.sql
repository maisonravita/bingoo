-- Tous les compteurs de la ville et de la liste en une seule requête (au lieu d'une trentaine).
-- security invoker : les règles d'accès (RLS) s'appliquent, chacun ne compte que ses propres espaces.
create or replace function public.compteurs(p_ws uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
  with t as (select now() as n, now() - interval '7 days' as w1, now() - interval '14 days' as w2, date_trunc('day', now()) as j0)
  select jsonb_build_object(
    -- réponses
    'rep', (select count(*) from replies where workspace_id = p_ws and handled = false),
    'repTotal', (select count(*) from replies where workspace_id = p_ws),
    'hot', (select count(*) from replies where workspace_id = p_ws and class in ('interesse','question','prix','rappel')),
    'rep7', (select count(*) from replies, t where workspace_id = p_ws and created_at >= t.w1),
    'repPrev', (select count(*) from replies, t where workspace_id = p_ws and created_at >= t.w2 and created_at < t.w1),
    -- messages
    'drafts', (select count(*) from messages where workspace_id = p_ws and status = 'brouillon'),
    'sent7', (select count(*) from messages, t where workspace_id = p_ws and status = 'envoye' and sent_at >= t.w1),
    'sentPrev', (select count(*) from messages, t where workspace_id = p_ws and status = 'envoye' and sent_at >= t.w2 and sent_at < t.w1),
    'sentTotal', (select count(*) from messages where workspace_id = p_ws and status = 'envoye' and step = 0),
    'sentAll', (select count(*) from messages where workspace_id = p_ws and status = 'envoye'),
    -- rendez-vous
    'rdv', (select count(*) from meetings, t where workspace_id = p_ws and status = 'confirme' and starts_at >= t.n),
    'rdvTotal', (select count(*) from meetings where workspace_id = p_ws and status <> 'annule'),
    'rdv7', (select count(*) from meetings, t where workspace_id = p_ws and status <> 'annule' and created_at >= t.w1),
    'rdvPrev', (select count(*) from meetings, t where workspace_id = p_ws and status <> 'annule' and created_at >= t.w2 and created_at < t.w1),
    -- Radar
    'opps', (select count(*) from radar_opps where workspace_id = p_ws and status = 'nouveau'),
    'chaudes', (select count(*) from radar_opps where workspace_id = p_ws and status = 'nouveau' and score >= 75),
    'opps7', (select count(*) from radar_opps, t where workspace_id = p_ws and created_at >= t.w1),
    'oppsPrev', (select count(*) from radar_opps, t where workspace_id = p_ws and created_at >= t.w2 and created_at < t.w1),
    -- prospects
    'found', (select count(*) from prospects where workspace_id = p_ws),
    'found7', (select count(*) from prospects, t where workspace_id = p_ws and created_at >= t.w1),
    'toContact', (select count(*) from prospects where workspace_id = p_ws and status in ('pret','a_valider')),
    'sentProspects', (select count(*) from prospects where workspace_id = p_ws and status in ('envoye','repondu','rdv','client','refus') and email <> ''),
    'replied', (select count(*) from prospects where workspace_id = p_ws and status in ('repondu','rdv','client','refus')),
    'rdvProspects', (select count(*) from prospects where workspace_id = p_ws and status in ('rdv','client')),
    'clients', (select count(*) from prospects where workspace_id = p_ws and status = 'client'),
    'li', (select count(*) from prospects where workspace_id = p_ws and linkedin_status = 'a_envoyer'),
    'liTodo', (select count(*) from prospects where workspace_id = p_ws and linkedin_status = '' and linkedin_note <> '' and status not in ('ignore','refus')),
    'dec', (select count(*) from prospects where workspace_id = p_ws and contact_name <> '' and status <> 'ignore'),
    'mails', (select count(*) from prospects where workspace_id = p_ws and email <> '' and status <> 'ignore'),
    'tels', (select count(*) from prospects where workspace_id = p_ws and phone <> '' and status <> 'ignore'),
    'mailDirect', (select count(*) from prospects where workspace_id = p_ws and email <> '' and status <> 'ignore' and email !~* '^(contact|info|infos|sales|vente|ventes|hello|bonjour|accueil|commercial|marketing|support|admin|office|secretariat|direction|reclamation[a-z.-]*|service[a-z.-]*|rh|recrutement|jobs|team|equipe)@'),
    'todo', (select count(*) from prospects where workspace_id = p_ws and status = 'nouveau'),
    'ready', (select count(*) from prospects where workspace_id = p_ws and status = 'pret'),
    'hard', (select count(*) from prospects where workspace_id = p_ws and status = 'sans_email' and enrich_level < 2),
    'rivals', (select count(*) from competitors where workspace_id = p_ws)
  );
$$;
grant execute on function public.compteurs(uuid) to authenticated;
