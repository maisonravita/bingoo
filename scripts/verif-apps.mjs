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

// Contrôle de fidélité (sans IA) : le SaaS ressemble-t-il à sa famille de logiciel, ou à un logiciel de gestion habillé ?
// Seulement pour les SaaS conçus avec une famille (les plus anciens ne sont pas concernés). Chaque écart part en réparation avec sa consigne.
const SIGNATURE = {
  edition: [/ui\.(Editeur|Toile|ConstructeurFormulaire|EditeurVitrine)\b/, "le vrai espace de création du produit : un éditeur de documents (ui.Editeur), une toile de création graphique (ui.Toile) ou un constructeur de formulaires (ui.ConstructeurFormulaire), selon ce que fait le produit d'origine"],
  ia: [/ui\.Chat|\bia\(/, "l'interaction IA du produit (ui.Chat pour une conversation, ou une grande zone de saisie avec un résultat généré par ia())"],
  projets: [/ui\.(Kanban|Tableau)\b/, "un tableau de colonnes personnalisables et de cartes déplaçables (ui.Kanban avec les colonnes du tableau ouvert)"],
  communaute: [/ui\.Fil/, "un fil de publications des membres (ui.Fil) avec une zone pour publier"],
  contenu: [/ui\.(Galerie|EditeurVitrine|Vitrine)\b/, "une galerie de cartes (ui.Galerie) avec recherche et filtres"],
  reservation: [/ui\.Calendrier|ui\.Creneaux/, "un vrai calendrier des réservations (ui.Calendrier)"],
};
function fidelite(spec) {
  const f = spec?.famille, F = FAMILLES[f]; if (!F) return {};
  const ecrans = (spec.ecrans ?? []).filter((e) => !e.public && e.code), out = {};
  const ref = spec.nature?.espace_principal ? ` L'espace principal du produit d'origine : ${spec.nature.espace_principal}.` : "";
  const premier = ecrans[0];
  if (premier && !["gestion", "analyse"].includes(f)) {
    const stats = (premier.code.match(/ui\.Stat\b/g) ?? []).length;
    if (/tableau de bord/i.test(premier.titre ?? "") || /ui\.Table\b/.test(premier.code) || stats >= 3)
      out[premier.id] = `Fidélité : cet écran d'accueil ressemble à un logiciel de gestion (tableau ou rangée d'indicateurs). Pour un logiciel de la famille « ${F.label} », le premier écran est : ${F.accueil}.${ref} Réécris-le comme cet espace principal, sans ui.Table ni rangée de ui.Stat, et change son titre s'il dit « Tableau de bord ».`;
  }
  const sig = SIGNATURE[f];
  if (sig && !ecrans.some((e) => sig[0].test(e.code)) && premier && !out[premier.id])
    out[premier.id] = `Fidélité : il manque ce qui définit un logiciel de la famille « ${F.label} » : ${sig[1]}.${ref} Ajoute-le à cet écran, il doit vraiment fonctionner et enregistrer ses données.`;
  for (const e of ecrans.slice(1)) if (!["gestion", "analyse", "crm", "reservation"].includes(f) && /ui\.Table\b/.test(e.code) && !out[e.id])
    out[e.id] = `Fidélité : un tableau de données n'a pas sa place dans un logiciel de la famille « ${F.label} ». Remplace ui.Table par les composants de la famille (${F.guide.split("\n")[1]?.slice(2, 220) ?? ""}).`;
  return out;
}

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
