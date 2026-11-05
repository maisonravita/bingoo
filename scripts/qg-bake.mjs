// Maquette « Ton équipe cette nuit » : télécharge les tuiles OpenFreeMap (données OpenStreetMap, ODbL) autour d'un centre.
// Lancé par .github/workflows/qg-bake.yml (le conteneur de dev n'a pas accès à ces serveurs). Aucune donnée client ici.
import { mkdirSync, writeFileSync } from "node:fs";
const [lat, lon, r] = process.argv.slice(2).map(Number);
const out = "qg-tiles"; mkdirSync(out, { recursive: true });
const tpl = (await (await fetch("https://tiles.openfreemap.org/planet")).json()).tiles[0];
const txy = (z, la, lo) => { const n = 2 ** z, s = Math.sin(la * Math.PI / 180); return [Math.floor((lo + 180) / 360 * n), Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n)]; };
const jobs = [];
// z14 : toute la ville (même calcul que loadCity)
const R = Math.min(4300, Math.max(1600, r + 300)), dLat = R / 110540, dLon = R / (Math.cos(lat * Math.PI / 180) * 111320);
const [x0, y0] = txy(14, lat + dLat, lon - dLon), [x1, y1] = txy(14, lat - dLat, lon + dLon);
for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) jobs.push([14, x, y]);
// z6 à z13 : de quoi voir le vol de la caméra vers la ville
for (let z = 6; z <= 13; z++) { const [cx, cy] = txy(z, lat, lon); for (let x = cx - 3; x <= cx + 3; x++) for (let y = cy - 2; y <= cy + 2; y++) jobs.push([z, x, y]); }
const bundles = {};
let i = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < jobs.length) {
    const [z, x, y] = jobs[i++];
    const res = await fetch(tpl.replace("{z}", z).replace("{x}", x).replace("{y}", y), { headers: { "User-Agent": "bingoo-qg-maquette/0.1" } });
    if (!res.ok) { console.log("échec", z, x, y, res.status); continue; }
    (bundles[z] ??= {})[`${x}/${y}`] = Buffer.from(await res.arrayBuffer()).toString("base64");
  }
}));
for (const [z, b] of Object.entries(bundles)) writeFileSync(`${out}/z${z}.json`, JSON.stringify(b));
console.log(jobs.length, "tuiles");

// Les immeubles un par un et les arbres (même format que villeOSM du QG des agents, licence MIT)
const rr = Math.round(R * 1.05), dLa = rr / 110540, dLo = rr / (Math.cos(lat * Math.PI / 180) * 111320);
const bbox = [lat - dLa, lon - dLo, lat + dLa, lon + dLo].map((v) => v.toFixed(4)).join(",");
const ask = async (q) => { for (const u of ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]) { try { const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "bingoo-qg-maquette/0.1" }, body: "data=" + encodeURIComponent(q), signal: AbortSignal.timeout(240000) }); if (r.ok) return await r.json(); console.log(u, r.status); } catch (e) { console.log(u, e.message); } } throw new Error("overpass"); };
const bat = { elements: [] };
for (const [a, b] of [[-1, -1], [-1, 0], [0, -1], [0, 0]]) {
  const q = [lat + a * dLa, lon + b * dLo, lat + (a + 1) * dLa, lon + (b + 1) * dLo].map((v) => v.toFixed(4)).join(",");
  const r2 = await ask(`[out:json][timeout:90][bbox:${q}];way["building"];out tags geom qt;`);
  const ids = new Set(bat.elements.map((e) => e.id));
  for (const e of r2.elements ?? []) if (!ids.has(e.id)) bat.elements.push(e);
}
const arb = await ask(`[out:json][timeout:120][bbox:${bbox}];node["natural"="tree"];out qt;`);
const flat = (g) => g.flatMap((p) => [Math.round(p.lon * 1e7) / 1e7, Math.round(p.lat * 1e7) / 1e7]);
const haut = (t) => { const h = parseFloat(String(t.height ?? "").replace(",", ".")); if (h > 0) return Math.min(h, 200); const n = parseFloat(t["building:levels"]); return n > 0 ? Math.min(n * 3.2 + (parseFloat(t["roof:levels"]) || 0) * 2 + 1.5, 200) : 0; };
const batiments = [];
for (const e of bat.elements ?? []) { const t = e.tags ?? {}; if (t.building === "roof" || t.location === "underground" || !(e.geometry?.length > 3)) continue; batiments.push({ id: `w${e.id}`, h: haut(t), c: t["building:colour"] ?? null, rc: t["roof:colour"] ?? null, k: t.building, rings: [flat(e.geometry)] }); }
const arbres = (arb.elements ?? []).map((e) => [Math.round(e.lon * 1e7) / 1e7, Math.round(e.lat * 1e7) / 1e7]);
writeFileSync(`${out}/ville.json`, JSON.stringify({ batiments, arbres }));
console.log(batiments.length, "immeubles", arbres.length, "arbres");
