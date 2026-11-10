// Explorer – newsletters : inscrit l'adresse de veille de la plateforme (explorer-veille@maisonravita.fr) à la newsletter
// publique des SaaS de la base, pour la bibliothèque d'e-mails. Règles strictes :
// - pages autorisées par robots.txt, un passage par SaaS ;
// - seulement un formulaire de newsletter évident, dont le seul champ obligatoire est l'adresse e-mail ;
// - jamais de mot de passe, de création de compte, de demande de démo ou de contact, de case CGU, de captcha ;
// - une case de consentement à recevoir la newsletter est cochée (c'est l'objet même de l'inscription).
const { chromium } = require("playwright");
const TOK = process.env.SUPABASE_ACCESS_TOKEN, REF = "fbsjbnnmzazylmquzryo";
const ADRESSE = "explorer-veille@maisonravita.fr";
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json", "User-Agent": "bingoo-ci" }, body: JSON.stringify({ query: sql }) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
async function interditPar(domaine) {
  try {
    const r = await fetch(`https://${domaine}/robots.txt`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return [];
    const out = []; let tous = false, regle = false;
    for (const brut of (await r.text()).split(/\r?\n/)) {
      const l = brut.replace(/#.*/, "").trim(); const m = l.match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
      const k = m[1].toLowerCase(), v = m[2].trim();
      if (k === "user-agent") { if (regle) { tous = false; regle = false; } if (v === "*" || /bingoo/i.test(v)) tous = true; }
      else { regle = true; if (tous && k === "disallow" && v) out.push(v.replace(/\*.*$/, "")); }
    }
    return out;
  } catch { return []; }
}
const lit = (v) => "'" + String(v).replace(/'/g, "''") + "'";

// Dans la page : repère un formulaire de newsletter qui respecte les règles ; renvoie son index ou la raison du refus
const ANALYSE = (adresse) => {
  const NEWS = /(newsletter|subscribe|abonne|inscri(s|re|vez)|updates|stay (in touch|updated)|restez inform|lettre d'info|digest|weekly)/i;
  const INTERDIT = /(d[ée]mo|contact|devis|quote|essai|trial|cr[ée]er (un|mon) compte|create (an )?account|sign ?up for free|register|login|connexion|mot de passe|password|rendez-vous|webinar)/i;
  const visible = (el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none"; };
  const forms = [...document.querySelectorAll("form")].filter((f) => visible(f) && f.querySelector('input[type="email"], input[name*="mail" i]'));
  if (!forms.length) return { ok: false, raison: "pas_de_formulaire" };
  for (const [i, f] of forms.entries()) {
    const ctx = (f.innerText + " " + (f.closest("section,footer,div")?.innerText ?? "")).slice(0, 1500);
    if (!NEWS.test(ctx) || INTERDIT.test(f.innerText)) continue;
    if (f.querySelector('input[type="password"], textarea, iframe, .g-recaptcha, .h-captcha, .cf-turnstile, [data-sitekey]')) continue;
    const champs = [...f.querySelectorAll("input, select")].filter((x) => visible(x) && !["hidden", "submit", "button"].includes(x.type));
    const autres = champs.filter((x) => !(x.type === "email" || /mail/i.test(x.name || "")) && x.type !== "checkbox" && (x.required || x.getAttribute("aria-required") === "true"));
    if (autres.length) continue;
    const cases = champs.filter((x) => x.type === "checkbox" && (x.required || x.getAttribute("aria-required") === "true"));
    if (cases.some((c) => /(cgu|cgv|conditions|terms|privacy|confidentialit)/i.test((c.closest("label")?.innerText ?? c.parentElement?.innerText ?? "")) && !/(newsletter|recevoir|receive|e-?mails?)/i.test(c.closest("label")?.innerText ?? c.parentElement?.innerText ?? ""))) continue;
    f.setAttribute("data-bingoo", "1");
    return { ok: true, i };
  }
  return { ok: false, raison: "aucun_formulaire_conforme" };
};

(async () => {
  const max = Number(process.env.MAX || 30);
  const rows = await q(`select id, domaine from public.saas where statut = 'ok' and newsletter_at is null order by rang_web asc nulls last, score_croissance desc nulls last limit ${max}`);
  console.log("à essayer :", rows.length);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: "fr-FR", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 BingooBot/1.0 (+https://kairo.maisonravita.fr/#/retrait)" });
  const bilan = {};
  for (const r of rows) {
    let statut = "pas_de_formulaire";
    const interdit = await interditPar(r.domaine);
    const ok = (u) => { try { const p = new URL(u).pathname; return !interdit.some((x) => x && p.startsWith(x)); } catch { return false; } };
    const page = await ctx.newPage();
    try {
      const pages = [`https://${r.domaine}/`];
      if (ok(pages[0])) {
        await page.goto(pages[0], { waitUntil: "domcontentloaded", timeout: 25000 });
        await page.waitForTimeout(2500);
        let a = await page.evaluate(ANALYSE, ADRESSE);
        // Sinon, la page newsletter ou blog liée depuis l'accueil (même site)
        if (!a.ok) {
          const lien = await page.evaluate((dom) => [...document.querySelectorAll("a[href]")].map((x) => x.href).find((h) => { try { const u = new URL(h); return u.hostname.replace(/^www\./, "").endsWith(dom) && /(newsletter|subscribe|blog)\/?$/i.test(u.pathname); } catch { return false; } }) ?? "", r.domaine);
          if (lien && ok(lien)) { await page.goto(lien, { waitUntil: "domcontentloaded", timeout: 25000 }); await page.waitForTimeout(2500); a = await page.evaluate(ANALYSE, ADRESSE); }
        }
        if (a.ok) {
          const form = page.locator('form[data-bingoo="1"]').first();
          const champ = form.locator('input[type="email"], input[name*="mail" i]').first();
          await champ.fill(ADRESSE);
          for (const c of await form.locator('input[type="checkbox"]').all()) { if (await c.isVisible() && (await c.getAttribute("required")) !== null) await c.check({ force: true }).catch(() => {}); }
          const bouton = form.locator('button[type="submit"], input[type="submit"], button:not([type])').first();
          if (await bouton.count()) await bouton.click({ timeout: 8000 }); else await champ.press("Enter");
          await page.waitForTimeout(4000);
          statut = "demande";
        } else statut = a.raison;
      } else statut = "robots";
    } catch (e) { statut = "erreur"; }
    await page.close().catch(() => {});
    bilan[statut] = (bilan[statut] ?? 0) + 1;
    await q(`update public.saas set newsletter_at = now(), newsletter_statut = coalesce(nullif(newsletter_statut, ''), ${lit(statut)}) where id = ${lit(r.id)}`);
    console.log(r.domaine, statut);
  }
  await browser.close();
  console.log("bilan :", JSON.stringify(bilan));
})().catch((e) => { console.error(e); process.exit(1); });
