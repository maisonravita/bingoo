// Génère supabase/functions/_shared/modeles-code.ts à partir des écrans écrits à la main (modeles/<modele>/*.js)
import fs from "fs";
import path from "path";
const racine = new URL("../modeles/", import.meta.url).pathname;
const out = {};
for (const m of fs.readdirSync(racine)) {
  const dir = path.join(racine, m);
  if (!fs.statSync(dir).isDirectory()) continue;
  out[m] = Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => [f.replace(/\.js$/, ""), fs.readFileSync(path.join(dir, f), "utf8")]));
}
fs.writeFileSync(new URL("../supabase/functions/_shared/modeles-code.ts", import.meta.url).pathname, `// Généré par scripts/modeles.mjs : ne pas modifier à la main (modifier modeles/<modele>/*.js puis relancer le script)\nexport const MODELES_CODE: Record<string, Record<string, string>> = ${JSON.stringify(out)};\n`);
console.log(Object.entries(out).map(([k, v]) => `${k}: ${Object.keys(v).length} écrans`).join(", "));
