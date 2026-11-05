// Remplace le petit serveur local du QG des agents : la nuit vient de Bingoo! (data.js), les tuiles d'OpenFreeMap,
// les immeubles et les arbres d'OpenStreetMap (Overpass), gardés dans le navigateur une semaine.
import { buildNight } from './data.js';

let night = null;
export async function prepare() { night = await buildNight(); return night; }

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
async function overpass(q) {
  for (const u of OVERPASS) {
    try {
      const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(50000) });
      if (r.ok) return await r.json();
    } catch { /* serveur suivant */ }
  }
  throw new Error('overpass');
}
const flat = (geom) => geom.flatMap((p) => [Math.round(p.lon * 1e7) / 1e7, Math.round(p.lat * 1e7) / 1e7]);
const hauteur = (t) => {
  const h = parseFloat(String(t.height ?? '').replace(',', '.'));
  if (Number.isFinite(h) && h > 0) return Math.min(h, 200);
  const n = parseFloat(t['building:levels']);
  return Number.isFinite(n) && n > 0 ? Math.min(n * 3.2 + (parseFloat(t['roof:levels']) || 0) * 2 + 1.5, 200) : 0;
};
async function ville(lat, lon, r) {
  const key = `ville|${lat.toFixed(3)}|${lon.toFixed(3)}|${r}`;
  const hit = await cacheGet(key);
  if (hit && Date.now() - hit.at < 7 * 864e5) return hit.v;
  const dLat = r / 110540, dLon = r / (Math.cos((lat * Math.PI) / 180) * 111320);
  const bbox = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((v) => v.toFixed(4)).join(',');
  const [bat, arb] = await Promise.all([
    overpass(`[out:json][timeout:70][bbox:${bbox}];way["building"];out tags geom qt;`),
    overpass(`[out:json][timeout:60][bbox:${bbox}];node["natural"="tree"];out qt;`),
  ]);
  const batiments = [];
  for (const e of bat.elements ?? []) {
    const t = e.tags ?? {};
    if (t.building === 'roof' || t.location === 'underground' || !(e.geometry?.length > 3)) continue;
    batiments.push({ id: `w${e.id}`, h: hauteur(t), c: t['building:colour'] ?? null, rc: t['roof:colour'] ?? null, k: t.building, rings: [flat(e.geometry)] });
  }
  const v = { batiments, arbres: (arb.elements ?? []).map((e) => [Math.round(e.lon * 1e7) / 1e7, Math.round(e.lat * 1e7) / 1e7]) };
  cachePut(key, { at: Date.now(), v });
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
