// Pages publiques Explorer (référencement Google) : /saas (catégories), /saas/<domaine> (fiche), /sitemap-saas.xml.
// Rendu côté serveur sur Vercel à partir de la vue publique saas_public (informations lues sur les sites des logiciels).
const URL_ = process.env.VITE_SUPABASE_URL || "https://fbsjbnnmzazylmquzryo.supabase.co";
const KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic2pibm5temF6eWxtcXV6cnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3MTcsImV4cCI6MjEwODc3ODcxN30.Kd497ZtRT__Ovy-tIMt47iJkpGbRc30NlpPQWqORGH0";
const SITE = "https://kairo.maisonravita.fr";
const PAYS = { FR: "France", BE: "Belgique", CH: "Suisse", DE: "Allemagne", ES: "Espagne", IT: "Italie", GB: "Royaume-Uni", NL: "Pays-Bas", US: "États-Unis", CA: "Canada", IE: "Irlande", PT: "Portugal", SE: "Suède", PL: "Pologne", AT: "Autriche", DK: "Danemark" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const slugCat = (c) => String(c).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
async function rest(path) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`base ${r.status}`);
  return r.json();
}
const date = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
const prix = (s) => s.prix_entree_eur != null ? `dès ${s.prix_entree_eur} € par mois` : s.sur_devis ? "sur devis" : "non affiché";

function page({ titre, description, canon, corps, jsonld }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titre)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canon}">
<meta property="og:title" content="${esc(titre)}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="${SITE}/og.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : ""}
<style>:root{--ink:#15161A;--soft:#5B5D66;--faint:#9A9CA5;--line:#E6E2D8;--paper:#F6F4EF;--accent:#E0531F}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:'Plus Jakarta Sans',system-ui,sans-serif;line-height:1.5}
a{color:inherit}.w{max-width:960px;margin:0 auto;padding:24px 16px 64px}header{display:flex;justify-content:space-between;align-items:center}header a.logo{font-weight:800;font-size:22px;text-decoration:none}
h1{font-size:clamp(28px,5vw,42px);line-height:1.05;letter-spacing:-.02em;margin:28px 0 8px}.lead{color:var(--soft);font-size:17px;max-width:720px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:20px}
.c{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px}.c small{color:var(--faint);font-size:12.5px;display:block}.c b{font-size:19px}h2{font-size:20px;margin:32px 0 10px}
ul.l{list-style:none;padding:0;margin:0;background:#fff;border:1px solid var(--line);border-radius:16px}ul.l li{padding:12px 16px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:12px}ul.l li:first-child{border-top:0}
.cta{margin-top:28px;background:var(--ink);color:#fff;border-radius:18px;padding:22px;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center}.cta a{background:var(--accent);color:#fff;text-decoration:none;font-weight:700;border-radius:12px;padding:12px 18px}
.n{color:var(--faint);font-size:12.5px;margin-top:20px}.tag{display:inline-block;background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;margin:4px 6px 0 0;text-decoration:none;font-size:14px}</style></head>
<body><div class="w"><header><a class="logo" href="${SITE}/#/accueil">Bingoo!</a><a href="${SITE}/saas">Tous les SaaS</a></header>${corps}
<div class="cta"><div><b>Suis ce marché chaque semaine.</b><div style="opacity:.75">Prix, recrutements, nouveautés et concurrents, avec Bingoo! Explorer.</div></div><a href="${SITE}/#/marche">Voir mon marché gratuitement</a></div>
<p class="n">Informations lues sur les sites des éditeurs. Vous éditez ce logiciel et souhaitez une correction ou un retrait ? <a href="mailto:bingoo@maisonravita.fr?subject=Explorer">Écrivez-nous</a>.</p></div></body></html>`;
}

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, SITE);
    const d = String(u.searchParams.get("d") || "").toLowerCase().replace(/[^a-z0-9.-]/g, "");
    const cat = String(u.searchParams.get("c") || "");
    res.setHeader("Cache-Control", "public, s-maxage=43200, stale-while-revalidate=86400");
    if (u.searchParams.get("sitemap")) {
      const rows = await rest("saas_public?select=domaine,lu_at&limit=20000");
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/saas</loc></url>${rows.map((r) => `<url><loc>${SITE}/saas/${esc(r.domaine)}</loc>${r.lu_at ? `<lastmod>${r.lu_at.slice(0, 10)}</lastmod>` : ""}</url>`).join("")}</urlset>`);
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (!d) {
      const rows = await rest("saas_public?select=domaine,nom,categorie&order=nom&limit=20000");
      const parCat = new Map(); for (const r of rows) parCat.set(r.categorie, [...(parCat.get(r.categorie) ?? []), r]);
      const liste = cat ? [...parCat.entries()].filter(([c]) => slugCat(c) === cat) : [...parCat.entries()].sort((a, b) => b[1].length - a[1].length);
      const corps = `<h1>${cat && liste[0] ? `Logiciels SaaS : ${esc(liste[0][0])}` : "Tous les logiciels SaaS suivis par Bingoo!"}</h1><p class="lead">${rows.length.toLocaleString("fr-FR")} logiciels, leurs prix, leurs formules et leurs recrutements, relus chaque semaine sur leurs propres sites.</p>
${cat ? "" : `<div>${[...parCat.keys()].map((c) => `<a class="tag" href="${SITE}/saas?c=${slugCat(c)}">${esc(c)} (${parCat.get(c).length})</a>`).join("")}</div>`}
${liste.map(([c, l]) => `<h2>${esc(c)}</h2><ul class="l">${l.slice(0, cat ? 2000 : 12).map((s) => `<li><a href="${SITE}/saas/${esc(s.domaine)}">${esc(s.nom)}</a><span style="color:var(--faint)">${esc(s.domaine)}</span></li>`).join("")}</ul>${!cat && l.length > 12 ? `<p><a href="${SITE}/saas?c=${slugCat(c)}">Voir les ${l.length} logiciels ${esc(c)}</a></p>` : ""}`).join("")}`;
      return res.end(page({ titre: cat && liste[0] ? `${liste[0][0]} : les logiciels SaaS, leurs prix et formules | Bingoo!` : "Tous les logiciels SaaS : prix, formules, recrutements | Bingoo!", description: "Les prix, formules, essais gratuits et recrutements des logiciels SaaS, relus chaque semaine sur leurs sites.", canon: `${SITE}/saas${cat ? `?c=${cat}` : ""}`, corps }));
    }
    const [s] = await rest(`saas_public?select=*&domaine=eq.${encodeURIComponent(d)}&limit=1`);
    if (!s) { res.statusCode = 404; return res.end(page({ titre: "Logiciel introuvable | Bingoo!", description: "Ce logiciel n'est pas dans la base.", canon: `${SITE}/saas`, corps: `<h1>Ce logiciel n'est pas encore suivi.</h1><p class="lead"><a href="${SITE}/saas">Voir tous les SaaS</a></p>` })); }
    const alt = await rest(`saas_public?select=domaine,nom,prix_entree_eur,sur_devis,gratuit,pays&categorie=eq.${encodeURIComponent(s.categorie)}&domaine=neq.${encodeURIComponent(d)}&order=postes.desc.nullslast&limit=8`);
    const annee = new Date().getFullYear();
    const corps = `<h1>${esc(s.nom)} : prix, formules et alternatives</h1><p class="lead">${esc(s.description)}${s.cible ? ` Pour ${esc(s.cible.charAt(0).toLowerCase() + s.cible.slice(1))}` : ""}</p>
<div class="g"><div class="c"><small>Prix d'entrée</small><b>${esc(prix(s))}</b>${s.lien_prix ? `<small><a href="${esc(s.lien_prix)}" rel="nofollow noopener" target="_blank">page des tarifs</a></small>` : ""}</div>
<div class="c"><small>Version gratuite ou essai</small><b>${s.gratuit ? "Version gratuite" : s.essai ? (/\d/.test(s.essai) ? `Essai ${esc(s.essai)}` : "Essai gratuit") : "Non"}</b></div>
<div class="c"><small>Recrute</small><b>${s.recrute ? `Oui${s.postes ? ` · ${s.postes} postes` : ""}` : "Pas d'offre lue"}</b></div>
<div class="c"><small>Dernière nouveauté publiée</small><b>${s.nouveaute ? date(s.nouveaute) : "Non trouvée"}</b></div></div>
${(s.formules ?? []).length ? `<h2>Les formules de ${esc(s.nom)}</h2><ul class="l">${s.formules.map((f) => `<li><span>${esc(f.nom)}</span><b>${esc(f.prix)}</b></li>`).join("")}</ul>` : ""}
<h2>Fiche</h2><ul class="l"><li><span>Catégorie</span><a href="${SITE}/saas?c=${slugCat(s.categorie)}">${esc(s.categorie)}</a></li>${s.pays ? `<li><span>Pays</span><span>${esc(PAYS[s.pays] ?? s.pays)}</span></li>` : ""}<li><span>Site</span><a href="https://${esc(s.domaine)}" rel="nofollow noopener" target="_blank">${esc(s.domaine)}</a></li><li><span>Relevé</span><span>${date(s.lu_at)}</span></li></ul>
${alt.length ? `<h2>Alternatives à ${esc(s.nom)} en ${annee}</h2><ul class="l">${alt.map((a) => `<li><a href="${SITE}/saas/${esc(a.domaine)}">${esc(a.nom)}</a><span>${esc(prix(a))}${a.gratuit ? " · gratuit" : ""}</span></li>`).join("")}</ul>` : ""}`;
    const jsonld = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: s.nom, applicationCategory: "BusinessApplication", operatingSystem: "Web", url: `https://${s.domaine}`, description: s.description, ...(s.prix_entree_eur != null ? { offers: { "@type": "Offer", price: String(s.prix_entree_eur), priceCurrency: "EUR" } } : {}) };
    return res.end(page({ titre: `${s.nom} : prix, formules et alternatives (${annee}) | Bingoo!`, description: `${s.nom} : ${prix(s)}${s.gratuit ? ", version gratuite" : s.essai ? ", essai gratuit" : ""}. Formules, recrutement et alternatives, relevés le ${date(s.lu_at)}.`, canon: `${SITE}/saas/${s.domaine}`, corps, jsonld }));
  } catch (e) {
    res.statusCode = 500; res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.end("Page indisponible pour l'instant.");
  }
}
