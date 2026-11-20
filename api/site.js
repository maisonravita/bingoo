// La page d'accueil d'un site ou d'un SaaS construit par Bingoo!, avec ses propres balises pour Google et pour les aperçus
// de partage (WhatsApp, LinkedIn, Facebook, iMessage) : titre, description, image, adresse canonique, et pour un site
// la fiche de l'établissement (schema.org : zone, téléphone, horaires, services et prix).
// - Sur le domaine du membre : « / » arrive ici (middleware.js), puis l'application s'ouvre comme d'habitude.
// - Sans domaine : www.bingoo.fr/s/<app> (le lien à partager), qui ouvre ensuite l'application en #/app/<app>.
// Le reste de la page est celui de Bingoo! (index.html) : seules les balises de <head> changent.
const URL_ = process.env.VITE_SUPABASE_URL || "https://fbsjbnnmzazylmquzryo.supabase.co";
const KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZic2pibm5temF6eWxtcXV6cnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3MTcsImV4cCI6MjEwODc3ODcxN30.Kd497ZtRT__Ovy-tIMt47iJkpGbRc30NlpPQWqORGH0";
const SITE = "https://www.bingoo.fr";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const JOURS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function rpc(fn, body) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`base ${r.status}`);
  return r.json();
}

/** Les balises de <head> d'une app (site ou SaaS). */
export function balises(pub, infos, url) {
  const s = pub.spec || {}, site = s.type === "site", st = s.site || {};
  const lieu = st.ville ? ` à ${st.ville}` : "";
  const titre = (site ? `${s.nom} · ${st.metier || ""}${lieu}` : `${s.nom} · ${s.slogan || s.cible_courte || "logiciel en ligne"}`).replace(/\s+·\s*$/, "").slice(0, 70);
  const desc = String(s.pitch || s.slogan || "").replace(/\s+/g, " ").slice(0, 158);
  const image = pub.icone || "";
  const services = (infos?.services || []).filter((x) => x && x.titre);
  const h = (infos?.horaires || []).filter((x) => x && x.ouvert && JOURS[Number(x.jour)]);
  const i = infos?.infos || {};
  const ld = site
    ? { "@context": "https://schema.org", "@type": "LocalBusiness", name: s.nom, description: s.pitch || "", url, ...(image ? { image } : {}),
      ...(i.telephone ? { telephone: i.telephone } : {}), ...(i.email ? { email: i.email } : {}), ...(i.adresse ? { address: i.adresse } : {}),
      ...(i.zone || st.ville ? { areaServed: i.zone || st.ville } : {}),
      ...(h.length ? { openingHoursSpecification: h.map((x) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: JOURS[Number(x.jour)], opens: x.debut, closes: x.fin })) } : {}),
      ...(services.length ? { makesOffer: services.slice(0, 20).map((x) => ({ "@type": "Offer", name: x.titre, ...(x.description ? { description: x.description } : {}), ...(Number(x.prix) > 0 ? { price: Number(x.prix), priceCurrency: "EUR" } : {}) })) } : {}),
      ...((i.instagram || i.facebook) ? { sameAs: [i.instagram, i.facebook].filter((x) => /^https?:\/\//.test(x || "")) } : {}) }
    : { "@context": "https://schema.org", "@type": "SoftwareApplication", name: s.nom, description: s.pitch || "", applicationCategory: "BusinessApplication", operatingSystem: "Web", url, inLanguage: "fr" };
  return [
    `<title>${esc(titre)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="website">`, `<meta property="og:locale" content="fr_FR">`, `<meta property="og:site_name" content="${esc(s.nom)}">`,
    `<meta property="og:title" content="${esc(titre)}">`, `<meta property="og:description" content="${esc(desc)}">`, `<meta property="og:url" content="${esc(url)}">`,
    ...(image ? [`<meta property="og:image" content="${esc(image)}">`, `<link rel="icon" href="${esc(image)}">`, `<link rel="apple-touch-icon" href="${esc(image)}">`] : []),
    `<meta name="twitter:card" content="summary">`, `<meta name="twitter:title" content="${esc(titre)}">`, `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="theme-color" content="${/^#[0-9a-f]{6}$/i.test(s.couleur || "") ? s.couleur : "#4F46E5"}">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].join("\n");
}

/** index.html de Bingoo! sans ses propres titre, description et balises de partage, avec celles de l'app à la place. */
export function injecter(index, tete, avant = "") {
  const propre = index
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+(name|property)="(description|og:[^"]+|twitter:[^"]+|theme-color)"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");
  // Juste après <meta charset> (qui doit rester en tête), sinon juste après <head>
  return /<meta\s+charset[^>]*>/i.test(propre) ? propre.replace(/(<meta\s+charset[^>]*>)/i, `$1\n${avant}${tete}\n`) : propre.replace(/<head>/i, `<head>\n${avant}${tete}\n`);
}

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, SITE);
    const host = String(u.searchParams.get("host") || "").toLowerCase().replace(/[^a-z0-9.-]/g, "");
    const slug = String(u.searchParams.get("slug") || "").replace(/[^a-z0-9-]/g, "");
    const pub = host ? await rpc("saas_app_par_domaine", { p_domaine: host }) : slug ? await rpc("saas_app_public", { p_slug: slug }) : null;
    const index = await fetch(`${SITE}/index.html`).then((r) => r.text());
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (!pub || pub.suspendu || !(pub.spec?.ecrans || []).length) { res.setHeader("Cache-Control", "no-store"); return res.end(index); }
    const app = pub.slug;
    const url = host ? `https://${host}/` : `${SITE}/s/${app}`;
    // Le contenu vivant d'un site (services, horaires, coordonnées) : celui que le gérant a saisi
    const infos = pub.spec?.type === "site" ? await fetch(`${URL_}/functions/v1/t/app/${app}/site-info`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
    // Sans domaine : le lien partagé ouvre ensuite l'application elle-même
    const avant = host ? "" : `<script>if(!location.hash||location.hash==="#/")history.replaceState(null,"","/#/app/${app}");</script>\n`;
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");
    return res.end(injecter(index, balises(pub, infos, url), avant));
  } catch (e) {
    res.statusCode = 500;
    return res.end("Erreur");
  }
}
