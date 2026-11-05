// Carte de l'équipe : préparation de nuit (toutes les 15 minutes, par petites tranches).
// 1. Place les prospects sur la carte (Base Adresse Nationale, gratuite), une fois pour toutes.
// 2. Calcule les zones de chaque espace (là où il y a le plus de prospects, 2 km autour), comme la carte le fait.
// 3. Télécharge à l'avance les immeubles et les arbres d'une zone pas encore prête (OpenStreetMap), dans le même
//    format que la carte, et la range dans le stockage partagé « qg-villes » : la première visite devient rapide.
import { admin } from "./core.ts";

const R = 2000; // demi-côté de la ville affichée (comme qg/src/data.js)
export const QG_R = 2415; // rayon demandé par la carte : min(4300, max(1600, R + 300)) × 1,05
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

type Pt = { lat: number; lon: number; city?: string | null };
const dist = (a: Pt, b: Pt) => Math.hypot((a.lat - b.lat) * 110540, (a.lon - b.lon) * 111320 * Math.cos((b.lat * Math.PI) / 180));
const title = (s: string) => s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());
export const zoneKey = (z: { lat: number; lon: number }) => `v1_${z.lat.toFixed(2)}_${z.lon.toFixed(2)}_${QG_R}`;

/** Les zones : même règle que la carte (le point le plus entouré, puis le suivant parmi ceux qui restent), 6 au plus. */
export function zones(points: Pt[]) {
  const pts = points.slice(0, 3000);
  const dens = new Map(pts.map((p) => [p, pts.filter((x) => dist(p, x) < R).length]));
  const used = new Set<Pt>();
  const out: { lat: number; lon: number; n: number; ville: string }[] = [];
  for (const p of [...pts].sort((a, b) => dens.get(b)! - dens.get(a)!)) {
    if (used.has(p)) continue;
    const near = pts.filter((x) => !used.has(x) && dist(p, x) < R);
    near.forEach((x) => used.add(x));
    const villes: Record<string, number> = {};
    for (const x of near) { const c = title(String(x.city ?? "")); if (c) villes[c] = (villes[c] ?? 0) + 1; }
    const lat = near.reduce((a, x) => a + x.lat, 0) / near.length, lon = near.reduce((a, x) => a + x.lon, 0) / near.length;
    out.push({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, n: near.length, ville: Object.entries(villes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "" });
    if (out.length >= 6) break;
  }
  return out;
}

/** Adresse lisible pour la Base Adresse Nationale (même nettoyage que la carte). */
function query(p: { address?: string | null; postal_code?: string | null; city?: string | null }) {
  const a = String(p.address ?? "");
  return [a, p.postal_code && !a.includes(p.postal_code) ? p.postal_code : "", p.city && !a.toLowerCase().includes(String(p.city).toLowerCase()) ? p.city : ""]
    .filter(Boolean).join(" ").replace(/^.*?\b(\d+[\d-]*\s+(?:rue|bd|boulevard|avenue|av|place|impasse|chemin|route|allée|allee|quai|cours|square|passage|zac|za|zi|rond-point)\b)/i, "$1").slice(0, 200);
}

async function geocode(limit = 150) {
  const { data } = await admin.from("prospects").select("id, address, postal_code, city").is("geo_at", null).neq("status", "ignore").limit(limit);
  const list = data ?? [];
  let i = 0, placed = 0;
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (i < list.length) {
      const p = list[i++];
      const q = query(p);
      let lat: number | null = null, lon: number | null = null;
      if (q.trim()) {
        try {
          const u = `https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(q)}${p.postal_code ? `&postcode=${encodeURIComponent(p.postal_code)}` : ""}`;
          const f = (await (await fetch(u, { signal: AbortSignal.timeout(8000) })).json()).features?.[0];
          if (f && f.properties.score >= 0.45) { lat = f.geometry.coordinates[1]; lon = f.geometry.coordinates[0]; placed++; }
        } catch { continue; } // service indisponible : on réessaiera au prochain passage
      }
      await admin.from("prospects").update({ geo_lat: lat, geo_lon: lon, geo_at: new Date().toISOString() }).eq("id", p.id);
    }
  }));
  return { lus: list.length, places: placed };
}

async function refreshZones() {
  const { data: wss } = await admin.from("workspaces").select("id").eq("onboarded", true);
  let n = 0;
  for (const w of wss ?? []) {
    const { data } = await admin.from("prospects").select("geo_lat, geo_lon, city").eq("workspace_id", w.id).neq("status", "ignore").not("geo_lat", "is", null).order("updated_at", { ascending: false }).limit(3000);
    const pts = (data ?? []).map((p) => ({ lat: p.geo_lat as number, lon: p.geo_lon as number, city: p.city }));
    if (!pts.length) continue;
    await admin.from("workspaces").update({ qg_zones: zones(pts) }).eq("id", w.id);
    n++;
  }
  return n;
}

const flat = (geom: { lat: number; lon: number }[]) => geom.flatMap((p) => [Math.round(p.lon * 1e7) / 1e7, Math.round(p.lat * 1e7) / 1e7]);
function hauteur(t: Record<string, string>) {
  const h = parseFloat(String(t.height ?? "").replace(",", "."));
  if (Number.isFinite(h) && h > 0) return Math.min(h, 200);
  const n = parseFloat(t["building:levels"]);
  return Number.isFinite(n) && n > 0 ? Math.min(n * 3.2 + (parseFloat(t["roof:levels"]) || 0) * 2 + 1.5, 200) : 0;
}
async function overpass(q: string, server: number, ms = 40000) {
  const r = await fetch(OVERPASS[server], { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Bingoo-QG/1.0" }, body: "data=" + encodeURIComponent(q), signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`overpass ${r.status}`);
  return await r.json();
}

/** Immeubles et arbres d'une zone, au format de la carte (qg/src/api.js, ville()). */
async function build(lat: number, lon: number) {
  const dLat = QG_R / 110540, dLon = QG_R / (Math.cos((lat * Math.PI) / 180) * 111320);
  const quarts = [[-1, -1], [-1, 0], [0, -1], [0, 0]].map(([a, b]) => [lat + a * dLat, lon + b * dLon, lat + (a + 1) * dLat, lon + (b + 1) * dLon].map((v) => v.toFixed(4)).join(","));
  // deno-lint-ignore no-explicit-any
  let parts: any[] | null = null;
  for (const server of [0, 1]) {
    try { parts = await Promise.all(quarts.map((q) => overpass(`[out:json][timeout:35][bbox:${q}];way["building"];out tags geom qt;`, server))); break; } catch { /* serveur suivant */ }
  }
  if (!parts) throw new Error("Overpass indisponible");
  const seen = new Set<number>();
  const batiments: unknown[] = [];
  for (const part of parts) for (const e of part.elements ?? []) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    const t = e.tags ?? {};
    if (t.building === "roof" || t.location === "underground" || !(e.geometry?.length > 3)) continue;
    batiments.push({ id: `w${e.id}`, h: hauteur(t), c: t["building:colour"] ?? null, rc: t["roof:colour"] ?? null, k: t.building, rings: [flat(e.geometry)] });
  }
  const bbox = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((v) => v.toFixed(4)).join(",");
  const arb = await overpass(`[out:json][timeout:25][bbox:${bbox}];node["natural"="tree"];out qt;`, 0, 25000).catch(() => ({ elements: [] }));
  // deno-lint-ignore no-explicit-any
  const arbres = (arb.elements ?? []).map((e: any) => [Math.round(e.lon * 1e7) / 1e7, Math.round(e.lat * 1e7) / 1e7]);
  return { batiments, arbres };
}

async function bakeOne() {
  const { data: wss } = await admin.from("workspaces").select("qg_zones").eq("onboarded", true);
  const all = new Map<string, { lat: number; lon: number }>();
  for (const w of wss ?? []) for (const z of ((w.qg_zones ?? []) as { lat: number; lon: number }[])) all.set(zoneKey(z), z);
  if (!all.size) return { prete: 0 };
  const { data: files } = await admin.storage.from("qg-villes").list("", { limit: 1000 });
  const have = new Set((files ?? []).map((f) => f.name));
  const todo = [...all.entries()].filter(([k]) => !have.has(`${k}.json.gz`));
  if (!todo.length) return { prete: all.size, a_faire: 0 };
  const [key, z] = todo[0];
  const v = await build(z.lat, z.lon);
  const gz = new Uint8Array(await new Response(new Blob([JSON.stringify(v)]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
  const { error } = await admin.storage.from("qg-villes").upload(`${key}.json.gz`, gz, { contentType: "application/gzip", upsert: false });
  if (error && !/exists/i.test(error.message)) throw new Error(error.message);
  return { prete: all.size - todo.length + 1, a_faire: todo.length - 1, faite: key, immeubles: v.batiments.length, taille: gz.length };
}

export async function qgPrepa() {
  const t0 = Date.now();
  const geo = await geocode();
  const z = await refreshZones();
  let bake: unknown = null;
  try { bake = await bakeOne(); } catch (e) { bake = { erreur: (e as Error).message }; }
  return { geo, zones: z, ville: bake, secondes: Math.round((Date.now() - t0) / 1000) };
}
