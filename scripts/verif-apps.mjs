// Vérification des SaaS livrés, côté serveur : chaque SaaS prêt dont la version n'a pas encore été vérifiée est ouvert
// dans un vrai navigateur, écran par écran, avec ses données d'exemple. Les résultats partent à « saas-app-verif »,
// qui fait réécrire automatiquement les écrans cassés (2 essais par écran) ; la version réparée est revérifiée au passage suivant.
// Avant, la vérification n'avait lieu que si le membre ouvrait la page de son SaaS dans Bingoo! et la laissait ouverte.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";

const TOK = process.env.SUPABASE_ACCESS_TOKEN, REF = "fbsjbnnmzazylmquzryo";
const MAX = Number(process.env.MAX || 15), SLUG = process.env.SLUG || "", BLANC = process.env.BLANC === "1";
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  if (!r.ok) throw new Error(`SQL ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
const lit = (v) => "'" + String(v).replace(/'/g, "''") + "'";

// La coque des SaaS (src/lib/appShell.js) est regroupée en un module importable par Node
execFileSync("npx", ["esbuild", "src/lib/appShell.js", "--bundle", "--format=esm", "--platform=node", "--outfile=/tmp/appShell.verif.mjs", "--log-level=warning"], { stdio: "inherit" });
const { appHtml } = await import("/tmp/appShell.verif.mjs");
execFileSync("npx", ["esbuild", "supabase/functions/_shared/familles.ts", "--bundle", "--format=esm", "--platform=node", "--outfile=/tmp/familles.verif.mjs", "--log-level=warning"], { stdio: "inherit" });
const { FAMILLES } = await import("/tmp/familles.verif.mjs");

// Contrôle de fidélité (sans IA) : règles partagées avec la construction (supabase/functions/_shared/fidelite.ts)
execFileSync("npx", ["esbuild", "supabase/functions/_shared/fidelite.ts", "--bundle", "--format=esm", "--platform=node", "--outfile=/tmp/fidelite.verif.mjs", "--log-level=warning"], { stdio: "inherit" });
const { fidelite: fideliteF } = await import("/tmp/fidelite.verif.mjs");
const fidelite = (spec) => fideliteF(spec, FAMILLES);

const enLigne = await q(`select id, workspace_id, slug, version, spec from saas_apps where statut = 'pret'
  ${SLUG ? `and slug = ${lit(SLUG)}` : BLANC ? "" : `and (verif is null or coalesce((verif->>'version')::int, -1) <> version or (verif->>'phase' = 'en_cours' and jsonb_array_length(coalesce(verif->'en_reparation', '[]'::jsonb)) = 0)) and maj < now() - interval '1 minute'`}
  order by maj desc limit ${MAX}`);
// Modifications de l'atelier en attente de test sur leur version d'aperçu (le membre a fermé la page) : testées ici,
// et publiées seulement si tout passe (r/saas-app-verif-brouillon)
const apercus = BLANC ? [] : (await q(`select id, workspace_id, slug, version, brouillon - '_modif' - '_test' as spec, coalesce((brouillon->'_test'->>'passages')::int, 0) passage from saas_apps
  where brouillon->'_test'->>'phase' = 'en_cours' and jsonb_array_length(coalesce(brouillon->'_test'->'en_reparation', '[]'::jsonb)) = 0
  ${SLUG ? `and slug = ${lit(SLUG)}` : `and maj < now() - interval '1 minute'`} limit ${MAX}`)).map((a) => ({ ...a, apercu: true }));
const apps = [...apercus, ...enLigne];
console.log(apps.length, "SaaS à vérifier");
if (!apps.length) process.exit(0);

// Petit serveur local : la page de chaque SaaS est servie depuis une vraie adresse (les modules ES en ont besoin)
let page = "";
const srv = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(page); }).listen(0);
const port = srv.address().port;
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
let total = 0, casses = 0;
for (const a of apps) {
  const t0 = Date.now();
  let resultats = null;
  try {
    page = appHtml({ spec: a.spec, slug: a.slug, api: "https://exemple.invalid/api", verif: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
    const p = await ctx.newPage();
    await p.exposeFunction("__resultat", (r) => { resultats = r; });
    await p.addInitScript(() => addEventListener("message", (e) => { if (e.data?.type === "bingoo-verif") window.__resultat(e.data); }));
    await p.goto(`http://localhost:${port}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const fin = Date.now() + 25000 + (a.spec?.ecrans?.length ?? 8) * 9000;
    while (!resultats && Date.now() < fin) await p.waitForTimeout(500);
    // Diagnostic de lisibilité (DEBUG_TEXTE=mot) : couleurs calculées seulement, aucun contenu
    if (process.env.DEBUG_TEXTE) console.log("  diagnostic :", JSON.stringify(await p.evaluate((mot) => [...document.querySelectorAll("#root *")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() === mot)).slice(0, 4).map((el) => { const chaine = []; for (let n = el; n && n.nodeType === 1 && chaine.length < 6; n = n.parentElement) { const cs = getComputedStyle(n); chaine.push([cs.backgroundColor, cs.backgroundImage.slice(0, 60)]); } return { couleur: getComputedStyle(el).color, inline: el.style.color, lisible: el.dataset.lisible ?? null, fonds: chaine }; }), process.env.DEBUG_TEXTE)));
    await ctx.close();
  } catch (e) { console.log("  page impossible à ouvrir :", String(e?.message ?? e).slice(0, 200)); }
  if (!resultats) {
    console.log(`✗ ${a.slug} : la vérification n'a pas abouti (coque qui ne démarre pas)`); casses++;
    // Pendant la boucle de livraison, une application qui ne démarre pas est un vrai résultat : tous ses écrans partent en correction
    if (!a.spec?.ecrans?.length) continue;
    resultats = { ecrans: a.spec.ecrans.length, resultats: a.spec.ecrans.map((e) => ({ id: e.id, ok: false, erreur: "L'application ne démarre pas : la page reste blanche ou plante à l'ouverture." })) };
  }
  // Site avec système de design : la page publique à 390 et 320 px (débordements, chevauchements, zones tactiles), et
  // les balises de partage sur la vraie adresse publique. Les problèmes vont sur l'écran d'accueil, comme au robot de la page.
  if (a.spec?.type === "site" && a.spec?.design && !a.apercu && resultats?.resultats?.length) {
    const pbs = [];
    for (const largeur of [390, 320]) {
      let pub = null;
      try {
        page = appHtml({ spec: a.spec, slug: a.slug, api: "https://exemple.invalid/api", verif: "public" });
        const ctx = await browser.newContext({ viewport: { width: largeur, height: 800 }, locale: "fr-FR", isMobile: true, hasTouch: true });
        const p = await ctx.newPage();
        await p.exposeFunction("__resultat", (r) => { pub = r; });
        await p.addInitScript(() => addEventListener("message", (e) => { if (e.data?.type === "bingoo-verif") window.__resultat(e.data); }));
        await p.goto(`http://localhost:${port}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
        const fin = Date.now() + 30000;
        while (!pub && Date.now() < fin) await p.waitForTimeout(400);
        await ctx.close();
      } catch (e) { console.log(`  page publique à ${largeur} px impossible à ouvrir :`, String(e?.message ?? e).slice(0, 120)); }
      const r = (pub?.resultats ?? []).find((x) => x.id === "_public");
      if (r?.erreur) pbs.push(`à ${largeur} px : ${r.erreur.replace(/^Page publique : /, "")}`);
    }
    // Diagnostic des zones vides (debug=vide) : capture pleine page et ce qui se trouve dans la plus grande bande vide
    if (process.env.DEBUG_TEXTE === "vide") for (const largeur of [1280, 390]) {
      try {
        page = appHtml({ spec: a.spec, slug: a.slug, api: "https://exemple.invalid/api", verif: "public" });
        const ctx = await browser.newContext({ viewport: { width: largeur, height: largeur > 800 ? 800 : 800 }, locale: "fr-FR" }); const p = await ctx.newPage();
        await p.goto(`http://localhost:${port}/`, { waitUntil: "domcontentloaded", timeout: 60000 }); await p.waitForFunction(() => document.querySelector("h1"), null, { timeout: 20000 }).catch(() => null); await p.waitForTimeout(1300);
        fs.mkdirSync("/tmp/vide", { recursive: true }); await p.screenshot({ path: `/tmp/vide/${a.slug}-${largeur}.png`, fullPage: true });
        const d = await p.evaluate(() => {
          const vis = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05; };
          const pas = 8, occ = new Set(), tous = [...document.querySelectorAll("body *")].filter(vis);
          for (const el of tous) { if (!el.matches("h1,h2,h3,h4,p,li,a,button,img,svg,input,textarea,select,video,canvas,picture") && ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !/url\(/.test(getComputedStyle(el).backgroundImage)) continue; const r = el.getBoundingClientRect(); for (let y = Math.max(0, Math.floor((r.top + scrollY) / pas)); y <= Math.floor((r.bottom + scrollY) / pas); y++) occ.add(y); }
          const fin = Math.floor(document.documentElement.scrollHeight / pas); let v = 0, max = 0, debut = 0, best = 0;
          for (let y = 0; y < fin; y++) { if (occ.has(y)) v = 0; else { if (!v) debut = y; v++; if (v > max) { max = v; best = debut; } } }
          const y0 = best * pas, y1 = (best + max) * pas, mid = (y0 + y1) / 2;
          const dans = [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); return r.top + scrollY <= mid && r.bottom + scrollY >= mid && r.width > 50; }).slice(-8)
            .map((el) => { const cs = getComputedStyle(el); return `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} h=${Math.round(el.getBoundingClientRect().height)} op=${cs.opacity} vis=${cs.visibility} bg=${cs.backgroundImage.slice(0, 40)} img=${el.tagName === "IMG" ? (el.complete && el.naturalWidth ? "ok" : "non chargée") : ""}`; });
          const imgs = [...document.querySelectorAll("img")].map((im) => `${im.complete && im.naturalWidth ? "chargée" : "NON chargée"} h=${Math.round(im.getBoundingClientRect().height)} ${String(im.getAttribute("src") ?? "").slice(0, 40)}`);
          const caches = [...document.querySelectorAll("section, [data-enter], [data-reveal]")].filter((el) => Number(getComputedStyle(el).opacity) < 0.05).length;
          return { y0, y1, hauteur: document.documentElement.scrollHeight, dans, imgs, caches };
        });
        console.log(`  vide ${largeur}px : bande ${d.y0}-${d.y1} sur ${d.hauteur}, sections invisibles : ${d.caches}`); for (const x of d.dans) console.log("    ·", x); for (const x of d.imgs) console.log("    img", x);
        await ctx.close();
      } catch (e) { console.log("  diagnostic vide impossible :", String(e?.message ?? e).slice(0, 120)); }
    }
    try {
      const h = await (await fetch(`https://www.bingoo.fr/s/${a.slug}`, { signal: AbortSignal.timeout(20000) })).text();
      const manque = ["og:title", "og:description", "og:image", "description"].filter((n) => !new RegExp(`<meta (?:property|name)="${n}" content="[^"]+"`).test(h));
      if (manque.length) pbs.push(`balises de partage absentes : ${manque.join(", ")}`);
    } catch (e) { console.log("  adresse publique injoignable :", String(e?.message ?? e).slice(0, 80)); }
    if (pbs.length) {
      const r0 = resultats.resultats[0];
      r0.ok = false; r0.erreur = String((r0.erreur ? r0.erreur + " " : "") + "Page publique " + pbs.join(" ; ")).slice(0, 700);
    }
  }
  // Un écran qui s'affiche bien mais trahit sa famille est aussi à reprendre
  const fid = fidelite(a.spec);
  resultats.resultats = resultats.resultats.map((r) => r.ok && fid[r.id] ? { ...r, ok: false, erreur: fid[r.id] } : r);
  const ko = resultats.resultats.filter((r) => !r.ok);
  total++; if (ko.length) casses++;
  console.log(`${ko.length ? "✗" : "✓"} ${a.slug} (${a.spec?.nom}) : ${resultats.resultats.length - ko.length}/${resultats.ecrans} écrans bons en ${Math.round((Date.now() - t0) / 1000)} s`);
  for (const r of ko) console.log(`    - ${r.id} : ${String(r.erreur ?? "").slice(0, 220)}`);
  // Envoi à Bingoo! (clé interne lue dans la base, jamais affichée) : enregistre le résultat et lance la réparation
  if (BLANC) continue;
  const corps = JSON.stringify(a.apercu ? { workspace_id: a.workspace_id, app_id: a.id, passage: a.passage, resultats: resultats.resultats } : { workspace_id: a.workspace_id, app_id: a.id, version: a.version, resultats: resultats.resultats });
  if (a.apercu) console.log("    (version d'aperçu d'une modification de l'atelier)");
  await q(`select net.http_post(url := 'https://${REF}.supabase.co/functions/v1/r/${a.apercu ? "saas-app-verif-brouillon" : "saas-app-verif"}', body := ${lit(corps)}::jsonb,
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-key', (select value from app_secrets where name = 'cron_key')), timeout_milliseconds := 60000)`);
}
await browser.close(); srv.close();
console.log(`Bilan : ${total} SaaS vérifiés, ${casses} avec au moins un écran à réparer`);
fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY || "/dev/null", `${total} SaaS vérifiés, ${casses} à réparer\n`);
