// Génère supabase/functions/_shared/modeles-code.ts à partir des écrans écrits à la main (modeles/<modele>/*.js)
import fs from "fs";
import path from "path";
const racine = new URL("../modeles/", import.meta.url).pathname;
const out = {};
for (const m of fs.readdirSync(racine)) {
  const dir = path.join(racine, m);
  if (!fs.statSync(dir).isDirectory()) continue;
  // _commun.js (facultatif) : éléments de design partagés, ajoutés en tête de chaque écran du modèle
  const commun = fs.existsSync(path.join(dir, "_commun.js")) ? fs.readFileSync(path.join(dir, "_commun.js"), "utf8") + "\n" : "";
  out[m] = Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith(".js") && !f.startsWith("_")).map((f) => [f.replace(/\.js$/, ""), commun + fs.readFileSync(path.join(dir, f), "utf8")]));
}
fs.writeFileSync(new URL("../supabase/functions/_shared/modeles-code.ts", import.meta.url).pathname, `// Généré par scripts/modeles.mjs : ne pas modifier à la main (modifier modeles/<modele>/*.js puis relancer le script)\nexport const MODELES_CODE: Record<string, Record<string, string>> = ${JSON.stringify(out)};\n`);
console.log(Object.entries(out).map(([k, v]) => `${k}: ${Object.keys(v).length} écrans`).join(", "));
