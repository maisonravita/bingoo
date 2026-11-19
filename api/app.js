// Page de présentation d'un SaaS construit par Bingoo!, rendue côté serveur pour Google :
// kairo.maisonravita.fr/p/<app> (l'application elle-même vit sur /#/app/<app>, que Google lit mal).
// /sitemap-apps.xml : toutes les pages de présentation et tous les articles des SaaS en ligne.
const URL_ = process.env.VITE_SUPABASE_URL || "https://fbsjbnnmzazylmquzryo.supabase.co";
const KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic2pibm5temF6eWxtcXV6cnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3MTcsImV4cCI6MjEwODc3ODcxN30.Kd497ZtRT__Ovy-tIMt47iJkpGbRc30NlpPQWqORGH0";
const SITE = "https://www.bingoo.fr";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
async function rpc(fn, body) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`base ${r.status}`);
  return r.json();
}
const prix = (n) => Number(n) ? `${Number(n).toLocaleString("fr-FR")} € / mois` : "Gratuit";

function rendu(pub) {
  const s = pub.spec || {}, slug = pub.slug;
  const c = /^#[0-9a-f]{6}$/i.test(s.couleur || "") ? s.couleur : "#4F46E5";
  const app = pub.domaine ? `https://${pub.domaine}/` : `${SITE}/#/app/${slug}`;
  const canon = `${SITE}/p/${slug}`;
  const titre = `${s.nom} — ${s.slogan || s.cible_courte || "logiciel en ligne"}`.slice(0, 70);
  const desc = String(s.pitch || "").slice(0, 160);
  const ecrans = (s.ecrans || []).filter((e) => !e.public);
  const formules = (s.formules || []).filter((f) => f && f.nom);
  const faq = (s.faq || []).filter((x) => x && x.q && x.r);
  const ld = [
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: s.nom, description: s.pitch || "", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: app, inLanguage: "fr",
      ...(formules.length ? { offers: formules.map((f) => ({ "@type": "Offer", name: f.nom, price: Number(f.prix) || 0, priceCurrency: "EUR" })) } : {}) },
    ...(faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.r } })) }] : []),
  ];
  const btn = (t, big) => `<a class="b${big ? " g" : ""}" href="${app}">${esc(t)}</a>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titre)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canon}">
<meta property="og:title" content="${esc(titre)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${canon}">${pub.icone ? `<link rel="icon" href="${esc(pub.icone)}">` : ""}
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>*{box-sizing:border-box}body{margin:0;background:#F8FAFC;color:#0F172A;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.6}
.w{max-width:980px;margin:0 auto;padding:20px 18px 60px}header{display:flex;justify-content:space-between;align-items:center;gap:12px}.m{display:flex;gap:9px;align-items:center;font-weight:800;font-size:18px;color:inherit;text-decoration:none}
.l{width:32px;height:32px;border-radius:10px;background:${c};color:#fff;display:grid;place-items:center}a.b{display:inline-block;background:${c};color:#fff;text-decoration:none;font-weight:700;border-radius:12px;padding:10px 16px;font-size:14px}a.g{padding:14px 22px;font-size:16px}
.hero{padding:56px 0 30px}.tag{display:inline-block;background:${c}14;color:${c};font-weight:600;font-size:13px;border-radius:99px;padding:5px 12px}h1{font-size:clamp(32px,6vw,52px);line-height:1.08;letter-spacing:-.025em;margin:14px 0}
.p{font-size:19px;color:#475569;max-width:720px}h2{font-size:28px;letter-spacing:-.02em;margin:54px 0 16px}.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.c{background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:20px}.c h3{margin:0 0 6px;font-size:17px}.c p{margin:0;color:#475569}.prix{font-size:30px;font-weight:800;margin:6px 0}ul{padding-left:18px;margin:10px 0 0;color:#475569}
details{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:14px 18px;margin:8px 0}summary{font-weight:700;cursor:pointer}.s{color:#94A3B8;font-size:13px;margin-top:10px}
footer{margin-top:56px;color:#94A3B8;font-size:13px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}footer a{color:#64748B}</style></head><body><div class="w">
<header><a class="m" href="${app}"><span class="l">${esc(String(s.nom || "S")[0])}</span>${esc(s.nom)}</a>${btn("Essai gratuit")}</header>
<section class="hero">${s.cible_courte ? `<span class="tag">${esc(s.cible_courte)}</span>` : ""}<h1>${esc(s.slogan || s.nom)}</h1><p class="p">${esc(s.pitch)}</p>
<p style="margin-top:26px">${btn("Essayer gratuitement", true)} &nbsp; <a href="${app}" style="color:${c};font-weight:600">Voir la démo en 30 s →</a></p>
<div class="s">Sans carte bancaire${pub.paiement?.essai_jours ? ` · ${pub.paiement.essai_jours} jours d'essai` : ""}</div></section>
${s.probleme ? `<h2>Le problème</h2><p class="p">${esc(typeof s.probleme === "string" ? s.probleme : s.probleme.texte || "")}</p>` : ""}
${(s.atouts || []).length ? `<h2>Pourquoi ${esc(s.nom)}</h2><div class="grid">${s.atouts.map((a) => `<div class="c"><h3>${esc(a.titre)}</h3><p>${esc(a.texte)}</p></div>`).join("")}</div>` : ""}
${ecrans.length ? `<h2>Ce que vous trouvez dedans</h2><div class="grid">${ecrans.map((e) => `<div class="c"><h3>${esc(e.titre)}</h3><p>${esc(e.but || "")}</p></div>`).join("")}</div>` : ""}
${formules.length ? `<h2>Tarifs</h2><div class="grid">${formules.map((f) => `<div class="c"><h3>${esc(f.nom)}</h3><div class="prix">${esc(prix(f.prix))}</div><p>${esc(f.pour || "")}</p>${(f.inclus || []).length ? `<ul>${f.inclus.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}</div>`).join("")}</div>` : ""}
${faq.length ? `<h2>Questions fréquentes</h2>${faq.map((x) => `<details><summary>${esc(x.q)}</summary><p>${esc(x.r)}</p></details>`).join("")}` : ""}
${(pub.articles || []).length ? `<h2>Guides</h2><div class="grid">${pub.articles.slice(0, 6).map((a) => `<a class="c" style="text-decoration:none;color:inherit" href="${SITE}/a/${slug}/${esc(a.slug)}"><h3>${esc(a.titre)}</h3><p>${esc(a.resume || "")}</p></a>`).join("")}</div>` : ""}
<div class="c" style="margin-top:50px;text-align:center"><h3 style="font-size:22px">Prêt à essayer ${esc(s.nom)} ?</h3><p style="margin:6px 0 16px">${esc(s.pitch)}</p>${btn("Commencer gratuitement", true)}</div>
<footer><span>© ${new Date().getFullYear()} ${esc(s.nom)}</span>${(pub.articles || []).length ? `<a href="${SITE}/a/${slug}">Blog</a>` : ""}</footer></div></body></html>`;
}

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, SITE);
    if (u.searchParams.get("sitemap")) {
      const apps = await rpc("saas_apps_plan_du_site", {});
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      const url = (loc, d) => `<url><loc>${esc(loc)}</loc>${d ? `<lastmod>${String(d).slice(0, 10)}</lastmod>` : ""}</url>`;
      return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${apps.map((a) => url(`${SITE}/p/${a.slug}`, a.maj) + (a.articles || []).map((x) => url(`${SITE}/a/${a.slug}/${x}`)).join("")).join("")}</urlset>`);
    }
    const slug = String(u.searchParams.get("app") || "").replace(/[^a-z0-9-]/g, "");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const pub = slug ? await rpc("saas_app_public", { p_slug: slug }) : null;
    if (!pub || pub.suspendu || !(pub.spec?.ecrans || []).length) { res.statusCode = 404; return res.end("Introuvable"); }
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.end(rendu(pub));
  } catch (e) {
    res.statusCode = 500;
    return res.end("Erreur");
  }
}
