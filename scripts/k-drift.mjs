// Compare la fonction k en ligne et celle du dépôt : actions (routes) et textes visibles par l'utilisateur.
// Usage : node scripts/k-drift.mjs <en_ligne.ts> <depot.js>
import { readFileSync } from "node:fs";
const dec = (s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
const load = (f) => dec(readFileSync(f, "utf8"));
const routes = (t) => new Set([...t.matchAll(/async ?["']?([a-z][a-z0-9-]{2,40})["']? ?\((?:_?req|_?[a-z]),\s?[a-z]\)/g)].map((m) => m[1]));
const texts = (t) => new Set([...t.matchAll(/["'`]([^"'`\n]{25,160})["'`]/g)].map((m) => m[1]).filter((s) => /[a-zàéèêç] [a-zàéèêç]/i.test(s) && !/[{}=;]|https?:/.test(s)));
const [live, repo] = [load(process.argv[2]), load(process.argv[3])];
const diff = (a, b) => [...a].filter((x) => !b.has(x)).sort();
const [rl, rr, tl, tr] = [routes(live), routes(repo), texts(live), texts(repo)];
console.log(`ROUTES en ligne ${rl.size} / dépôt ${rr.size}`);
console.log("Seulement en ligne :", diff(rl, rr).join(", ") || "aucune");
console.log("Seulement dans le dépôt :", diff(rr, rl).join(", ") || "aucune");
console.log(`TEXTES seulement en ligne : ${diff(tl, tr).length}, seulement dans le dépôt : ${diff(tr, tl).length}`);
console.log("--- exemples seulement en ligne"); for (const s of diff(tl, tr).slice(0, 25)) console.log(" -", s);
console.log("--- exemples seulement dans le dépôt"); for (const s of diff(tr, tl).slice(0, 25)) console.log(" +", s);
