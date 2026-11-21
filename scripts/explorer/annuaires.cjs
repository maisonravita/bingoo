// Explorer – annuaires : les annuaires de lancement (BetaList, Uneed, Microlaunch, annuaires d'outils IA…) listent
// des dizaines de milliers d'applis web récentes. Sans IA : on lit leur plan du site, puis chaque fiche produit à un
// rythme doux (1 page par seconde et par annuaire), on garde l'adresse du site du produit et on l'ajoute aux candidats.
// Le navigateur de « Explorer – rendu » vérifie ensuite que c'est bien un outil en ligne avant de l'ajouter à la base.
// robots.txt est respecté : une page interdite n'est jamais ouverte.
const court = (e) => String(e?.message ?? e).split(/[\n{:]/)[0].slice(0, 60); // journaux publics : jamais de données ni de requête
const TOK = process.env.SUPABASE_ACCESS_TOKEN, REF = "fbsjbnnmzazylmquzryo";
const FIN = Date.now() + Number(process.env.MINUTES || 300) * 60_000;
const UA = "BingooBot/1.0 (+https://kairo.maisonravita.fr/#/retrait)";
// [annuaire, motif des pages produit]
const ANNUAIRES = [
  ["betalist.com", /\/startups\/[a-z0-9-]+\/?$/i],
  ["uneed.best", /\/tool\/[a-z0-9-]+\/?$/i],
  ["microlaunch.net", /\/p\/[a-z0-9-]+\/?$/i],
  ["fazier.com", /\/launches\/[a-z0-9.-]+\/?$/i],
  ["launchingnext.com", /\/startup\/[a-z0-9-]+\/?$/i],
  ["saashub.com", /^https:\/\/www\.saashub\.com\/[a-z0-9-]+\/?$/i],
  ["theresanaiforthat.com", /\/ai\/[a-z0-9-]+\/?$/i],
  ["futurepedia.io", /\/tool\/[a-z0-9-]+\/?$/i],
  ["toolify.ai", /\/tool\/[a-z0-9-]+\/?$/i],
  ["aitoolsdirectory.com", /\/tool\/[a-z0-9-]+\/?$/i],
  ["tinylaunch.com", /\/launch\/[a-z0-9-]+\/?$/i],
  ["peerlist.io", /\/launchpad\/[a-z0-9-]+\/?$/i],
].filter(([d]) => !process.env.SEULEMENT || process.env.SEULEMENT.split(",").includes(d));
// Liens qui ne sont jamais le site du produit
const EXCLUS = /(^|\.)(twitter|x|facebook|instagram|linkedin|youtube|youtu|tiktok|github|discord|t|reddit|medium|pinterest|apple|google|play\.google|apps\.apple|chrome\.google|producthunt|betalist|uneed|microlaunch|fazier|launchingnext|saashub|theresanaiforthat|futurepedia|toolify|aitoolsdirectory|tinylaunch|peerlist|stripe|paypal|gravatar|cloudflare|vercel|netlify|googleapis|gstatic|wp|wordpress|bit|linktr|notion|typeform|calendly|substack|gumroad|crunchbase|wikipedia|amazon|amazonaws|cdn|jsdelivr|unpkg|fonts|w3|schema|sentry|intercom|hotjar|plausible|umami|mailchimp|beehiiv|ko-fi|buymeacoffee|patreon|whop)\.[a-z.]+$/i;

async function q(sql, n = 0) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json", "User-Agent": "bingoo-ci" }, body: JSON.stringify({ query: sql }) });
  if ((r.status === 429 || r.status >= 500) && n < 6) { await dormir(5000 * (n + 1)); return q(sql, n + 1); }
  if (!r.ok) { const t = await r.text(); if (/40P01|deadlock|55P03/i.test(t) && n < 6) { await dormir(5000 * (n + 1)); return q(sql, n + 1); } throw new Error(`${r.status} ${t}`); }
  return r.json();
}
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
// Arrêt automatique : base gratuite Supabase limitée à 500 Mo (arrêt à 470 Mo) et objectif de 80 000 SaaS et applis (PLAFOND)
let pleine = false, vuTaille = 0;
async function basePleine() {
  if (pleine || Date.now() - vuTaille < 600_000) return pleine;
  vuTaille = Date.now();
  // Mesure légère (estimations de Postgres, pas de comptage complet) : la base gratuite reste rapide pour les utilisateurs
  const r = await q(`select (select sum(pg_total_relation_size(oid)) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r') / 1048576 + 60 as mo,
    (select count(*) from public.saas where statut = 'ok') + (select reltuples::int from pg_class where oid = 'public.saas_mobiles'::regclass) as total`).catch(() => null);
  const plafond = Number(process.env.PLAFOND || 80000);
  if (r?.[0]?.mo > 470) { pleine = true; console.log("Base presque pleine (", r[0].mo, "Mo) : collecte arrêtée"); }
  if (r?.[0]?.total >= plafond) { pleine = true; console.log("Objectif atteint (", r[0].total, "SaaS et applis) : collecte arrêtée"); }
  return pleine;
}
const lit = (v) => "'" + String(v).replace(/'/g, "''") + "'";
async function texte(url) {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xml" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}
async function regles(site) {
  const t = await texte(`https://${site}/robots.txt`) ?? "";
  const interdits = [], plans = [];
  let tous = false, regle = false;
  for (const brut of t.split(/\r?\n/)) {
    const l = brut.replace(/#.*/, "").trim(); const m = l.match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "sitemap") { plans.push(v); continue; }
    if (k === "user-agent") { if (regle) { tous = false; regle = false; } if (v === "*" || /bingoo/i.test(v)) tous = true; }
    else { regle = true; if (tous && k === "disallow" && v) interdits.push(v.replace(/\*.*$/, "")); }
  }
  return { interdit: (u) => { try { const p = new URL(u).pathname; return interdits.some((x) => x && p.startsWith(x)); } catch { return true; } }, plans };
}
const domaineDe = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } };

async function annuaire([site, motif]) {
  const r = await regles(site);
  if (r.interdit(`https://${site}/`)) { console.log(site, ": interdit par robots.txt"); return; }
  // Plan du site (y compris les plans imbriqués)
  const file = r.plans.length ? [...r.plans] : [`https://${site}/sitemap.xml`, `https://www.${site}/sitemap.xml`];
  const vus = new Set(), pages = new Set();
  while (file.length && vus.size < 400 && Date.now() < FIN) {
    const u = file.shift(); if (vus.has(u)) continue; vus.add(u);
    const x = await texte(u); if (!x) continue;
    for (const m of x.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
      const l = m[1].replace(/&amp;/g, "&");
      if (/\.xml(\.gz)?$|sitemap/i.test(l)) { if (!/\.gz$/.test(l)) file.push(l); }
      else if (motif.test(l) && !r.interdit(l)) pages.add(l);
    }
    await dormir(800);
  }
  console.log(site, ":", pages.size, "fiches produit");
  const ici = domaineDe(`https://${site}`);
  let lot = [], total = 0;
  const vider = async () => {
    if (!lot.length) return;
    const l = [...new Set(lot)]; lot = [];
    await q(`insert into public.saas_candidats (domaine, rang, statut, note, at) values ${l.map((d) => `(${lit(d)}, 0, 'erreur', null, now())`).join(",")}
      on conflict (domaine) do nothing`).then((x) => (total += l.length)).catch((e) => console.error(site, "écriture", court(e)));
  };
  for (const p of pages) {
    if (Date.now() > FIN || await basePleine()) break;
    const h = await texte(p);
    await dormir(1000);
    if (!h) continue;
    // Le site du produit : d'abord un lien « Visit / Visiter / Website », sinon le premier lien externe qui n'est ni un réseau social ni l'annuaire
    const liens = [...h.matchAll(/<a\b[^>]*href=["'](https?:\/\/[^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)].map((m) => ({ u: m[1], t: m[2].replace(/<[^>]+>/g, " ") }));
    const bon = (x) => { const d = domaineDe(x.u); return d && d !== ici && !d.endsWith(`.${ici}`) && !EXCLUS.test(d) && d.includes("."); };
    const choix = liens.find((x) => bon(x) && /visit|website|site|try|open|launch|get started|voir|visiter/i.test(x.t)) ?? liens.find(bon);
    const d = choix && domaineDe(choix.u);
    if (d) lot.push(d);
    if (lot.length >= 100) await vider();
  }
  await vider();
  console.log(site, ": domaines ajoutés aux candidats :", total);
}

(async () => {
  // Les annuaires en parallèle (chacun à son propre rythme doux)
  await Promise.all(ANNUAIRES.map((a) => annuaire(a).catch((e) => console.error(a[0], court(e)))));
})().catch((e) => { console.error("arrêt :", court(e)); process.exit(1); });
