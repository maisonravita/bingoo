// Explorer – rendu : beaucoup de sites récents s'affichent en JavaScript ; lus sans navigateur, ils paraissent vides.
// Ici un vrai navigateur (Playwright, sans IA) affiche l'accueil, applique les mêmes règles que la lecture sans IA
// (verdictSansIa, recopiée depuis saas-base.ts) et :
//  - si c'est un outil en ligne : garde l'accueil affiché (saas.accueil_rendu) et remet la fiche en file ; les lecteurs
//    de la base l'utilisent une fois puis l'effacent ;
//  - si c'est une boutique : pas_saas ; sinon : marquée comme vue (accueil_rendu_at) pour ne pas la rouvrir.
// Plusieurs tranches tournent en parallèle (PART / PARTS).
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const TOK = process.env.SUPABASE_ACCESS_TOKEN, REF = "fbsjbnnmzazylmquzryo";
const PART = Number(process.env.PART || 0), PARTS = Number(process.env.PARTS || 1), MAX = Number(process.env.MAX || 3000);
const PAR = Number(process.env.PAR || 6), FIN = Date.now() + Number(process.env.MINUTES || 300) * 60_000;

async function q(sql, n = 0) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json", "User-Agent": "bingoo-ci" }, body: JSON.stringify({ query: sql }) });
  if (r.status === 429 && n < 6) { await new Promise((ok) => setTimeout(ok, 5000 * (n + 1))); return q(sql, n + 1); }
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
const lit = (v) => (v == null ? "null" : "'" + String(v).replace(/'/g, "''") + "'");

// Même règle que la base (une seule source : saas-base.ts)
const src = fs.readFileSync(path.join(__dirname, "../../supabase/functions/_shared/saas-base.ts"), "utf8");
const corps = src.slice(src.indexOf("export function verdictSansIa"));
const fn = corps.slice(0, corps.indexOf("\n}\n") + 2).replace(/^export /, "").replace(/: string/g, "");
const verdictSansIa = new Function(`${fn}; return verdictSansIa;`)();

async function interdit(domaine) {
  try {
    const r = await fetch(`https://${domaine}/robots.txt`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return false;
    let tous = false, regle = false;
    for (const brut of (await r.text()).split(/\r?\n/)) {
      const l = brut.replace(/#.*/, "").trim(); const m = l.match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
      const k = m[1].toLowerCase(), v = m[2].trim();
      if (k === "user-agent") { if (regle) { tous = false; regle = false; } if (v === "*" || /bingoo/i.test(v)) tous = true; }
      else { regle = true; if (tous && k === "disallow" && v === "/") return true; }
    }
  } catch { /* pas de robots.txt lisible : autorisé */ }
  return false;
}
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

(async () => {
  const rows = await q(`select id, domaine from public.saas where statut = 'a_lire' and succes is null and accueil_rendu_at is null
    and abs(hashtext(id::text)) % ${PARTS} = ${PART} order by created_at desc limit ${MAX}`);
  console.log(`tranche ${PART}/${PARTS} : ${rows.length} sites`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: "fr-FR", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 BingooBot/1.0 (+https://kairo.maisonravita.fr/#/retrait)" });
  await ctx.route("**/*", (r) => (["image", "media", "font"].includes(r.request().resourceType()) ? r.abort() : r.continue()));
  const res = { saas: 0, pas_saas: 0, vu: 0 };
  let lot = [];
  const vider = async () => {
    if (!lot.length) return;
    const l = lot; lot = [];
    const v = l.map((x) => `(${lit(x.id)}::uuid, ${lit(x.statut)}, ${lit(x.rendu)})`).join(",");
    await q(`update public.saas s set accueil_rendu_at = now(), accueil_rendu = coalesce(v.rendu, s.accueil_rendu),
      statut = case when v.statut = 'pas_saas' then 'pas_saas' else s.statut end,
      essais = case when v.statut = 'saas' then 0 else s.essais end
      from (values ${v}) v(id, statut, rendu) where s.id = v.id and s.statut = 'a_lire'`).catch((e) => console.error("écriture", e.message));
  };
  let i = 0;
  const travail = async () => {
    while (i < rows.length && Date.now() < FIN) {
      const r = rows[i++];
      let statut = "vu", rendu = null;
      if (!(await interdit(r.domaine))) {
        const p = await ctx.newPage();
        try {
          const rep = await p.goto(`https://${r.domaine}`, { waitUntil: "domcontentloaded", timeout: 20000 });
          if (rep && rep.status() < 400) {
            await p.waitForTimeout(3000);
            const d = await p.evaluate(() => {
              const m = (s) => document.querySelector(s)?.getAttribute("content") || "";
              return { titre: document.title || "", desc: m('meta[name="description"]') || m('meta[property="og:description"]'), texte: document.body ? document.body.innerText : "" };
            });
            const texte = d.texte.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").slice(0, 6000);
            const v = verdictSansIa(`${d.titre}\n${d.desc}\n${texte}`, "", "");
            if (v === "saas") {
              statut = "saas";
              rendu = `<html><head><title>${esc(d.titre)}</title><meta name="description" content="${esc(d.desc)}"></head><body>${esc(texte).replace(/\n/g, "<br>\n")}</body></html>`;
            } else if (v === "pas_saas") statut = "pas_saas";
          }
        } catch { /* site lent ou en panne : marqué vu */ }
        await p.close().catch(() => {});
      }
      res[statut]++;
      lot.push({ id: r.id, statut, rendu });
      if (lot.length >= 25) await vider();
    }
  };
  await Promise.all(Array.from({ length: PAR }, travail));
  await vider();
  await browser.close();
  console.log("résultat :", JSON.stringify(res));
})().catch((e) => { console.error(e); process.exit(1); });
