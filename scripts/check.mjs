import { createRequire } from "node:module";
// Contrôles avant mise en ligne : `npm run check`
// 1. chaque fonction serveur se construit ; 2. le site se construit ; 3. les pages publiques s'affichent sans erreur JavaScript.
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { BRAND, esbuildBrand } from "./brand.mjs";

let failed = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const ko = (m) => { failed++; console.log(`  ✗ ${m}`); };

console.log("Fonctions serveur");
for (const fn of readdirSync("supabase/functions").filter((d) => !d.startsWith("_") && statSync(`supabase/functions/${d}`).isDirectory())) {
  try {
    const r = await build({ entryPoints: [`supabase/functions/${fn}/index.ts`], bundle: true, format: "esm", platform: "neutral", target: "es2022", external: ["npm:*", "node:*"], minify: true, write: false, logLevel: "silent", plugins: [esbuildBrand] });
    const kb = Math.round(r.outputFiles[0].contents.length / 1024);
    ok(`${fn} (${kb} Ko)`);
  } catch (e) { ko(`${fn} : ${e.errors?.[0]?.text ?? e.message}`); }
}

console.log("Site");
try { execSync("VITE_HASH_ROUTER=1 npx vite build -c vite.single.config.js --logLevel error", { stdio: "pipe" }); ok("construction"); }
catch (e) { ko(`construction : ${String(e.stderr ?? e.message).slice(0, 300)}`); }

console.log("Pages publiques (affichage mobile)");
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
for (const [path, expect] of [["/opposition", "Ne plus être contacté"], ["/", "Créer mon compte"]]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`file://${process.cwd()}/dist-single/index.html#${path}`);
  await page.waitForTimeout(1200);
  const text = await page.textContent("body");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (errors.length) ko(`${path} : ${errors[0]}`);
  else if (!text.includes(expect)) ko(`${path} : texte « ${expect} » absent`);
  else if (overflow) ko(`${path} : déborde en largeur sur mobile`);
  else ok(path);
  await page.close();
}
await browser.close();

console.log(failed ? `\n${failed} problème(s) : ne pas mettre en ligne.` : "\nTout est bon : prêt à mettre en ligne.");
process.exit(failed ? 1 : 0);
