// Articles du kit de lancement d'un SaaS construit par Bingoo! : pages HTML rendues côté serveur, lisibles par Google.
// kairo.maisonravita.fr/a/<app>/<article> ; sur le domaine de l'app : /blog/<article> (et /blog pour la liste).
const URL_ = process.env.VITE_SUPABASE_URL || "https://fbsjbnnmzazylmquzryo.supabase.co";
const KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic2pibm5temF6eWxtcXV6cnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3MTcsImV4cCI6MjEwODc3ODcxN30.Kd497ZtRT__Ovy-tIMt47iJkpGbRc30NlpPQWqORGH0";
const SITE = "https://kairo.maisonravita.fr";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
async function rpc(fn, body) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`base ${r.status}`);
  return r.json();
}
// Markdown simple : titres, listes, gras, paragraphes (le texte est échappé avant)
function md(t) {
  const out = []; let liste = false;
  for (const brut of String(t ?? "").split(/\n/)) {
    const l = esc(brut.trim()).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    if (/^-\s+/.test(l)) { if (!liste) { out.push("<ul>"); liste = true; } out.push(`<li>${l.replace(/^-\s+/, "")}</li>`); continue; }
    if (liste) { out.push("</ul>"); liste = false; }
    if (!l) continue;
    if (/^###\s+/.test(l)) out.push(`<h3>${l.replace(/^###\s+/, "")}</h3>`);
    else if (/^##?\s+/.test(l)) out.push(`<h2>${l.replace(/^##?\s+/, "")}</h2>`);
    else out.push(`<p>${l}</p>`);
  }
  if (liste) out.push("</ul>");
  return out.join("\n");
}

function page(app, titre, description, canon, corps, ld = null) {
  const c = /^#[0-9a-f]{6}$/i.test(app.couleur || "") ? app.couleur : "#4F46E5";
  const accueil = app.domaine ? `https://${app.domaine}/` : `${SITE}/#/app/${app.slug}`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titre)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canon}">
<meta property="og:title" content="${esc(titre)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="article">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}
<style>*{box-sizing:border-box}body{margin:0;background:#F8FAFC;color:#0F172A;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.65}
.w{max-width:760px;margin:0 auto;padding:24px 16px 64px}header{display:flex;justify-content:space-between;align-items:center}header a{text-decoration:none;color:inherit;font-weight:800;font-size:18px;display:flex;gap:8px;align-items:center}
.l{width:30px;height:30px;border-radius:9px;background:${c};color:#fff;display:grid;place-items:center}h1{font-size:clamp(28px,5vw,40px);line-height:1.1;letter-spacing:-.02em;margin:36px 0 10px}
h2{font-size:22px;margin:30px 0 8px}h3{font-size:18px;margin:22px 0 6px}p,li{font-size:17px}.r{color:#64748B}a.b{display:inline-block;background:${c};color:#fff;text-decoration:none;font-weight:700;border-radius:12px;padding:12px 18px}
.cta{margin-top:36px;background:#fff;border:1px solid #E2E8F0;border-radius:18px;padding:22px}.art{display:block;background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:16px;margin:10px 0;text-decoration:none;color:inherit}
footer{margin-top:40px;color:#94A3B8;font-size:13px}</style></head><body><div class="w">
<header><a href="${accueil}"><span class="l">${esc(String(app.nom || "S")[0])}</span>${esc(app.nom)}</a><a class="b" href="${accueil}" style="font-size:14px;padding:9px 14px">Essai gratuit</a></header>
${corps}
<div class="cta"><b>${esc(app.nom)}</b><p class="r" style="margin:4px 0 14px">${esc(app.pitch)}</p><a class="b" href="${accueil}">Essayer gratuitement</a></div>
<footer>© ${new Date().getFullYear()} ${esc(app.nom)}</footer></div></body></html>`;
}

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, SITE);
    const host = String(req.headers.host || "").replace(/^www\./, "").toLowerCase();
    const surDomaine = !/maisonravita\.fr$|vercel\.app$|localhost/.test(host);
    const appCle = surDomaine ? host : String(u.searchParams.get("app") || "").replace(/[^a-z0-9-]/g, "");
    const art = String(u.searchParams.get("a") || "").replace(/[^a-z0-9-]/g, "");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (!appCle) { res.statusCode = 404; return res.end("Introuvable"); }
    const base = (slug) => surDomaine ? `https://${host}/blog/${slug}` : `${SITE}/a/${appCle}/${slug}`;
    if (!art) {
      // Liste des articles de l'application
      const pub = surDomaine ? await rpc("saas_app_par_domaine", { p_domaine: host }) : await rpc("saas_app_public", { p_slug: appCle });
      if (!pub) { res.statusCode = 404; return res.end("Introuvable"); }
      const app = { ...pub.spec, slug: pub.slug, domaine: pub.domaine };
      const corps = `<h1>Le blog de ${esc(app.nom)}</h1><p class="r">${esc(app.pitch)}</p>${(pub.articles || []).map((a) => `<a class="art" href="${base(a.slug)}"><b>${esc(a.titre)}</b><div class="r">${esc(a.resume)}</div></a>`).join("") || "<p>Aucun article pour l'instant.</p>"}`;
      return res.end(page(app, `Blog · ${app.nom}`, app.pitch || "", surDomaine ? `https://${host}/blog` : `${SITE}/a/${appCle}`, corps));
    }
    const d = await rpc("saas_app_article", { p_slug: appCle, p_article: art });
    if (!d) { res.statusCode = 404; return res.end("Article introuvable"); }
    const a = d.article, app = d.app;
    const canon = app.domaine ? `https://${app.domaine}/blog/${a.slug}` : `${SITE}/a/${app.slug}/${a.slug}`;
    const corps = `<h1>${esc(a.titre)}</h1><p class="r">${esc(a.resume)}</p>${md(a.contenu)}`;
    const ld = { "@context": "https://schema.org", "@type": "Article", headline: a.titre, description: a.resume || "", datePublished: a.at || undefined, mainEntityOfPage: canon, publisher: { "@type": "Organization", name: app.nom }, keywords: (a.mots_cles || []).join(", ") };
    return res.end(page(app, a.titre, a.resume || "", canon, corps, ld));
  } catch (e) {
    res.statusCode = 500;
    return res.end("Erreur");
  }
}
