-- Marchés de niche : appliquée via MCP (saas_niches_marche, saas_niches_ia, saas_marches_niche_rpc, cron)
-- Marchés de niche : chaque SaaS reçoit une niche (sujet précis) déduite de ses étiquettes et de sa description, sans IA.
create table if not exists public.saas_niches_def (niche text primary key, motif text not null, ordre int not null, emoji text);
alter table public.saas_niches_def enable row level security;
truncate public.saas_niches_def;
insert into public.saas_niches_def (ordre, niche, emoji, motif) values
 (1,'Facturation électronique','🧾','facturation électronique|e-invoicing|factur-x|chorus pro'),
 (2,'Signature électronique','✍️','signature électronique|e-signature|signature en ligne'),
 (3,'Visibilité dans les IA (GEO)','🔮','visibilité ia|visibilité dans les (réponses|moteurs) ia|\mgeo\M|\maeo\M|chatgpt seo|llm seo|ai search'),
 (4,'Prise de rendez-vous','📅','rendez-vous|prise de rdv|réservation en ligne|booking|agenda en ligne'),
 (5,'Notes de frais et dépenses','💳','notes? de frais|gestion des dépenses|cartes d.entreprise|émission de cartes'),
 (6,'Paie et RH','👥','\mpaie\M|sirh|congés|ressources humaines|gestion rh|services rh|\mdrh\M|onboarding des salariés'),
 (7,'Recrutement','🎯','recrut|\mats\M|candidat|sourcing|staffing'),
 (8,'Prospection LinkedIn','🔗','linkedin'),
 (9,'Cold e-mail et délivrabilité','📨','prospection par e-?mail|cold e-?mail|délivrabilité|vérification d.e-?mails|warm-?up'),
 (10,'Données B2B et enrichissement','🗂️','enrichissement|données b2b|données entreprises|signaux d.achat|leads qualifiés|base de données de prospects'),
 (11,'CRM','🤝','\mcrm\M|relation client|pipeline commercial'),
 (12,'Emailing et newsletters','✉️','emailing|e-?mail marketing|newsletter|e-?mails transactionnels|marketing automation|automatisation marketing'),
 (13,'SMS et WhatsApp','💬','\msms\M|whatsapp'),
 (14,'Réseaux sociaux','📱','planification de (posts|publications|contenus)|réseaux sociaux|community manag|publication automatique|écoute sociale|instagram|tiktok'),
 (15,'SEO','🔎','\mseo\M|référencement|mots-clés|backlink'),
 (16,'Vidéo et contenu IA','🎬','vidéo|rédaction|copywriting|humani[sz]|génération de contenu|contenu ia|sous-titres|voix'),
 (17,'Images et design IA','🎨','\mdesign|images?\M|logo|photo|avatar|retouche'),
 (18,'Support client et chat','🛟','support client|service client|help ?desk|chat en direct|ticket|boîte partagée|chatbot|centre de contact|customer success'),
 (19,'Agents IA','🤖','agents? ia|ai agents?|assistant ia'),
 (20,'Automatisation et no-code','⚙️','automatisation de workflows|no-code|sans code|zapier|intégrations'),
 (21,'Gestion de projet','📋','gestion de projets?|kanban|gantt|équipes projet|gestion des tâches'),
 (22,'Plannings et suivi du temps','⏱️','suivi du temps|plannings?|feuilles? de temps|pointage'),
 (23,'Formation en ligne','🎓','formation|e-learning|cours en ligne|lms\M'),
 (24,'Avis et preuve sociale','⭐','preuve sociale|avis clients?|témoignages|reviews'),
 (25,'Fidélisation','🎁','fidélisation|programme de parrainage|cartes? de fidélité'),
 (26,'Boutique en ligne','🛒','shopify|boutique en ligne|vente en ligne|produits numériques|e-commerçants|woocommerce'),
 (27,'Paiements et abonnements','💰','paiements?|abonnements|facturation à l.usage|checkout'),
 (28,'Facturation et devis','🧮','factur|devis|relances? (de factures|automatiques)|recouvrement'),
 (29,'Comptabilité','📒','comptab|expert-?compt|gestion de la tva|bilan'),
 (30,'Banque et trésorerie','🏦','banque|néobanque|trésorerie|open banking|fintech|paiements internationaux'),
 (31,'Analytics et tests A/B','📊','analyse de (trafic|performances)|analytics|tests a/b|heatmap|suivi des conversions'),
 (32,'Sites et landing pages','🌐','landing pages?|sites? web|créateur de sites?|wordpress|hébergement web|no-code site'),
 (33,'Événements et billetterie','🎟️','billetterie|événement|festival|organisateurs'),
 (34,'Cybersécurité','🛡️','cybersécurité|\mvpn\M|siem|contrôle d.accès|détection de fraude|fraude|mots de passe'),
 (35,'Conformité et RGPD','📜','conformité|rgpd|gouvernance'),
 (36,'Juridique','⚖️','juridique|avocats|notaires|contrats|legal'),
 (37,'Immobilier','🏠','immobili|promoteurs|gestion locative|syndic|location courte'),
 (38,'Santé','🩺','santé|téléconsultation|médic|patients|kiné|dentaire'),
 (39,'BTP et artisans','🔨','\mbtp\M|construction|artisans|bureaux d.études|chantier'),
 (40,'Éducation','🏫','écoles|enseignants|étudiants|éducation|élèves'),
 (41,'Logistique et livraison','📦','logistique|expédition|colis|supply chain|livraison|entrepôt'),
 (42,'Restaurants','🍽️','restaurant|restauration|menu|commande à table'),
 (43,'Outils développeurs','🧑‍💻','\mapi\M|devops|kubernetes|observabilité|feature flags|open[- ]source|base de données|déploiement|monitoring'),
 (44,'Téléphonie','☎️','téléphonie|standard téléphonique|appels'),
 (45,'Communication interne','📣','intranet|communication interne'),
 (46,'Formulaires et sondages','📝','formulaires?|sondages?|enquêtes?|études de marché|questionnaires?'),
 (47,'Voyage','✈️','voyage|déplacements'),
 (48,'Associations','🤲','associations|dons\M|collecte de fonds'),
 (49,'Pubs et acquisition','📢','campagnes publicitaires|publicité|\mads\M|génération de leads|acquisition'),
 (50,'Prospection et ventes','📞','prospection|équipes commerciales|automatisation des ventes|commerciaux|ventes\M');

alter table public.saas add column if not exists niche text;
create index if not exists saas_niche_idx on public.saas (niche) where statut = 'ok';

create or replace function public.saas_niche_de(p_tags text[], p_desc text) returns text language sql stable set search_path = public as $$
  -- d'abord les étiquettes (plus précises), puis la description
  select coalesce(
    (select d.niche from saas_niches_def d where lower(array_to_string(coalesce(p_tags, '{}'), ' | ')) ~* d.motif order by d.ordre limit 1),
    (select d.niche from saas_niches_def d where lower(coalesce(p_desc, '')) ~* d.motif order by d.ordre limit 1))
$$;

create or replace function public.saas_niche_trg() returns trigger language plpgsql set search_path = public as $$
begin new.niche := saas_niche_de(new.tags, new.description); return new; end $$;
drop trigger if exists saas_niche_trg on public.saas;
create trigger saas_niche_trg before insert or update of tags, description on public.saas for each row execute function public.saas_niche_trg();

update public.saas set niche = saas_niche_de(tags, description) where statut = 'ok';

alter table public.saas add column if not exists niche_ia boolean not null default false;
create or replace function public.saas_marches_niche(p_genre text default null) returns jsonb language sql stable security definer set search_path = public as $$
with base as (
  select s.*, (s.succes->>'montant')::numeric montant,
    nullif(replace(replace(s.succes->>'croissance_30j', '%', ''), ',', '.'), '')::numeric crois
  from saas s where s.statut = 'ok' and s.niche is not null and (p_genre is null or s.genre = p_genre)
),
publics as (
  select niche, jsonb_agg(t order by k desc) filter (where rn <= 3) publics from (
    select niche, t, count(*) k, row_number() over (partition by niche order by count(*) desc, t) rn
    from base, unnest(tags) t
    where t ~* '^(pme|tpe|eti|grands comptes|grandes entreprises|grands groupes|petites entreprises|micro-entreprises|startups|start-ups|indépendants|freelances|agences|particuliers|développeurs|créateurs|créateurs de contenu|e-commerçants|artisans|commerçants|coachs|consultants|formateurs|associations|collectivités|secteur public|cabinets.*|professionnels de santé|équipes .*|entrepreneurs|étudiants|enseignants|écoles|marques|recruteurs|comptables|experts-comptables|community managers|marketeurs|organisateurs d.événements)$'
    group by niche, t) x group by niche
),
agg as (
  select b.niche, d.emoji,
    count(*) n,
    count(*) filter (where b.pays = 'FR') fr,
    count(*) filter (where b.pays is not null and b.pays <> 'FR') etranger,
    count(*) filter (where b.montant is not null) prouves,
    count(*) filter (where b.montant between 6000 and 6000000) indes,
    percentile_cont(0.5) within group (order by b.montant) filter (where b.montant between 6000 and 6000000) indes_med,
    count(*) filter (where b.montant >= 100000000) geants,
    percentile_cont(0.5) within group (order by b.prix_entree_eur) filter (where b.prix_entree_eur > 0) prix_med,
    min(b.prix_entree_eur) filter (where b.prix_entree_eur > 0) prix_min,
    max(b.prix_entree_eur) filter (where b.prix_entree_eur > 0) prix_max,
    count(*) filter (where b.gratuit) gratuits,
    count(*) filter (where b.recrute) recrutent,
    count(*) filter (where b.nouveaute >= current_date - 30) nouveautes,
    count(*) filter (where b.copiable >= 60) copiables,
    round(avg(b.crois) filter (where b.crois is not null), 1) croissance,
    count(*) filter (where b.crois is not null) avec_croissance,
    (array_agg(jsonb_build_object('nom', b.nom, 'domaine', b.domaine, 'montant', b.montant, 'preuve', b.succes->>'preuve', 'type', b.succes->>'type')
       order by b.montant desc) filter (where b.montant between 6000 and 6000000))[1] meilleur_inde,
    (array_agg(jsonb_build_object('nom', b.nom, 'domaine', b.domaine, 'pays', b.pays) order by b.montant desc nulls last, b.copiable desc nulls last, b.rang_web nulls last))[1:4] exemples
  from base b join saas_niches_def d on d.niche = b.niche
  group by b.niche, d.emoji
)
select coalesce(jsonb_agg(z order by (z->>'score')::numeric desc), '[]') from (
  select to_jsonb(a) || jsonb_build_object('publics', coalesce(p.publics, '[]'),
    'verdict', case when a.indes >= 1 and a.n <= 15 then 'rentable'
                    when a.n >= 25 then 'disputee'
                    when a.geants >= 1 and a.indes = 0 then 'geants'
                    when a.prouves = 0 then 'a_prouver' else 'ouverte' end,
    'score', a.indes * 25 + least(a.copiables, 5) * 6 + (case when a.n <= 15 then 15 when a.n <= 25 then 5 else -10 end)
             + coalesce(least(a.croissance, 50), 0) / 2 - a.geants * 3 + least(a.recrutent, 5) * 2 + least(a.nouveautes, 5) * 2) z
  from agg a left join publics p using (niche)
) q
$$;

create or replace function public.saas_niche_detail(p_niche text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('domaine', domaine, 'nom', nom, 'description', description, 'pays', pays, 'prix', prix_entree_eur,
    'gratuit', gratuit, 'genre', genre, 'copiable', copiable, 'recrute', recrute, 'preuve', succes->>'preuve', 'type', succes->>'type',
    'montant', (succes->>'montant')::numeric, 'croissance', succes->>'croissance_30j')
    order by (succes->>'montant')::numeric desc nulls last, copiable desc nulls last, rang_web nulls last), '[]')
  from (select * from saas where statut = 'ok' and niche = p_niche order by (succes->>'montant')::numeric desc nulls last, copiable desc nulls last limit 60) s
$$;
grant execute on function public.saas_marches_niche(text), public.saas_niche_detail(text) to authenticated, anon;
select cron.schedule('bingoo-explorer-niches', '41 * * * *', $$select net.http_post(url:='https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/r/saas-niches', headers:=jsonb_build_object('Content-Type','application/json','x-cron-key',(select value from app_secrets where name='cron_key')), body:='{}'::jsonb, timeout_milliseconds:=150000)$$);
