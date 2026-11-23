// Pages « Bingoo! contre … » : HTML statique (indexable par Google), écrit dans public/comparer/.
// Les chiffres des concurrents viennent de leurs pages tarifs ou de sources datées, cités en bas de page.
// Relancer : node scripts/comparer.mjs
import fs from "node:fs";

const MAJ = "23 novembre 2026";
const BINGOO = {
  prix: "Dès 9,99 € HT/mois (engagement 12 mois), 24,99 € au mois",
  commission: "Aucune : l'argent de tes clients arrive sur ton compte Stripe",
};
const PAGES = {
  wix: {
    nom: "Wix", titre: "Bingoo! ou Wix : lequel choisir pour lancer ton site ou ton SaaS ?",
    accroche: "Wix est un constructeur de sites par glisser-déposer : tu poses toi-même chaque bloc. Bingoo! part de ton idée en une phrase et construit le site ou le logiciel complet, testé, en ligne à ton nom.",
    lignes: [
      ["Point de départ", "Une phrase, ou l'adresse d'un site qui te plaît", "Un modèle à remplir bloc par bloc"],
      ["Qui construit", "Bingoo! écrit chaque page et chaque écran, puis les teste", "Toi, dans l'éditeur"],
      ["Logiciel en ligne (SaaS) avec comptes clients et abonnements", "Oui, c'est le cœur de Bingoo!", "Non : Wix fait des sites et des boutiques"],
      ["Idées de SaaS qui marchent déjà", "Plus de 100 000 SaaS et applis à explorer", "Non"],
      ["Modifications", "En une phrase dans l'atelier, ou au clic (texte, couleur, taille)", "À la main dans l'éditeur"],
      ["Prix", BINGOO.prix, "Forfaits Premium de 16,80 € à 178,80 € TTC/mois en annuel (Light, Essentiel, Business, Business Plus) [1]"],
      ["Frais sur les ventes", BINGOO.commission, "Wix Payments : 2,3 % + 0,30 € par transaction en UE [2]"],
      ["Vidéo pub animée", "Oui, motion design à tes couleurs", "Non inclus"],
    ],
    pourEux: "Wix reste un bon choix si tu veux tout placer toi-même au pixel près, ou si tu as besoin de son large catalogue d'extensions.",
    sources: [["[1] La Fabrique du Net, Prix Wix 2026 (grille relevée sur wix.com en juillet 2026)", "https://www.lafabriquedunet.fr/logiciels/tendances/prix-site-wix"], ["[2] Tooltester, Wix Tarifs 2026", "https://www.tooltester.com/fr/tests/wix/tarifs"]],
  },
  webflow: {
    nom: "Webflow", titre: "Bingoo! ou Webflow : lequel choisir sans savoir coder ?",
    accroche: "Webflow est un outil de design web très puissant, pensé pour les designers et les agences. Bingoo! s'adresse à ceux qui ne veulent ni designer ni coder : tu donnes ton idée, Bingoo! construit et met en ligne.",
    lignes: [
      ["Pour qui", "Entrepreneurs, indépendants, débutants", "Designers, agences, équipes marketing"],
      ["Prise en main", "Une phrase suffit pour commencer", "Courbe d'apprentissage (boîtes, classes, interactions)"],
      ["Logiciel en ligne (SaaS) avec comptes clients et abonnements", "Oui, prêt à encaisser", "Non : sites et CMS (des outils tiers sont nécessaires pour les espaces membres)"],
      ["Construction", "Écrite et testée par Bingoo!, écran par écran", "À la main dans le Designer"],
      ["Prix", BINGOO.prix, "Basic 15 $/mois en annuel (28 $ au mois), Premium 25 $/mois en annuel (39 $ au mois), depuis mai 2026 [1]"],
      ["Frais sur les ventes", BINGOO.commission, "Selon l'offre e-commerce choisie en plus"],
      ["Idées de SaaS qui marchent déjà", "Plus de 100 000 SaaS et applis à explorer", "Non"],
      ["Vidéo pub animée", "Oui, motion design à tes couleurs", "Non inclus"],
    ],
    pourEux: "Webflow reste imbattable si tu es designer et veux un contrôle total de chaque animation et de chaque classe CSS.",
    sources: [["[1] Ayko, Webflow plans & pricing changes (mai 2026)", "https://www.ayko.com/blog/webflow-plans-pricing-changes"], ["Aide Webflow : Updated pricing and simplified plans for May 2026", "https://help.webflow.com/hc/en-us/articles/51059955082387"]],
  },
  codunk: {
    nom: "Codunk", titre: "Bingoo! ou Codunk : quel constructeur de SaaS par IA choisir ?",
    accroche: "Codunk et Bingoo! construisent tous les deux un SaaS à partir de ton idée. La différence : Bingoo! part aussi de ce qui marche déjà (plus de 100 000 SaaS à explorer), teste chaque écran avant de dire « prêt », et ne prend aucune commission sur tes ventes.",
    lignes: [
      ["Point de départ", "Ton idée, un SaaS qui marche déjà, ou l'adresse d'un site qui te plaît", "Ton idée"],
      ["Idées de SaaS qui marchent déjà", "Plus de 100 000 SaaS et applis, avec leurs revenus", "Non"],
      ["Avant de construire", "Trois vrais rendus de ta page, tu choisis ton style", "Non annoncé sur leur site"],
      ["Vérification", "Un robot teste chaque écran comme un vrai utilisateur avant la mise en ligne", "Non annoncé sur leur site"],
      ["Prix", BINGOO.prix, "Solo 29 €, Builder 49 €, Pro 99 € HT/mois [1]"],
      ["Frais sur les ventes", BINGOO.commission, "5,7 %, 4,7 % ou 3,7 % par vente selon la formule [1]"],
      ["Connecteurs", "Google Analytics, Meta Pixel, Tag Manager, Calendly, Mailchimp", "18 connecteurs annoncés [2]"],
      ["Vidéo pub animée", "Oui, motion design à tes couleurs", "Non annoncé"],
    ],
    pourEux: "Codunk propose plus de connecteurs (18 annoncés) et des applis en nombre illimité dans chaque formule.",
    sources: [["[1] Codunk, page Tarifs (consultée le 23 novembre 2026)", "https://codunk.com/pricing"], ["[2] Codunk, page d'accueil (consultée le 23 novembre 2026)", "https://codunk.com/"]],
  },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const page = (k, p) => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.titre)} | Bingoo!</title>
<meta name="description" content="${esc(p.accroche.slice(0, 155))}">
<link rel="canonical" href="https://www.bingoo.fr/comparer/${k}/">
<meta property="og:title" content="${esc(p.titre)}"><meta property="og:image" content="https://www.bingoo.fr/og.jpg">
<link rel="icon" href="/icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;font-family:"Plus Jakarta Sans",system-ui,sans-serif;background:#FBFAF7;color:#1E2030;line-height:1.55}
a{color:inherit}.w{max-width:980px;margin:0 auto;padding:0 20px}
header{border-bottom:1px solid rgba(0,0,0,.07);background:#fff}header .w{display:flex;align-items:center;justify-content:space-between;height:68px}
.logo{font-weight:800;font-size:22px;text-decoration:none}.logo b{color:#E8571C}
.cta{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:#E8571C;color:#fff;padding:12px 20px;font-weight:700;text-decoration:none}
h1{font-size:clamp(30px,4.6vw,48px);line-height:1.1;letter-spacing:-.02em;margin:56px 0 16px}
.acc{font-size:19px;color:#3A3F55;max-width:720px}
table{width:100%;border-collapse:separate;border-spacing:0;margin:36px 0;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:18px;overflow:hidden}
th,td{padding:14px 16px;text-align:left;vertical-align:top;font-size:15px;border-bottom:1px solid rgba(0,0,0,.06)}
th{background:#F4F4F1;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#5B6075}
td:first-child{font-weight:600;width:26%}td.b{background:#FFF6F1}
tr:last-child td{border-bottom:0}
.box{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:22px 24px;margin:20px 0}
h2{font-size:24px;margin:44px 0 10px}.src{font-size:13px;color:#5B6075}.src a{color:#5B6075}
footer{margin-top:64px;border-top:1px solid rgba(0,0,0,.07);padding:28px 0;font-size:13px;color:#5B6075}
.autres a{margin-right:16px}
@media(max-width:640px){th,td{padding:10px;font-size:13.5px}td:first-child{width:30%}}
</style></head><body>
<header><div class="w"><a class="logo" href="https://www.bingoo.fr/">Bingoo<b>!</b></a><a class="cta" href="https://www.bingoo.fr/">Donner mon idée →</a></div></header>
<main class="w">
<h1>${esc(p.titre)}</h1>
<p class="acc">${esc(p.accroche)}</p>
<table><thead><tr><th></th><th>Bingoo!</th><th>${esc(p.nom)}</th></tr></thead><tbody>
${p.lignes.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td class="b">${esc(b)}</td><td>${esc(c)}</td></tr>`).join("\n")}
</tbody></table>
<div class="box"><b>Quand choisir ${esc(p.nom)} ?</b><p style="margin:6px 0 0">${esc(p.pourEux)}</p></div>
<div class="box"><b>Quand choisir Bingoo! ?</b><p style="margin:6px 0 0">Tu as une idée (ou pas encore) et tu veux un site, un SaaS ou une app en ligne à ton nom, sans coder ni designer, avec des clients qui peuvent payer dès le premier jour. Bingoo! construit, teste et met en ligne ; tu modifies ensuite en une phrase.</p>
<p style="margin:16px 0 0"><a class="cta" href="https://www.bingoo.fr/">Essayer Bingoo! avec mon idée →</a></p></div>
<h2>Sources</h2>
<p class="src">Comparaison mise à jour le ${MAJ}. Les prix et fonctions des autres outils changent : vérifie sur leur site avant de choisir.<br>${p.sources.map(([t, u]) => `<a href="${u}" rel="nofollow noopener" target="_blank">${esc(t)}</a>`).join("<br>")}</p>
<p class="autres src">Autres comparaisons : ${Object.entries(PAGES).filter(([x]) => x !== k).map(([x, q]) => `<a href="/comparer/${x}/">Bingoo! ou ${esc(q.nom)}</a>`).join("")}</p>
</main>
<footer><div class="w">© 2026 Bingoo! · <a href="https://www.bingoo.fr/">bingoo.fr</a></div></footer>
</body></html>`;

for (const [k, p] of Object.entries(PAGES)) { fs.mkdirSync(`public/comparer/${k}`, { recursive: true }); fs.writeFileSync(`public/comparer/${k}/index.html`, page(k, p)); }
fs.writeFileSync("public/sitemap-pages.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>https://www.bingoo.fr/</loc></url>\n${Object.keys(PAGES).map((k) => `<url><loc>https://www.bingoo.fr/comparer/${k}/</loc><lastmod>2026-11-23</lastmod></url>`).join("\n")}\n</urlset>\n`);
console.log("pages :", Object.keys(PAGES).join(", "));
