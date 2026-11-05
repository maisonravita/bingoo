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
