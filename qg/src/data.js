// La nuit de l'équipe Bingoo!, à partir des vraies données de l'espace, dans l'ordre où les choses se sont passées :
// Léo trouve les entreprises, Max, Sam et Lina les étudient, Sam trouve les e-mails, Hugo et Inès écrivent et envoient,
// Inès lit les réponses, Lina fait LinkedIn, Paul prépare les rendez-vous, Max va voir les opportunités du Radar,
// Oscar surveille les concurrents (Espion). Rien n'est inventé : sans activité ces dernières 24 heures, on rejoue la
// dernière nuit de travail et on le dit. La priorité sur 100 est une règle simple, expliquée point par point.
import { supabase } from '../../src/lib/supabase.js';
import { step } from './progress.js';

const DAY = 24 * 3600 * 1000;
const BAD = /^(?:(?:rgpd|gdpr|privacy|dataprotection|data-protection|donnees-?personnelles|cnil)[a-z._-]*|dpo(?:[._-][a-z._-]*)?|noreply|no-reply|donotreply|webmaster)@/i;
const host = (u) => String(u ?? '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
const dist = (a, b) => Math.hypot((a.lat - b.lat) * 110540, (a.lon - b.lon) * 111320 * Math.cos((b.lat * Math.PI) / 180));
const clean = (s) => String(s ?? '').replace(/<cite[^>]*>|<\/cite>/g, '').replace(/\s*(?:publi[ée]e?\s+)?(?:au|dans le)\s+BODACC/gi, '').replace(/\s+/g, ' ').trim();
const role = (r) => String(r ?? '').replace(/\s*\(.*$/, '').trim();
const title = (s) => String(s ?? '').toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const cut = (s, n = 90) => { s = clean(s); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
const hm = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const ts = (d) => new Date(d).getTime();
const R = 2000; // demi-côté de la ville affichée, en mètres

export class QgError extends Error { constructor(msg, link) { super(msg); this.link = link; } }

const KIND = { recrutement: 'Recrute', croissance: 'Se développe', appel_offres: "Appel d'offres", besoin: 'Cherche une solution', renouvellement: 'Contrat à renouveler', dirigeant: 'Nouveau dirigeant', demenagement: 'Déménage', creation: 'Création ou ouverture', site: 'Site modifié', levee: 'Levée de fonds', permis: 'Permis de construire', aide: 'Aide publique', budget: 'Projet voté', salon: 'Salon', difficulte: 'Difficultés' };
const REPLY = { interesse: ['Intéressé !', 'good'], rdv: ['Veut un rendez-vous !', 'good'], rappel: ['Demande à être rappelé', 'good'], plus_tard: ['Plus tard', ''], absent: ['Absent pour le moment', ''], refus: ['Pas intéressé', 'bad'], stop: ['Ne veut plus de messages', 'bad'], desinscription: ['Ne veut plus de messages', 'bad'] };

/* ------------------------------------------------------------------ positions (gardées dans le navigateur) */
const store = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? '{}'); } catch { return {}; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage plein */ } };
async function pool(list, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < list.length) await fn(list[i++]); })); }

/** Prospects : Base Adresse Nationale. */
async function geocode(list, onStep) {
  const cache = store('bingoo-qg-geo');
  // déjà placés la nuit par Bingoo! (Base Adresse Nationale) : rien à demander
  for (const p of list) if (p.geo_at) cache[p.id] = p.geo_lat != null ? [p.geo_lat, p.geo_lon, 1] : [0, 0, 0];
  const todo = list.filter((p) => !cache[p.id]);
  let n = 0;
  await pool(todo, 5, async (p) => {
    onStep?.(++n, todo.length);
    const q = [p.address, p.postal_code && !String(p.address ?? '').includes(p.postal_code) ? p.postal_code : '', p.city && !String(p.address ?? '').toLowerCase().includes(String(p.city).toLowerCase()) ? p.city : '']
      .filter(Boolean).join(' ').replace(/^.*?\b(\d+[\d-]*\s+(?:rue|bd|boulevard|avenue|av|place|impasse|chemin|route|allée|allee|quai|cours|square|passage|zac|za|zi|rond-point)\b)/i, '$1');
    if (!q.trim()) { cache[p.id] = [0, 0, 0]; return; }
    try {
      const u = `https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(q.slice(0, 200))}${p.postal_code ? `&postcode=${encodeURIComponent(p.postal_code)}` : ''}`;
      const f = (await (await fetch(u)).json()).features?.[0];
      cache[p.id] = f ? [f.geometry.coordinates[1], f.geometry.coordinates[0], f.properties.score] : [0, 0, 0];
    } catch { /* adresse introuvable : hors de la carte */ }
  });
  save('bingoo-qg-geo', cache);
  for (const p of list) { const g = cache[p.id]; if (g && g[2] >= 0.45) { p.lat = g[0]; p.lon = g[1]; } }
}
/** Opportunités et concurrents : le siège, d'après le SIREN (Recherche d'entreprises, data.gouv). */
async function sirenPlace(list) {
  const cache = store('bingoo-qg-siren');
  await pool([...new Set(list.map((x) => x.siren).filter((s) => /^\d{9}$/.test(s ?? '') && !cache[s]))], 3, async (s) => {
    try {
      const r = (await (await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${s}&per_page=1`)).json()).results?.[0];
      const g = r?.siege;
      cache[s] = g?.latitude ? [Number(g.latitude), Number(g.longitude), g.adresse ?? ''] : [0, 0, ''];
    } catch { /* pas trouvé : hors de la carte */ }
  });
  save('bingoo-qg-siren', cache);
  for (const x of list) { const g = cache[x.siren]; if (g?.[0]) { x.lat = g[0]; x.lon = g[1]; x.address = x.address || title(g[2]); } }
}

/* ------------------------------------------------------------------ la priorité, expliquée */
function priorite(p, email, opp) {
  const raisons = [];
  let score = 30;
  const add = (pts, texte) => { score += pts; raisons.push({ pts, texte }); };
  const sig = (Array.isArray(p.signals) ? p.signals : []).filter((x) => x?.label);
  const fort = sig.find((x) => !['taille', 'reseau'].includes(x.type));
  if (opp) add(20, `opportunité du Radar : ${KIND[opp.kind] ?? 'signal'}`);
  else if (fort) add(20, `signal d'achat : ${cut(fort.label, 60)}`);
  if (p.contact_name) add(15, 'décideur identifié');
  if (sig.some((x) => /\b(20|50|100|200|250|500)\s*à\b/.test(x.label))) add(10, 'équipe de plus de 20 personnes');
  if (email) add(20, 'e-mail vérifié'); else add(-15, "pas encore d'e-mail vérifié");
  return { score: Math.max(0, Math.min(100, score)), raisons };
}

/* ------------------------------------------------------------------ les données d'une période */
const PCOLS = 'id, name, address, postal_code, city, activity, contact_name, contact_role, email, website, phone, signals, status, created_at, enriched_at, geo_lat, geo_lon, geo_at';
async function collect(wsId, start, end) {
  const s = new Date(start).toISOString(), e = new Date(end).toISOString();
  const soon = new Date(Date.now() + DAY).toISOString(), now = new Date().toISOString();
  const [pc, pe, mc, msent, rp, li, mt, ro, co] = await Promise.all([
    supabase.from('prospects').select(PCOLS).eq('workspace_id', wsId).neq('status', 'ignore').gt('created_at', s).lte('created_at', e).order('created_at').limit(80),
    supabase.from('prospects').select(PCOLS).eq('workspace_id', wsId).neq('status', 'ignore').gt('enriched_at', s).lte('enriched_at', e).order('enriched_at').limit(60),
    supabase.from('messages').select('id, prospect_id, subject, body, status, step, created_at').eq('workspace_id', wsId).eq('status', 'brouillon').gt('created_at', s).lte('created_at', e).order('created_at').limit(40),
    supabase.from('messages').select('id, prospect_id, subject, status, step, sent_at').eq('workspace_id', wsId).eq('status', 'envoye').gt('sent_at', s).lte('sent_at', e).order('sent_at').limit(40),
    supabase.from('replies').select('id, prospect_id, class, summary, created_at, handled').eq('workspace_id', wsId).gt('created_at', s).lte('created_at', e).order('created_at').limit(30),
    supabase.from('linkedin_actions').select('id, prospect_id, kind, result, done_at').eq('workspace_id', wsId).gt('done_at', s).lte('done_at', e).order('done_at').limit(40),
    supabase.from('meetings').select('id, prospect_id, starts_at, company, status, created_at').eq('workspace_id', wsId).eq('status', 'confirme').gte('starts_at', now).lte('starts_at', soon).order('starts_at').limit(10),
    supabase.from('radar_opps').select('id, kind, title, company, why, city, siren, prospect_id, status, score, created_at, url').eq('workspace_id', wsId).in('status', ['nouveau', 'ajoute']).gt('created_at', s).lte('created_at', e).order('created_at').limit(40),
    supabase.from('competitors').select('id, name, url, summary, checked_at, changed_at, history').eq('workspace_id', wsId).neq('status', 'archive').or(`changed_at.gt.${s},checked_at.gt.${s}`).limit(12),
  ]);
  return {
    created: pc.data ?? [], enriched: pe.data ?? [], drafts: mc.data ?? [], sent: msent.data ?? [], replies: rp.data ?? [], li: li.data ?? [],
    meetings: mt.data ?? [], opps: ro.data ?? [], rivals: (co.data ?? []).filter((c) => ts(c.changed_at ?? 0) > ts(s) || ts(c.checked_at ?? 0) > ts(s)),
  };
}
const size = (d) => d.created.length + d.enriched.length + d.drafts.length + d.sent.length + d.replies.length + d.li.length + d.opps.length + d.rivals.length;

/** Les prospects cités (réponses, messages, LinkedIn, rendez-vous, opportunités) qu'on n'a pas encore. */
async function withProspects(d, wsId, known) {
  const map = new Map(known);
  for (const p of [...d.created, ...d.enriched]) map.set(p.id, p);
  const need = [...new Set([...d.drafts, ...d.sent, ...d.replies, ...d.li, ...d.meetings, ...d.opps].map((x) => x.prospect_id).filter((id) => id && !map.has(id)))];
  for (let i = 0; i < need.length; i += 80) {
    const { data } = await supabase.from('prospects').select(PCOLS).eq('workspace_id', wsId).in('id', need.slice(i, i + 80));
    for (const p of data ?? []) map.set(p.id, p);
  }
  return map;
}

/* ------------------------------------------------------------------ la nuit en gestes */
function Timeline() {
  const ev = [];
  let seq = 0;
  return {
    ev,
    add(at, agent, type, place_id, data) { ev.push({ seq: ++seq, run_id: 'nuit', t: at, agent, type, place_id, data }); },
    sorted() { return ev.sort((a, b) => a.t - b.t || a.seq - b.seq).map((e, i) => ({ ...e, seq: i + 1 })); },
  };
}

function prospectPlace(p, ws, extra = {}) {
  return {
    id: p.id, kind: 'prospect', name: title(p.name), lat: p.lat, lon: p.lon,
    address: [title(p.address), p.postal_code && !String(p.address ?? '').includes(p.postal_code) ? p.postal_code : ''].filter(Boolean).join(' ') || title(p.city),
    website: p.website || null, phone: p.phone || null, type: String(p.activity ?? '').split('(')[0].trim() || 'Entreprise',
    decideur: p.contact_name ? [p.contact_name, role(p.contact_role)].filter(Boolean).join(', ') : null, ws_id: ws.id, prospect_id: p.id, ...extra,
  };
}

/** Transforme une période en gestes, pour les lieux qui tiennent dans la ville affichée. */
function toEvents(d, prospects, ws, box, opts = {}) {
  const T = Timeline();
  const placed = new Set(opts.placed ?? []);
  const seen = opts.seen ?? new Set();
  const once = (k) => (seen.has(k) ? false : (seen.add(k), true));
  const inBox = (x) => x?.lat && Math.abs((x.lat - box.lat) * 110540) < R * 0.98 && Math.abs((x.lon - box.lon) * 111320 * Math.cos((box.lat * Math.PI) / 180)) < R * 0.98;
  const reveal = (at, place) => { if (placed.has(place.id)) return; placed.add(place.id); T.add(at, 'eclaireur', 'found', place.id, { ...place, visite: !!opts.live }); };
  const P = (id) => { const p = prospects.get(id); return p && inBox(p) ? p : null; };
  const emailOf = (p) => (p?.email && !BAD.test(p.email) ? p.email.toLowerCase() : null);
  const oppOf = new Map(d.opps.filter((o) => o.prospect_id).map((o) => [o.prospect_id, o]));
  const drafts = new Map(d.drafts.map((m) => [m.prospect_id, m]));
  let lect = 0;

  // 1. Léo trouve, Max, Sam et Lina étudient (signaux, décideur), Sam cherche l'e-mail
  const studied = new Map();
  for (const p of d.created) if (P(p.id)) studied.set(p.id, ts(p.created_at));
  for (const p of d.enriched) if (P(p.id) && !studied.has(p.id)) studied.set(p.id, ts(p.enriched_at));
  for (const [id, at] of studied) {
    const p = prospects.get(id), email = emailOf(p), m = drafts.get(id);
    if (!once(`s:${id}:${p.enriched_at ?? ''}`)) continue;
    reveal(at, prospectPlace(p, ws, m ? { message_id: m.id } : {}));
    const enriched = p.enriched_at && ts(p.enriched_at) >= opts.start;
    const agent = enriched ? 'lecteur-1' : ['lecteur-2', 'lecteur-3'][lect++ % 2];
    const sig = (Array.isArray(p.signals) ? p.signals : []).filter((x) => x?.label).slice(0, 4);
    const fort = sig.find((x) => !['taille', 'reseau'].includes(x.type));
    const dec = p.contact_name ? [p.contact_name, role(p.contact_role)].filter(Boolean).join(', ') : '';
    const bingoo = [];
    if (fort) bingoo.push([false, clean(fort.label)]);
    for (const x of sig) if (x !== fort) bingoo.push([true, clean(x.label)]);
    if (dec) bingoo.push([true, `Décideur identifié : ${dec}`]);
    if (email) bingoo.push([true, 'E-mail vérifié']);
    const { score, raisons } = priorite(p, email, oppOf.get(id));
    T.add(at + 1, agent, 'start', id, { name: title(p.name), site: p.website || null });
    if (p.activity) T.add(at + 2, agent, 'step', id, { texte: `Registre : ${String(p.activity).split('(')[0].trim()}` });
    for (const x of sig) T.add(at + 3, agent, 'step', id, { texte: `Signal : ${clean(x.label)}` });
    if (dec) T.add(at + 4, agent, 'step', id, { texte: `Décideur : ${dec}` });
    if (enriched) {
      if (p.website) T.add(at + 5, agent, 'step', id, { texte: `J'ouvre ${host(p.website)}` });
      T.add(at + 6, agent, 'step', id, { texte: email ? `E-mail vérifié : ${email}` : "Pas d'e-mail vérifiable trouvé pour l'instant" });
    } else if (!email) T.add(at + 6, agent, 'step', id, { texte: "E-mail : Sam le cherchera" });
    T.add(at + 7, agent, 'done', id, { name: title(p.name), score, retenu: Boolean(email), raisons, raison: email ? null : "pas encore d'e-mail vérifié", email, email_source: null, signals: { site: Boolean(p.website), bingoo }, telephones: p.phone ? [p.phone] : [] });
  }

  // 2. Hugo et Inès préparent les messages (pour les contacts vérifiés)
  let red = 0;
  for (const m of d.drafts) {
    const p = P(m.prospect_id), email = emailOf(p);
    if (!p || !email || !once(`m:${m.id}`)) continue;
    const at = ts(m.created_at);
    reveal(at - 1, prospectPlace(p, ws, { message_id: m.id }));
    if (!studied.has(p.id)) T.add(at - 1, 'lecteur-1', 'done', p.id, { name: title(p.name), ...priorite(p, email, oppOf.get(p.id)), retenu: true, email, signals: { site: Boolean(p.website), bingoo: [[true, 'E-mail vérifié']] }, telephones: p.phone ? [p.phone] : [] });
    const agent = m.step > 0 ? 'redacteur-1' : ['redacteur-1', 'redacteur-2'][red++ % 2];
    T.add(at, agent, 'start', p.id, { name: title(p.name) });
    T.add(at + 1, agent, 'done', p.id, { name: title(p.name), objet: m.subject, mail: m.body, to: email, constat: '', message_id: m.id, step: m.step });
  }

  // 3. Hugo envoie (premiers messages et relances)
  for (const m of d.sent) {
    const p = P(m.prospect_id);
    if (!p || !once(`e:${m.id}`)) continue;
    const at = ts(m.sent_at);
    reveal(at - 1, prospectPlace(p, ws));
    T.add(at, 'redacteur-1', 'visit', p.id, { etat: 'envoye', bulle: m.step > 0 ? `Relance n° ${m.step} partie` : 'E-mail envoyé', statut: `Envoie à ${title(p.name)}`, fait: m.step > 0 ? 'Relance envoyée' : 'E-mail envoyé', journal: [`${hm(m.sent_at)} · ${m.step > 0 ? `relance n° ${m.step}` : 'premier e-mail'} envoyé : « ${cut(m.subject, 70)} »`] });
  }

  // 4. Inès lit les réponses
  for (const r of d.replies) {
    const p = P(r.prospect_id);
    if (!p || !once(`r:${r.id}`)) continue;
    const at = ts(r.created_at);
    reveal(at - 1, prospectPlace(p, ws));
    const [bulle, ton] = REPLY[r.class] ?? ['Réponse reçue', ''];
    T.add(at, 'redacteur-2', 'visit', p.id, { etat: 'repondu', bulle, ton, prio: ton === 'good' ? 3 : 1, statut: `Lit la réponse de ${title(p.name)}`, fait: 'Réponse lue', journal: [`${hm(r.created_at)} · réponse reçue${r.summary ? ` : ${cut(r.summary, 120)}` : ''}`], patch: { reponse: { classe: r.class, resume: r.summary ?? '' } } });
  }

  // 5. Lina sur LinkedIn
  const LI = { invitation: 'Invitation LinkedIn envoyée', message: 'Message LinkedIn envoyé', relance: 'Relance LinkedIn envoyée', verifier: 'Invitation vérifiée', visite: 'Profil LinkedIn visité', retirer: 'Vieille invitation retirée', trouver: 'Profil LinkedIn trouvé' };
  for (const a of d.li) {
    const p = P(a.prospect_id);
    const res = String(a.result ?? '').split(' : ')[0];
    if (!p || !['ok', 'connecte', 'repondu', 'deja_connecte', 'deja_invite'].includes(res) || !once(`l:${a.id}`)) continue;
    const at = ts(a.done_at);
    reveal(at - 1, prospectPlace(p, ws));
    const bulle = res === 'connecte' || res === 'deja_connecte' ? 'Invitation acceptée !' : res === 'repondu' ? 'A répondu sur LinkedIn !' : LI[a.kind] ?? 'LinkedIn';
    T.add(at, 'lecteur-3', 'visit', p.id, { etat: 'li', bulle, prio: /accept|répondu/.test(bulle) ? 3 : 1, statut: `LinkedIn : ${title(p.name)}`, fait: bulle, journal: [`${hm(a.done_at)} · ${bulle}`] });
  }

  // 6. Paul prépare les rendez-vous à venir
  for (const m of d.meetings) {
    const p = P(m.prospect_id);
    if (!p || !once(`t:${m.id}`)) continue;
    const at = Math.min(Date.now() - 60000, opts.end);
    reveal(at - 1, prospectPlace(p, ws));
    const when = new Date(m.starts_at).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    T.add(at, 'paul', 'visit', p.id, { etat: 'rdv', bulle: `Rendez-vous ${when} : fiche prête`, prio: 3, statut: `Prépare le rendez-vous`, fait: 'Fiche de rendez-vous prête', journal: [`Rendez-vous ${when} : fiche de préparation prête dans l'Agenda`] });
  }

  // 7. Max va voir les opportunités du Radar
  for (const o of d.opps) {
    const p = o.prospect_id ? P(o.prospect_id) : null;
    const spot = p ?? (inBox(o) ? o : null);
    if (!spot || !once(`o:${o.id}`)) continue;
    const at = ts(o.created_at);
    const id = p ? p.id : `opp-${o.id}`;
    if (p) reveal(at - 1, prospectPlace(p, ws));
    else reveal(at - 1, { id, kind: 'opp', name: title(o.company || o.title), lat: o.lat, lon: o.lon, address: o.address || title(o.city), type: KIND[o.kind] ?? 'Opportunité', website: null, url: o.url || null, ws_id: ws.id });
    T.add(at, 'lecteur-2', 'visit', id, { etat: 'opp', bulle: `${KIND[o.kind] ?? 'Opportunité'} !`, prio: 2, statut: `Radar : ${title(o.company || o.title)}`, fait: 'Opportunité repérée', journal: [`Radar · ${KIND[o.kind] ?? 'opportunité'} : ${cut(o.title, 110)}`, ...(o.why ? [`Pourquoi c'est pour toi : ${cut(o.why, 140)}`] : [])], patch: { opp: { kind: o.kind, titre: o.title, url: o.url } } });
  }

  // 8. Oscar surveille les concurrents (Espion)
  for (const c of d.rivals) {
    if (!inBox(c) || !once(`c:${c.id}:${c.changed_at ?? c.checked_at}`)) continue;
    const at = Math.max(ts(c.changed_at ?? 0), ts(c.checked_at ?? 0));
    const id = `rival-${c.id}`;
    const alerte = clean(c.summary?.alerte?.titre ?? '');
    const changes = clean((Array.isArray(c.history) ? c.history.at(-1)?.changes : '') ?? '');
    reveal(at - 1, { id, kind: 'rival', name: c.name, lat: c.lat, lon: c.lon, address: c.address || '', type: 'Concurrent', website: c.url || null, ws_id: ws.id });
    T.add(at, 'oscar', 'visit', id, { etat: 'rival', bulle: changes && changes !== 'première analyse' ? 'Du nouveau chez ce concurrent' : 'Rien de neuf, je surveille', ton: '', prio: 1, statut: `Surveille ${c.name}`, fait: 'Ronde terminée', journal: [alerte ? cut(alerte, 160) : `Site ${host(c.url)} relu`, ...(changes && changes !== 'première analyse' ? [`Changement : ${cut(changes, 120)}`] : [])] });
  }
  return { events: T.sorted(), placed, seen };
}

/** Le centre de la ville : là où il se passe le plus de choses (2 km autour). */
function pickCentre(points, pick) {
  const clusters = [];
  const used = new Set();
  const dens = new Map(points.map((p) => [p, points.filter((x) => dist(p, x) < R).length]));
  const sorted = [...points].sort((a, b) => dens.get(b) - dens.get(a));
  for (const p of sorted) {
    if (used.has(p)) continue;
    const near = points.filter((x) => !used.has(x) && dist(p, x) < R);
    near.forEach((x) => used.add(x));
    const lat = near.reduce((a, x) => a + x.lat, 0) / near.length, lon = near.reduce((a, x) => a + x.lon, 0) / near.length;
    const villes = {};
    for (const x of near) { const c = title(x.city ?? ''); if (c) villes[c] = (villes[c] ?? 0) + 1; }
    clusters.push({ lat, lon, n: near.length, ville: Object.entries(villes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '' });
    if (clusters.length >= 6) break;
  }
  return { clusters, centre: clusters[pick] ?? clusters[0] };
}

/* ------------------------------------------------------------------ la nuit */
let ctx = null; // pour le direct : l'espace, la ville, les lieux déjà posés, la dernière lecture

export async function buildNight({ zone = 0, premiere = false } = {}) {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new QgError('Connecte-toi à Bingoo! pour voir ton équipe.', '/');
  const { data: wss } = await supabase.from('workspaces').select('id, name, integrations, domain_status, qg_zones').order('created_at');
  let wsId = null;
  try { wsId = localStorage.getItem('kairo-ws'); } catch { /* stockage indisponible */ }
  const ws = wss?.find((w) => w.id === wsId) ?? wss?.[0];
  if (!ws) throw new QgError('Crée d’abord ton espace Bingoo!.', '/');

  step(6, 'Ton équipe rassemble la nuit…');
  let end = Date.now(), start = end - DAY, recent = true;
  let d = await collect(ws.id, start, end);
  if (!size(d)) {
    // Rien ces dernières 24 heures : la dernière nuit de travail
    const { data: last } = await supabase.from('activity').select('created_at').eq('workspace_id', ws.id).order('created_at', { ascending: false }).limit(1);
    const { data: lastP } = await supabase.from('prospects').select('created_at').eq('workspace_id', ws.id).order('created_at', { ascending: false }).limit(1);
    const t = Math.max(ts(last?.[0]?.created_at ?? 0), ts(lastP?.[0]?.created_at ?? 0));
    if (!t) throw new QgError('Ton équipe n’a encore rien fait. Reviens demain matin : elle travaille chaque nuit.', '/#/');
    end = t + 1000; start = end - DAY; recent = false;
    d = await collect(ws.id, start, end);
  }
  step(12, 'Lecture de tout ce que l’équipe a fait…');
  const prospects = await withProspects(d, ws.id, []);
  step(16, 'On place tes prospects sur la carte…');
  await Promise.all([geocode([...prospects.values()], (i, n) => step(16 + Math.round((i / n) * 8), 'On place tes prospects sur la carte…', `${i} sur ${n}`)), sirenPlace([...d.opps.filter((o) => !o.prospect_id), ...d.rivals.map((c) => Object.assign(c, { siren: c.summary?.fiche?.siren }))])]);
  const points = [...[...prospects.values()].filter((p) => p.lat), ...d.opps.filter((o) => o.lat), ...d.rivals.filter((c) => c.lat)];
  if (!points.length) throw new QgError('Impossible de placer ton activité sur la carte (adresses introuvables).', '/#/prospects');
  const { clusters, centre } = pickCentre(points, zone);
  // centre arrondi au centième de degré : les clients d'une même ville partagent la même carte
  centre.lat = Math.round(centre.lat * 100) / 100; centre.lon = Math.round(centre.lon * 100) / 100;
  // une zone préparée la nuit à moins de 1,5 km : on la prend, sa ville est déjà téléchargée (ouverture en quelques secondes)
  const prete = (Array.isArray(ws.qg_zones) ? ws.qg_zones : []).map((z) => [z, dist(z, centre)]).filter(([, m]) => m < 1500).sort((a, b) => a[1] - b[1])[0]?.[0];
  if (prete) { centre.lat = prete.lat; centre.lon = prete.lon; }
  step(26, `Direction ${centre.ville || 'ta zone'}…`);
  const ville = centre.ville || 'ta zone';
  const { events, placed, seen } = toEvents(d, prospects, ws, centre, { start, end });
  if (!events.length) throw new QgError('Rien à montrer dans cette zone pour l’instant.', '/#/');
  const nPlaces = placed.size;
  const total = new Set([...prospects.keys(), ...d.opps.map((o) => o.id), ...d.rivals.map((c) => c.id)]).size;
  const ailleurs = Math.max(0, total - nPlaces);

  // le début : Iris lance la nuit, Léo lit les registres ; la fin : le bilan
  const t0 = events[0].t - 5000;
  const date = new Date(end).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const head = [
    { seq: 0, run_id: 'nuit', t: t0, agent: 'chef', type: 'start', place_id: null, data: {
      metier: 'entreprises', ville, centre, nombre: nPlaces, rayon: R,
      annonce: premiere ? `Ta toute première mission, à ${ville} !` : recent ? `Cette nuit à ${ville} : ${nPlaces} lieu${nPlaces > 1 ? 'x' : ''} à voir !` : `Notre dernière nuit de travail, à ${ville}.`,
      annonce2: 'Léo, montre-leur.',
      sous_titre: `${premiere ? 'Ta première mission' : recent ? 'Ces dernières 24 heures' : `Dernière nuit de travail (${date})`}${ailleurs ? ` · ${ailleurs} autre${ailleurs > 1 ? 's' : ''} ailleurs` : ''}`,
    } },
    { seq: 0, run_id: 'nuit', t: t0 + 1, agent: 'eclaireur', type: 'step', place_id: null, data: { texte: 'Je lis les registres publics (SIRENE, BODACC)' } },
  ];
  const founds = events.filter((e) => e.type === 'found').length;
  const tail = [
    { seq: 0, run_id: 'nuit', t: events.at(-1).t + 1, agent: 'eclaireur', type: 'done', place_id: null, data: { trouves: founds, demandes: founds, rayon: R } },
    { seq: 0, run_id: 'nuit', t: events.at(-1).t + 2, agent: 'chef', type: 'end', place_id: null, data: { ecrits: events.filter((e) => e.agent.startsWith('redacteur') && e.type === 'done').length } },
  ];
  // Léo trouve tout d'abord (il scanne la ville), puis chacun joue ses gestes dans l'ordre réel
  const found = events.filter((e) => e.type === 'found');
  const rest = events.filter((e) => e.type !== 'found');
  const all = [...head, ...found, tail[0], ...rest, tail[1]].map((e, i) => ({ ...e, seq: i + 1 }));
  ctx = { ws, centre, placed, seen, prospects, last: Date.now(), recent };
  const run = { id: 'nuit', metier: 'entreprises', ville, lat: centre.lat, lon: centre.lon, rayon: R, nombre: nPlaces, started_at: all[0].t, ended_at: all.at(-1).t, status: 'fini', n: nPlaces };
  const bilan = await resultats(ws.id, start, end, d);
  return { state: { run, running: false, places: [], config: { recherche: {}, offre: {}, equipe: {}, consignes: '' } }, events: all, clusters, zone: clusters.indexOf(centre), ws, bilan, recent };
}

/** Le direct : ce que l'équipe a fait depuis la dernière lecture (appelé toutes les 30 secondes). */
export async function poll() {
  if (!ctx) return [];
  const start = ctx.last - 5000, end = Date.now();
  ctx.last = end;
  const d = await collect(ctx.ws.id, start, end);
  if (!size(d)) return [];
  const prospects = await withProspects(d, ctx.ws.id, ctx.prospects);
  await Promise.all([geocode([...prospects.values()].filter((p) => !p.lat)), sirenPlace([...d.opps.filter((o) => !o.prospect_id), ...d.rivals.map((c) => Object.assign(c, { siren: c.summary?.fiche?.siren }))])]);
  ctx.prospects = prospects;
  const { events, placed } = toEvents(d, prospects, ctx.ws, ctx.centre, { start, end, placed: ctx.placed, seen: ctx.seen, live: true });
  ctx.placed = placed;
  return events.map((e) => ({ ...e, seq: undefined }));
}

/* ------------------------------------------------------------------ le bilan chiffré de la nuit (toute l'activité, pas seulement la ville affichée) */
const MINUTES = { recherche: 20, enquete: 8, enquete_plus: 12, redaction: 10, envoi: 1, reponse: 5, radar: 5, radar_scan: 20, veille: 30, espion: 15, analyse: 30, linkedin: 6, rdv: 20, brief: 15, devis: 15, script: 10, intelligence: 20 };
async function resultats(wsId, start, end, d) {
  const s = new Date(start).toISOString(), e = new Date(end).toISOString();
  const [act, rdv] = await Promise.all([
    supabase.from('activity').select('kind').eq('workspace_id', wsId).gt('created_at', s).lte('created_at', e).limit(3000),
    supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId).gt('created_at', s).lte('created_at', e),
  ]);
  const ok = (r) => ['ok', 'connecte', 'deja_connecte'].includes(String(r ?? '').split(' : ')[0]);
  return {
    trouves: d.created.length,
    emails: d.enriched.filter((p) => p.email).length,
    prets: d.drafts.length,
    envoyes: d.sent.length,
    reponses: d.replies.length,
    positives: d.replies.filter((r) => ['interesse', 'rdv', 'rappel'].includes(r.class)).length,
    rdv: rdv.count ?? 0,
    linkedin: d.li.filter((a) => ok(a.result) && a.kind !== 'trouver').length,
    profils: d.li.filter((a) => a.kind === 'trouver' && ok(a.result)).length,
    opps: d.opps.length,
    minutes: (act.data ?? []).reduce((a, x) => a + (MINUTES[x.kind] ?? 0), 0),
  };
}

/* ------------------------------------------------------------------ en ce moment : ce que l'équipe fait (actions en cours, 15 dernières minutes) */
const QUI = [[/^(recherche|prospect|mission)/, 'leo'], [/^enquete/, 'sam'], [/^(redaction|envoi|relance)/, 'hugo'], [/^reponse/, 'ines'], [/^linkedin/, 'lina'], [/^radar/, 'max'], [/^(espion|veille|analyse)/, 'oscar'], [/^(rdv|agenda)/, 'paul']];
const NOMS = { iris: 'Iris', leo: 'Léo', sam: 'Sam', max: 'Max', lina: 'Lina', hugo: 'Hugo', ines: 'Inès', paul: 'Paul', oscar: 'Oscar' };
const LI_EN_COURS = { trouver: 'cherche le profil LinkedIn de', visite: 'visite le profil LinkedIn de', invitation: 'invite sur LinkedIn', verifier: 'regarde si son invitation est acceptée :', message: 'écrit sur LinkedIn à', relance: 'relance sur LinkedIn', retirer: 'retire une vieille invitation :' };
export async function maintenant() {
  if (!ctx) return null;
  const since = new Date(Date.now() - 15 * 60000).toISOString();
  const [li, act] = await Promise.all([
    supabase.from('linkedin_actions').select('kind, taken_at, prospects(name, contact_name, linkedin_person)').eq('workspace_id', ctx.ws.id).eq('status', 'en_cours').order('taken_at', { ascending: false }).limit(2),
    supabase.from('activity').select('kind, summary, created_at').eq('workspace_id', ctx.ws.id).gt('created_at', since).order('created_at', { ascending: false }).limit(5),
  ]);
  const out = [];
  for (const a of li.data ?? []) {
    const p = a.prospects ?? {};
    const qui = String(p.linkedin_person ?? '').split(' · ')[0] || p.contact_name || title(p.name);
    out.push({ id: 'lina', nom: NOMS.lina, texte: `${LI_EN_COURS[a.kind] ?? 'travaille sur LinkedIn pour'} ${qui}`, at: a.taken_at, encours: true });
  }
  for (const a of act.data ?? []) {
    const id = QUI.find(([re]) => re.test(a.kind))?.[1] ?? 'iris';
    out.push({ id, nom: NOMS[id], texte: cut(a.summary, 110), at: a.created_at, encours: false });
  }
  return out.slice(0, 5);
}
