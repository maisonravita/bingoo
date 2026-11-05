// Remplace le petit serveur local du QG des agents : la nuit vient de Bingoo! (data.js), les tuiles d'OpenFreeMap,
// les immeubles et les arbres d'OpenStreetMap (Overpass), gardés dans le navigateur une semaine.
import { buildNight } from './data.js';
import { fn } from '../../src/lib/supabase.js';
import { step, creep } from './progress.js';

let night = null;
export async function prepare(opts) { night = await buildNight(opts); return night; }
export const getNight = () => night;

const J = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
let tpl = null;

/* ------------------------------------------------------------------ cache local (IndexedDB) */
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('bingoo-qg', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function cacheGet(key) {
  try { const db = await idb(); return await new Promise((res) => { const q = db.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => res(q.result ?? null); q.onerror = () => res(null); }); } catch { return null; }
}
async function cachePut(key, value) {
  try { const db = await idb(); db.transaction('kv', 'readwrite').objectStore('kv').put(value, key); } catch { /* stockage indisponible */ }
}

/* ------------------------------------------------------------------ la ville : immeubles un par un et arbres */
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
async function overpass(q, server = 0, ms = 22000) {
  const r = await fetch(OVERPASS[server], { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`overpass ${r.status}`);
  return r.json();
}
const flat = (geom) => geom.flatMap((p) => [Math.round(p.lon * 1e7) / 1e7, Math.round(p.lat * 1e7) / 1e7]);
const hauteur = (t) => {
  const h = parseFloat(String(t.height ?? '').replace(',', '.'));
  if (Number.isFinite(h) && h > 0) return Math.min(h, 200);
  const n = parseFloat(t['building:levels']);
  return Number.isFinite(n) && n > 0 ? Math.min(n * 3.2 + (parseFloat(t['roof:levels']) || 0) * 2 + 1.5, 200) : 0;
};
const SHARED = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/qg-villes/`;
const gunzip = async (res) => JSON.parse(await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).text());
async function gzipB64(obj) {
  const buf = new Uint8Array(await new Response(new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function ville(lat, lon, r) {
  const key = `ville|${lat.toFixed(3)}|${lon.toFixed(3)}|${r}`;
  const hit = await cacheGet(key);
  if (hit && Date.now() - hit.at < 7 * 864e5) { step(58, 'Ta ville est déjà prête'); return hit.v; }
  step(32, 'Téléchargement de ta ville…');
  // déjà construite par un autre client de la même ville : quelques secondes au lieu d'une minute
  const shared = `v1_${lat.toFixed(2)}_${lon.toFixed(2)}_${r}`;
  try {
    const res = await fetch(SHARED + shared + '.json.gz', { cache: 'no-store' });
    if (res.ok) { creep(56, 6); const v = await gunzip(res); cachePut(key, { at: Date.now(), v }); step(58, 'Ville téléchargée'); return v; }
  } catch { /* pas encore partagée */ }
  const dLat = r / 110540, dLon = r / (Math.cos((lat * Math.PI) / 180) * 111320);
  // quatre quarts plutôt qu'une grosse demande : les serveurs publics refusent souvent les grandes villes d'un coup
  const quarts = [[-1, -1], [-1, 0], [0, -1], [0, 0]].map(([a, b]) => [lat + a * dLat, lon + b * dLon, lat + (a + 1) * dLat, lon + (b + 1) * dLon].map((v) => v.toFixed(4)).join(','));
  step(34, 'Première visite de cette ville : on dessine chaque immeuble', 'Ça peut prendre jusqu’à 45 secondes, une seule fois. Les prochaines visites seront rapides.');
  creep(54, 30);
  // les quatre quarts en même temps, 22 s au plus par serveur ; sinon la ville se fera avec les tuiles (plus simple)
  let parts = null;
  for (const server of [0, 1]) {
    let fin = 0;
    try { parts = await Promise.all(quarts.map((q) => overpass(`[out:json][timeout:25][bbox:${q}];way["building"];out tags geom qt;`, server).then((x) => { fin++; step(34 + fin * 5, `Les immeubles : quartier ${fin} sur 4`); creep(34 + (fin + 1) * 5, 15); return x; }))); break; } catch { /* serveur suivant */ }
  }
  if (!parts) { step(56, 'Serveurs de cartes occupés : on passe à la version simple de la ville'); throw new Error('overpass'); }
  step(56, 'Les arbres et les parcs…');
  const bat = { elements: [] }, seen = new Set();
  for (const r2 of parts) for (const e of r2.elements ?? []) if (!seen.has(e.id)) { seen.add(e.id); bat.elements.push(e); }
  const bbox = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((v) => v.toFixed(4)).join(',');
  const arb = await overpass(`[out:json][timeout:20][bbox:${bbox}];node["natural"="tree"];out qt;`, 0, 15000).catch(() => ({ elements: [] }));
  const batiments = [];
  for (const e of bat.elements ?? []) {
    const t = e.tags ?? {};
    if (t.building === 'roof' || t.location === 'underground' || !(e.geometry?.length > 3)) continue;
    batiments.push({ id: `w${e.id}`, h: hauteur(t), c: t['building:colour'] ?? null, rc: t['roof:colour'] ?? null, k: t.building, rings: [flat(e.geometry)] });
  }
  const v = { batiments, arbres: (arb.elements ?? []).map((e) => [Math.round(e.lon * 1e7) / 1e7, Math.round(e.lat * 1e7) / 1e7]) };
  cachePut(key, { at: Date.now(), v });
  // on la garde pour les prochains clients de la même ville (vérifiée par le serveur)
  if (Math.abs(lat * 100 - Math.round(lat * 100)) < 1e-6 && night?.ws) gzipB64(v).then((gz) => fn('m/qg-ville', { workspace_id: night.ws.id, key: shared, gz })).catch(() => {});
  return v;
}

/** Les appels que l'interface du QG faisait à son serveur. */
export async function qfetch(u, o) {
  u = String(u);
  let m;
  if (u.startsWith('/api/state')) return J(night.state);
  if (u === '/api/runs') return J([night.state.run]);
  if (/^\/api\/runs\/[^/]+\/events$/.test(u)) return J(night.events);
  if ((m = u.match(/^\/api\/tiles\/(\d+)\/(\d+)\/(\d+)$/))) {
    if (!tpl) tpl = (await (await fetch('https://tiles.openfreemap.org/planet')).json()).tiles[0];
    return fetch(tpl.replace('{z}', m[1]).replace('{x}', m[2]).replace('{y}', m[3]));
  }
  if (u.startsWith('/api/ville')) {
    const p = new URL(u, location.href).searchParams;
    try { return J(await ville(Number(p.get('lat')), Number(p.get('lon')), Number(p.get('r')))); } catch { return J({ error: 'carte indisponible' }, 502); }
  }
  if (/\/google$/.test(u)) return J({ gid: null });
  if (/\/(decision|visite)$/.test(u)) return J({ error: 'Pour agir sur un prospect, ouvre-le dans Bingoo!.' }, 400);
  if (u.startsWith('./') || u.startsWith('/carte/')) return fetch(import.meta.env.BASE_URL + u.replace(/^\.?\//, ''), o);
  return fetch(u, o);
}
