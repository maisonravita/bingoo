// La nuit de l'équipe Bingoo!, à partir des vraies données de l'espace : les entreprises trouvées ou complétées
// ces dernières 24 heures, leurs signaux, leurs décideurs, les e-mails trouvés et les messages préparés.
// Rien n'est inventé : sans activité récente, on rejoue les derniers prospects et on le dit.
import { supabase } from '../../src/lib/supabase.js';

const DAY = 24 * 3600 * 1000;
const BAD = /^(?:(?:rgpd|gdpr|privacy|dataprotection|data-protection|donnees-?personnelles|cnil)[a-z._-]*|dpo(?:[._-][a-z._-]*)?|noreply|no-reply|donotreply|webmaster)@/i;
const host = (u) => String(u ?? '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
const dist = (a, b) => Math.hypot((a.lat - b.lat) * 110540, (a.lon - b.lon) * 111320 * Math.cos((b.lat * Math.PI) / 180));
const clean = (s) => String(s ?? '').replace(/\s*(?:publi[ée]e?\s+)?(?:au|dans le)\s+BODACC/gi, '').replace(/\s+/g, ' ').trim();
const role = (r) => String(r ?? '').replace(/\s*\(.*$/, '').trim();
const title = (s) => String(s ?? '').toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

export class QgError extends Error { constructor(msg, link) { super(msg); this.link = link; } }

/** Position de chaque prospect (Base Adresse Nationale), gardée dans le navigateur pour ne la demander qu'une fois. */
async function geocode(list) {
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem('bingoo-qg-geo') ?? '{}'); } catch { /* stockage indisponible */ }
  const todo = list.filter((p) => !cache[p.id]);
  let i = 0;
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (i < todo.length) {
      const p = todo[i++];
      const q = [p.address, p.postal_code && !String(p.address ?? '').includes(p.postal_code) ? p.postal_code : '', p.city && !String(p.address ?? '').toLowerCase().includes(String(p.city).toLowerCase()) ? p.city : '']
        .filter(Boolean).join(' ').replace(/^.*?\b(\d+[\d-]*\s+(?:rue|bd|boulevard|avenue|av|place|impasse|chemin|route|allée|allee|quai|cours|square|passage|zac|za|zi|rond-point)\b)/i, '$1');
      if (!q.trim()) { cache[p.id] = [0, 0, 0]; continue; }
      try {
        const u = `https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(q.slice(0, 200))}${p.postal_code ? `&postcode=${encodeURIComponent(p.postal_code)}` : ''}`;
        const f = (await (await fetch(u)).json()).features?.[0];
        cache[p.id] = f ? [f.geometry.coordinates[1], f.geometry.coordinates[0], f.properties.score] : [0, 0, 0];
      } catch { /* adresse introuvable : le prospect reste hors de la carte */ }
    }
  }));
  try { localStorage.setItem('bingoo-qg-geo', JSON.stringify(cache)); } catch { /* stockage plein */ }
  for (const p of list) { const g = cache[p.id]; if (g && g[2] >= 0.45) { p.lat = g[0]; p.lon = g[1]; } }
}

export async function buildNight() {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new QgError('Connecte-toi à Bingoo! pour voir ton équipe.', '/');
  const { data: wss } = await supabase.from('workspaces').select('id, name').order('created_at');
  let wsId = null;
  try { wsId = localStorage.getItem('kairo-ws'); } catch { /* stockage indisponible */ }
  const ws = wss?.find((w) => w.id === wsId) ?? wss?.[0];
  if (!ws) throw new QgError('Crée d’abord ton espace Bingoo!.', '/');

  const since = new Date(Date.now() - DAY).toISOString();
  const cols = 'id, name, address, postal_code, city, activity, contact_name, contact_role, email, website, phone, signals, status, created_at, enriched_at';
  const [pr, ms] = await Promise.all([
    supabase.from('prospects').select(cols).eq('workspace_id', ws.id).neq('status', 'ignore').or(`created_at.gte.${since},enriched_at.gte.${since}`).order('created_at', { ascending: false }).limit(80),
    supabase.from('messages').select(`id, prospect_id, subject, body, status, step, created_at, prospects(${cols})`).eq('workspace_id', ws.id).gte('created_at', since).in('status', ['brouillon', 'envoye']).order('created_at', { ascending: false }).limit(30),
  ]);
  const byId = new Map();
  for (const p of pr.data ?? []) byId.set(p.id, p);
  for (const m of ms.data ?? []) if (m.prospects && m.prospects.status !== 'ignore') byId.set(m.prospect_id, m.prospects);
  let recent = true;
  if (!byId.size) {
    // Pas d'activité ces dernières 24 heures : les derniers prospects, présentés comme tels
    recent = false;
    const { data } = await supabase.from('prospects').select(cols).eq('workspace_id', ws.id).neq('status', 'ignore').order('created_at', { ascending: false }).limit(40);
    for (const p of data ?? []) byId.set(p.id, p);
  }
  if (!byId.size) throw new QgError('Ton équipe n’a encore trouvé aucune entreprise. Reviens demain matin : elle travaille chaque nuit.', '/#/');
  const drafts = new Map();
  for (const m of ms.data ?? []) if (m.status === 'brouillon' && !drafts.has(m.prospect_id)) drafts.set(m.prospect_id, m);

  const all = [...byId.values()];
  await geocode(all);
  const placed = all.filter((p) => p.lat);
  if (!placed.length) throw new QgError('Impossible de placer tes prospects sur la carte (adresses introuvables).', '/#/prospects');

  // La ville : l'endroit où se trouvent le plus de prospects (dans 1,8 km)
  const R = 2000;
  let best = placed[0], bestN = 0;
  for (const p of placed) { const n = placed.filter((q) => dist(p, q) < R).length; if (n > bestN) { best = p; bestN = n; } }
  const near = placed.filter((q) => dist(best, q) < R);
  const centre = { lat: near.reduce((a, q) => a + q.lat, 0) / near.length, lon: near.reduce((a, q) => a + q.lon, 0) / near.length };
  const inBox = (q) => Math.abs((q.lat - centre.lat) * 110540) < R * 0.98 && Math.abs((q.lon - centre.lon) * 111320 * Math.cos((centre.lat * Math.PI) / 180)) < R * 0.98;
  const places = placed.filter(inBox).sort((a, b) => dist(a, centre) - dist(b, centre)).slice(0, 40);
  const maxd = Math.max(...places.map((q) => Math.max(Math.abs((q.lat - centre.lat) * 110540), Math.abs((q.lon - centre.lon) * 111320 * Math.cos((centre.lat * Math.PI) / 180)))));
  const rayon = Math.round(Math.min(R, Math.max(900, maxd + 200)));
  const villes = {};
  for (const q of places) { const c = title(q.city); if (c) villes[c] = (villes[c] ?? 0) + 1; }
  const ville = Object.entries(villes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'ta zone';
  const ailleurs = all.length - places.length;

  let t = Date.now() - 3600e3;
  const ev = [];
  const E = (agent, type, place_id, data, dt = 900) => { ev.push({ seq: ev.length + 1, run_id: 'nuit', t, agent, type, place_id, data }); t += dt; };
  const metiers = Object.entries(places.reduce((m, q) => { const a = String(q.activity ?? '').split(/[,(]/)[0].trim(); if (a) m[a] = (m[a] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([a]) => a);
  E('chef', 'start', null, {
    metier: 'entreprises', ville, centre, nombre: places.length, rayon,
    annonce: recent ? `Cette nuit : ${places.length} entreprise${places.length > 1 ? 's' : ''} à ${ville} !` : `Tes derniers prospects, à ${ville}.`,
    annonce2: 'Léo, montre-leur.',
    sous_titre: `${recent ? 'Ces dernières 24 heures' : 'Pas d’activité ces dernières 24 heures : tes derniers prospects'}${metiers.length ? ` · ${metiers.join(', ')}` : ''}${ailleurs > 0 ? ` · ${ailleurs} autre${ailleurs > 1 ? 's' : ''} ailleurs` : ''}`,
  });
  E('eclaireur', 'step', null, { texte: 'Je lis les registres publics (SIRENE, BODACC)' });
  for (const q of places) E('eclaireur', 'found', q.id, { id: q.id, name: title(q.name), address: [title(q.address), q.postal_code && !String(q.address ?? '').includes(q.postal_code) ? q.postal_code : '', ''].filter(Boolean).join(' ') || title(q.city), lat: q.lat, lon: q.lon, website: q.website || null, phone: q.phone || null, type: String(q.activity ?? '').split('(')[0].trim() || 'Entreprise', decideur: q.contact_name ? [q.contact_name, role(q.contact_role)].filter(Boolean).join(', ') : null }, 200);
  E('eclaireur', 'step', null, { texte: `${places.length} entreprise${places.length > 1 ? 's' : ''} de ta cible sur la carte` });
  E('eclaireur', 'done', null, { trouves: places.length, demandes: places.length, rayon });

  const counts = { trouves: places.length, lus: 0, retenus: 0, ecrits: 0, ecartes: 0 };
  const writes = [];
  places.forEach((q, i) => {
    const agent = `lecteur-${(i % 3) + 1}`;
    E(agent, 'start', q.id, { name: title(q.name), site: q.website || null });
    if (q.activity) E(agent, 'step', q.id, { texte: `Registre : ${String(q.activity).split('(')[0].trim()}` }, 400);
    const sig = (Array.isArray(q.signals) ? q.signals : []).filter((x) => x?.label).slice(0, 4);
    const fort = sig.find((x) => !['taille', 'reseau'].includes(x.type));
    for (const x of sig) E(agent, 'step', q.id, { texte: `Signal : ${clean(x.label)}` }, 400);
    const dec = q.contact_name ? [q.contact_name, role(q.contact_role)].filter(Boolean).join(', ') : '';
    if (dec) E(agent, 'step', q.id, { texte: `Décideur : ${dec}` }, 400);
    const bingoo = [];
    if (fort) bingoo.push([false, clean(fort.label)]);
    for (const x of sig) if (x !== fort) bingoo.push([true, clean(x.label)]);
    if (dec) bingoo.push([true, `Décideur identifié : ${dec}`]);
    const email = q.email && !BAD.test(q.email) ? q.email.toLowerCase() : null;
    if (q.website) E(agent, 'step', q.id, { texte: `J'ouvre ${host(q.website)}` }, 400);
    if (email) { E(agent, 'step', q.id, { texte: `E-mail vérifié : ${email}` }, 400); bingoo.push([true, 'E-mail vérifié']); }
    else E(agent, 'step', q.id, { texte: 'Pas encore d’e-mail vérifié : on continue de chercher' }, 400);
    if (q.phone) E(agent, 'step', q.id, { texte: `Téléphone : ${q.phone}` }, 400);
    const retenu = Boolean(email);
    counts.lus++; retenu ? counts.retenus++ : counts.ecartes++;
    E(agent, 'done', q.id, { name: title(q.name), score: null, retenu, raisons: fort ? [{ pts: 1, texte: clean(fort.label) }] : [], raison: retenu ? null : 'pas encore d’e-mail vérifié', email, email_source: null, signals: { site: Boolean(q.website), bingoo }, telephones: q.phone ? [q.phone] : [] });
    const m = drafts.get(q.id);
    if (m && email) writes.push({ q, m, email });
  });
  writes.forEach(({ q, m, email }, i) => {
    const agent = `redacteur-${(i % 2) + 1}`;
    E(agent, 'start', q.id, { name: title(q.name) });
    E(agent, 'done', q.id, { name: title(q.name), objet: m.subject, mail: m.body, to: email ?? q.email, constat: '' });
    counts.ecrits++;
  });
  E('chef', 'end', null, counts);

  const run = { id: 'nuit', metier: 'entreprises', ville, lat: centre.lat, lon: centre.lon, rayon, nombre: places.length, started_at: ev[0].t, ended_at: t, status: 'fini', n: places.length };
  return { state: { run, running: false, places: [], config: { recherche: {}, offre: {}, equipe: {}, consignes: '' } }, events: ev };
}
