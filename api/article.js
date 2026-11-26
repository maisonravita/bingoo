// Articles du kit de lancement d'un SaaS construit par Bingoo! : pages HTML rendues côté serveur, lisibles par Google.
// kairo.maisonravita.fr/a/<app>/<article> ; sur le domaine de l'app : /blog/<article> (et /blog pour la liste).
const URL_ = process.env.VITE_SUPABASE_URL || "https://fbsjbnnmzazylmquzryo.supabase.co";
const KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic2pibm5temF6eWxtcXV6cnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3MTcsImV4cCI6MjEwODc3ODcxN30.Kd497ZtRT__Ovy-tIMt47iJkpGbRc30NlpPQWqORGH0";
const SITE = "https://www.bingoo.fr";
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

// Le blog prend l'allure du site : couleurs et polices de son système de design, son logo, sa photo d'en-tête
const hex = (x, d) => (/^#[0-9a-f]{6}$/i.test(x || "") ? x : d);
const policeOk = (p) => (typeof p === "string" && /^[A-Za-z0-9 ]{2,40}$/.test(p) ? p : null);
function page(app, titre, description, canon, corps, o = {}) {
  const dc = app.design?.couleurs ?? {}, dp = app.design?.polices ?? {};
  const c = hex(dc.primary, hex(app.couleur, "#4F46E5")), surC = hex(dc.on_primary, "#FFFFFF");
  const fond = hex(dc.background, "#FAFAF7"), encre = hex(dc.foreground, "#14161B"), doux = hex(dc.muted_foreground, "#5B6270"), carte = hex(dc.card, "#FFFFFF");
  const ligne = hex(dc.border, "#E6E4DE");
  const fTitres = policeOk(dp.titres) || "Fraunces";
  // Le texte long se lit dans une police de lecture : une police d'affiche (Playfair, Bebas…) passe la main à Inter
  const fTexte = policeOk(dp.texte) && !/display|bebas|oswald|anton|playfair|abril|serif display/i.test(dp.texte) ? dp.texte : "Inter";
  const polices = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fTitres)}:wght@500;600;700&family=${encodeURIComponent(fTexte)}:wght@400;600;700&display=swap`;
  const accueil = app.domaine ? `https://${app.domaine}/` : `${SITE}/#/app/${app.slug}`;
  const site = app.type === "site", bouton = site ? (app.cta || app.site?.cta || "Me contacter") : "Essai gratuit", bouton2 = site ? bouton : "Essayer gratuitement";
  const logo = /^https:\/\//.test(app.logo || "") ? `<img src="${esc(app.logo)}" alt="" style="height:30px;width:auto">` : `<span class="l">${esc(String(app.nom || "S")[0])}</span>`;
  const ld = o.ld, image = /^https:\/\//.test(o.image || "") ? o.image : null;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titre)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canon}">
<meta property="og:title" content="${esc(titre)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="article">${image ? `<meta property="og:image" content="${esc(image)}">` : ""}
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${polices}">
<style>*{box-sizing:border-box}body{margin:0;background:${fond};color:${encre};font-family:"${fTexte}",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.7;-webkit-font-smoothing:antialiased}
.tete{position:sticky;top:0;z-index:5;background:color-mix(in srgb,${fond} 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid ${ligne}}
.tete .in{max-width:1080px;margin:0 auto;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:16px}
.tete a.m{text-decoration:none;color:inherit;font-family:"${fTitres}",serif;font-weight:600;font-size:20px;display:flex;gap:10px;align-items:center;letter-spacing:-.01em}
.l{width:30px;height:30px;border-radius:9px;background:${c};color:${surC};display:grid;place-items:center;font-size:15px}
a.b{display:inline-block;background:${c};color:${surC};text-decoration:none;font-weight:600;border-radius:999px;padding:12px 20px}
.w{max-width:720px;margin:0 auto;padding:0 20px 72px}
.sur{margin:56px 0 0;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${c};font-weight:600}
h1{font-family:"${fTitres}",serif;font-weight:600;font-size:clamp(34px,5.4vw,56px);line-height:1.06;letter-spacing:-.025em;margin:14px 0 18px;text-wrap:balance}
.chapo{font-size:20px;line-height:1.55;color:${doux};margin:0 0 26px}
.meta{display:flex;gap:14px;align-items:center;font-size:14px;color:${doux};padding-bottom:26px;border-bottom:1px solid ${ligne}}
.cover{max-width:1080px;margin:34px auto 0;padding:0 20px}.cover img{width:100%;aspect-ratio:21/9;object-fit:cover;border-radius:22px;display:block}
.corps{margin-top:30px}.corps>p:first-of-type::first-letter{font-family:"${fTitres}",serif;float:left;font-size:64px;line-height:.9;padding:6px 10px 0 0;color:${c}}
h2{font-family:"${fTitres}",serif;font-weight:600;font-size:clamp(24px,3vw,30px);line-height:1.2;letter-spacing:-.015em;margin:44px 0 10px}
h3{font-family:"${fTitres}",serif;font-size:21px;margin:28px 0 6px}p,li{font-size:18px}ul{padding-left:22px}li{margin:6px 0}li::marker{color:${c}}b{font-weight:700}
.r{color:${doux}}
.cta{margin-top:56px;background:${c};color:${surC};border-radius:24px;padding:30px 30px 32px}.cta h2{margin:0 0 6px;color:${surC}}.cta p{margin:0 0 20px;opacity:.88}.cta a.b{background:${surC};color:${c}}
.art{display:block;background:${carte};border:1px solid ${ligne};border-radius:18px;padding:22px 24px;margin:14px 0;text-decoration:none;color:inherit;transition:transform .2s}.art:hover{transform:translateY(-2px)}.art b{font-family:"${fTitres}",serif;font-size:22px;font-weight:600;display:block;margin-bottom:4px}
footer{max-width:720px;margin:0 auto;padding:0 20px 40px;color:${doux};font-size:13px}</style></head><body>
<header class="tete"><div class="in"><a class="m" href="${accueil}">${logo}${esc(app.nom)}</a><a class="b" href="${accueil}" style="font-size:14px;padding:10px 16px">${esc(bouton)}</a></div></header>
${o.avant ?? ""}<main class="w">${corps}
<section class="cta"><h2>${esc(app.nom)}</h2><p>${esc(app.pitch)}</p><a class="b" href="${accueil}">${esc(bouton2)}</a></section></main>
<footer>© ${new Date().getFullYear()} ${esc(app.nom)}</footer></body></html>`;
}

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, SITE);
    const host = String(req.headers.host || "").replace(/^www\./, "").toLowerCase();
    // Les adresses de Bingoo! (bingoo.fr compris) ne sont pas le domaine d'un client (avant : tous les articles en 404 sur bingoo.fr)
    const surDomaine = !/(^|\.)(bingoo\.fr|maisonravita\.fr|vercel\.app)$|^localhost$|^127\./.test(host);
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
      const corps = `<p class="sur">Le blog</p><h1>${esc(app.nom)}</h1><p class="chapo">${esc(app.pitch)}</p>${(pub.articles || []).map((a) => `<a class="art" href="${base(a.slug)}"><b>${esc(a.titre)}</b><div class="r">${esc(a.resume)}</div></a>`).join("") || "<p>Aucun article pour l'instant.</p>"}`;
      const img = app.site?.page?.images?.PHOTO_1?.url || app.site?.page?.images?.IMG_1?.url;
      return res.end(page(app, `Blog · ${app.nom}`, app.pitch || "", surDomaine ? `https://${host}/blog` : `${SITE}/a/${appCle}`, corps, { image: img }));
    }
    const d = await rpc("saas_app_article", { p_slug: appCle, p_article: art });
    if (!d) { res.statusCode = 404; return res.end("Article introuvable"); }
    const a = d.article, app = d.app;
    const canon = app.domaine ? `https://${app.domaine}/blog/${a.slug}` : `${SITE}/a/${app.slug}/${a.slug}`;
    const mots = String(a.contenu ?? "").split(/\s+/).length, date = a.at ? new Date(a.at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
    const corps = `<p class="sur">Le blog de ${esc(app.nom)}</p><h1>${esc(a.titre)}</h1><p class="chapo">${esc(a.resume)}</p><div class="meta">${date ? `<span>${esc(date)}</span><span>·</span>` : ""}<span>${Math.max(1, Math.round(mots / 220))} min de lecture</span></div>`;
    const avantCorps = /^https:\/\//.test(app.image || "") ? `<div class="cover"><img src="${esc(app.image)}" alt=""></div>` : "";
    const ld = { "@context": "https://schema.org", "@type": "Article", headline: a.titre, description: a.resume || "", datePublished: a.at || undefined, mainEntityOfPage: canon, publisher: { "@type": "Organization", name: app.nom }, keywords: (a.mots_cles || []).join(", ") };
    // Avec une photo : le titre, puis la photo pleine largeur, puis le texte ; sans photo : tout dans la colonne de lecture
    const html = avantCorps
      ? page(app, a.titre, a.resume || "", canon, `<div class="corps">${md(a.contenu)}</div>`, { ld, image: app.image, avant: `<div class="w" style="padding-bottom:0">${corps}</div>${avantCorps}` })
      : page(app, a.titre, a.resume || "", canon, `${corps}<div class="corps">${md(a.contenu)}</div>`, { ld });
    return res.end(html);
  } catch (e) {
    res.statusCode = 500;
    return res.end("Erreur");
  }
}
