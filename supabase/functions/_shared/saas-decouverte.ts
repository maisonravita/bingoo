// Découverte de SaaS à grande échelle, sans IA :
// 1. la liste publique Tranco (le million de sites les plus visités, recalculée chaque jour) remplit saas_candidats ;
// 2. chaque candidat est trié par une simple lecture de son accueil (tarifs, inscription, prix au mois…) : gratuit ;
// 3. seuls les sites qui ressemblent à un SaaS entrent dans l'Explorer, où l'IA les lit (sous plafond quotidien).
import { admin } from "./core.ts";
import { safeFetchText } from "./safefetch.ts";
import { saasAdd } from "./saas-base.ts";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// Sites qui ne sont jamais des SaaS à suivre : administrations, écoles, médias de masse, réseaux, infrastructures
const EXCLU = /\.(gov|gouv\.fr|edu|mil|int|ac\.[a-z]{2}|gov\.[a-z]{2}|edu\.[a-z]{2})$|(^|\.)(google|facebook|instagram|whatsapp|youtube|wikipedia|amazon|apple|microsoft|twitter|x|tiktok|netflix|yahoo|bing|baidu|yandex|akamai|cloudflare|amazonaws|googleapis|gstatic|doubleclick|fbcdn|cdn|porn|xxx|casino|bet|fastly|b-cdn|bunnycdn|edgekey|edgesuite|azureedge|cloudfront|crashlytics|appsflyer|adjust|branch|onelink)[.-]|\.(workers|pages|vercel|netlify|herokuapp|github|gitlab|web|firebaseapp|azurewebsites|myshopify|wixsite|webflow|blogspot|wordpress)\.(dev|app|io|com|net)$|^(cloud\.microsoft|bit\.ly|t\.co|linktr\.ee)$/;
const TLD_EXCLU = /\.(cn|ru|kr|jp|tw|ir|vn|th|id|tr|by|kz|ua)$/;

/** Ajoute à saas_candidats les sites de rang [debut, fin) de la dernière liste Tranco. */
export async function decouvrirImport(debut: number, fin: number) {
  const meta = await (await fetch("https://tranco-list.eu/api/lists/date/latest")).json();
  const r = await fetch(`https://tranco-list.eu/download/${meta.list_id}/${fin}`);
  if (!r.ok) throw new Error(`Tranco ${r.status}`);
  const lignes = (await r.text()).split("\n");
  const lot: { domaine: string; rang: number }[] = [];
  for (const l of lignes) {
    const [rg, d] = l.trim().split(",");
    const rang = Number(rg);
    if (!d || !(rang >= debut && rang < fin)) continue;
    const dom = d.toLowerCase();
    if (EXCLU.test(dom) || TLD_EXCLU.test(dom) || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(dom)) continue;
    lot.push({ domaine: dom, rang });
  }
  let ajoutes = 0;
  for (let i = 0; i < lot.length; i += 5000) {
    const { data } = await admin.from("saas_candidats").upsert(lot.slice(i, i + 5000), { onConflict: "domaine", ignoreDuplicates: true }).select("domaine");
    ajoutes += data?.length ?? 0;
  }
  return { liste: meta.list_id, lus: lot.length, ajoutes };
}

/** Note « ressemble à un SaaS » d'une page d'accueil, sans IA. */
export function noteSaas(html: string) {
  const h = html.toLowerCase();
  const liens = [...h.matchAll(/href=["']([^"'#]{1,200})["']/g)].map((m) => m[1]);
  const a = (re: RegExp) => re.test(h);
  const tarifs = liens.some((u) => /\/(pricing|tarifs?|prix|plans|price|preise|precios|prezzi)(\/|\?|$|\.html)/.test(u));
  const inscription = a(/(sign ?up|get started|start (your )?(free|trial)|free trial|try (it )?(for )?free|essai gratuit|essayer gratuitement|commencer gratuitement|cr[ée]er (un|mon) compte|book a demo|request a demo|demander une d[ée]mo|get a demo|kostenlos testen|prueba gratis)/);
  const connexion = a(/(log ?in|sign ?in|se connecter|connexion|anmelden|iniciar sesi)/) || liens.some((u) => /^https?:\/\/(app|dashboard|my|portal|console)\./.test(u) || /\/(login|signin|app)(\/|$)/.test(u));
  const mensuel = a(/(\/ ?month|per month|\/ ?mo\b|par mois|\/ ?mois|per user|par utilisateur|billed (monthly|annually)|factur[ée] (mensuellement|annuellement)|pro Monat|al mes)/);
  const logiciel = [/\bsaas\b/, /software|logiciel/, /platform|plateforme/, /\bapi\b/, /integrations?|int[ée]grations?/, /dashboard|tableau de bord/, /automat/, /workflow/, /\bcrm\b/, /\bteams?\b|[ée]quipes?/].filter((re) => re.test(h)).length;
  const boutique = a(/(add to (cart|bag)|ajouter au panier|in den warenkorb|a[ñn]adir al carrito|\/cart\b|\/panier\b|woocommerce|shopify\.com\/s\/files)/);
  const media = a(/(breaking news|derni[èe]res? (infos|actualit)|horoscope|recettes? de|lottery|casino|porn|escort)/);
  let note = (tarifs ? 3 : 0) + (inscription ? 2 : 0) + (connexion ? 1 : 0) + (mensuel ? 2 : 0) + Math.min(3, logiciel);
  if (boutique) note -= 4;
  if (media) note -= 6;
  // Appli web (outil en ligne) : compte utilisateur + vocabulaire d'outil + offre payante (premium, crédits, à vie)
  const outil = a(/(upgrade|go pro|premium|credits?|cr[ée]dits|lifetime|[àa] vie|one-time|paiement unique)/) && a(/(online|en ligne|in your browser|dans (ton|votre) navigateur|upload|t[ée]l[ée]verse|g[ée]n[ée]r|convert|[ée]diteur|editor|create|cr[ée]er)/);
  const ok = !media && ((note >= 6 && (tarifs || mensuel) && (inscription || connexion)) || (!boutique && outil && (inscription || connexion) && logiciel >= 1));
  return { note, ok };
}

/** Trie les prochains candidats (meilleurs rangs d'abord). Renvoie le nombre de SaaS ajoutés à l'Explorer. */
export async function decouvrirTri(n = 240, maxMs = 100_000) {
  const t0 = Date.now();
  // Tri interrompu (fonction arrêtée) : ses sites reviennent dans la file au bout de 10 minutes
  await admin.from("saas_candidats").update({ statut: "a_tester" }).eq("statut", "en_test").lt("at", new Date(Date.now() - 600_000).toISOString());
  const { data } = await admin.from("saas_candidats").select("domaine").eq("statut", "a_tester").order("rang").limit(n);
  const doms = (data ?? []).map((x) => x.domaine);
  if (!doms.length) return { testes: 0, saas: 0 };
  // Réservés tout de suite : deux tris qui se chevauchent ne testent pas les mêmes sites
  await admin.from("saas_candidats").update({ statut: "en_test", at: new Date().toISOString() }).in("domaine", doms);
  const res: { domaine: string; statut: string; note: number | null }[] = [];
  let i = 0;
  const ouvrier = async () => {
    while (i < doms.length && Date.now() - t0 < maxMs) {
      const d = doms[i++];
      try {
        const r = await safeFetchText(`https://${d}`, { headers: { "user-agent": UA, accept: "text/html", "accept-language": "fr-FR,fr;q=0.9,en;q=0.8" } }, 600_000, 8000);
        if (!r.ok || !r.type.includes("html")) { res.push({ domaine: d, statut: "erreur", note: null }); continue; }
        const x = noteSaas(r.text);
        res.push({ domaine: d, statut: x.ok ? "saas" : "non", note: x.note });
      } catch { res.push({ domaine: d, statut: "erreur", note: null }); }
    }
  };
  await Promise.all(Array.from({ length: 30 }, ouvrier));
  const at = new Date().toISOString();
  // Une seule requête : l'upsert ne réécrit que les colonnes fournies
  if (res.length) await admin.from("saas_candidats").upsert(res.map((x) => ({ ...x, at })), { onConflict: "domaine" });
  // Ceux qu'on n'a pas eu le temps de tester reviennent dans la file
  const faits = new Set(res.map((x) => x.domaine));
  const restants = doms.filter((d) => !faits.has(d));
  if (restants.length) await admin.from("saas_candidats").update({ statut: "a_tester" }).in("domaine", restants);
  const trouves = res.filter((x) => x.statut === "saas").map((x) => x.domaine);
  const ajoutes = trouves.length ? await saasAdd(trouves, "decouverte:tranco") : 0;
  return { testes: res.length, saas: trouves.length, ajoutes };
}

/** Importe la bibliothèque de SaaS à succès (preuve sourcée) : ajoutés à l'Explorer, lus en priorité par l'IA. */
export async function succesImport() {
  const { SUCCES } = await import("./succes-data.ts");
  const doms = SUCCES.map((x) => x.domaine);
  const { data: deja } = await admin.from("saas").select("id, domaine, statut").in("domaine", doms);
  const par = new Map((deja ?? []).map((x) => [x.domaine, x]));
  let ajoutes = 0, maj = 0;
  for (const x of SUCCES) {
    const succes = { preuve: x.preuve, source: x.source, type: x.type, montant: x.montant };
    const e = par.get(x.domaine);
    if (e) {
      await admin.from("saas").update({ succes, ...(["illisible", "a_lire"].includes(e.statut) ? { statut: "a_lire", essais: 0 } : {}) }).eq("id", e.id);
      maj++;
    } else {
      const { error } = await admin.from("saas").insert({ domaine: x.domaine, nom: x.nom, source: "recherche:succes", succes });
      if (!error) ajoutes++;
    }
  }
  return { total: SUCCES.length, ajoutes, maj };
}

// ---------------------------------------------------------------- TrustMRR
// Base publique de revenus vérifiés par Stripe. Chaque startup a une fiche Markdown publique prévue pour les agents IA
// (robots.txt l'autorise). On lit le plan du site, puis les fiches à un rythme doux, et on garde celles qui ont un vrai revenu.
const TM = "https://trustmrr.com";
// Revenu mensuel vérifié minimum pour entrer dans la bibliothèque (100 $ : « en décollage » ; 1 000 $ et plus : « à succès »)
const MRR_MIN = 100;
const PLATEFORMES = /(^|\.)(google|notion|gumroad|whop|stripe|lemonsqueezy|carrd|framer|github|gitlab|apple|microsoft|amazon|substack|beehiiv|skool|kajabi|teachable|podia|wix|wixsite|squarespace|webflow|wordpress|bubbleapps|vercel|netlify|linktr|bio|beacons|patreon|ko-fi|buymeacoffee|youtube|tiktok|instagram|facebook|linkedin|x|twitter|discord|telegram|t|producthunt|chromewebstore|trustmrr)\.[a-z.]+$/; // en dessous de 1 000 $ par mois, ce n'est pas (encore) un SaaS à succès

/** Ajoute à la file les startups du plan du site TrustMRR (nouvelles seulement). */
export async function trustmrrPlan() {
  const r = await safeFetchText(`${TM}/startup-sitemap.xml`, { headers: { "user-agent": "BingooBot/1.0 (+https://kairo.maisonravita.fr)" } }, 6_000_000, 30000);
  if (!r.ok) throw new Error(`TrustMRR ${r.status}`);
  const slugs = [...new Set([...r.text.matchAll(/<loc>https:\/\/trustmrr\.com\/startup\/([a-z0-9-]+)<\/loc>/g)].map((m) => m[1]))];
  let ajoutes = 0;
  for (let i = 0; i < slugs.length; i += 3000) {
    const { data } = await admin.from("saas_trustmrr").upsert(slugs.slice(i, i + 3000).map((slug) => ({ slug })), { onConflict: "slug", ignoreDuplicates: true }).select("slug");
    ajoutes += data?.length ?? 0;
  }
  return { slugs: slugs.length, ajoutes };
}

const dollars = (s?: string | null) => (s ? Number(s.replace(/[^0-9.]/g, "")) || 0 : 0);

/** Lit une fiche Markdown TrustMRR. */
export function trustmrrFiche(md: string, slug: string) {
  // Le Markdown échappe la ponctuation (« Blumi \\| Orbitagents ») : on retire ces barres obliques
  const ligne = (k: string) => md.match(new RegExp(`^- ${k}: (.+)$`, "m"))?.[1]?.trim().replace(/\\([|*_#\[\]()<>`~-])/g, "$1") ?? null;
  const site = ligne("Website")?.match(/\((https?:\/\/[^)\s]+)\)/)?.[1] ?? null;
  const mrr = dollars(ligne("Current MRR"));
  const rev30 = dollars(ligne("Last 30 days revenue snapshot"));
  const croissance = ligne("Last 30 days MRR growth") ?? ligne("Last 30 days revenue growth");
  const abonnements = dollars(ligne("Current active subscriptions")) || null;
  const total = dollars(ligne("All-time revenue snapshot")) || null;
  const courbe = [...(md.split("### Monthly revenue timeline")[1] ?? "").split("\n## ")[0].matchAll(/^\| (\d{4}-\d{2}) \| \$([\d,.]+) \|$/gm)].map((m) => ({ m: m[1], v: Math.round(Number(m[2].replace(/,/g, ""))) }));
  // Fondateurs affichés publiquement par la startup elle-même sur TrustMRR (nom, lien du profil, photo, abonnés X)
  const fondateurs = [...md.matchAll(/^- (?:Co-)?[Ff]ounder: \[([^\]]+)\]\((https:\/\/trustmrr\.com\/founder\/[^)\s]+)\)$/gm)].slice(0, 3).map((m) => ({ nom: m[1].replace(/\\([|*_#\[\]()<>`~-])/g, "$1").trim(), lien: m[2] }));
  const photo = ligne("Founder image")?.match(/\((https:\/\/[^)\s]+)\)/)?.[1] ?? null;
  const abonnesX = dollars(ligne("X followers")) || null;
  if (fondateurs[0]) Object.assign(fondateurs[0], { photo, x_abonnes: abonnesX });
  const marches = [...(ligne("Markets") ?? "").matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]).slice(0, 5);
  return {
    slug, site, nom: ligne("Name"), description: ligne("Description"), pays: ligne("Country"), fonde: ligne("Founded date"),
    mrr, rev30, croissance, fondateurs, abonnements, total, courbe, marches, prix: ligne("Pricing model"), probleme: ligne("Problem solved"),
    a_vendre: /Status: Listed for sale/i.test(md) || (/currently listed for sale/i.test(md) && !/not currently listed for sale/i.test(md)),
    details: trustmrrDetails(md),
  };
}

/** Tout ce que la fiche publique TrustMRR contient, rangé (sans la liste « Discover More Startups »). */
export function trustmrrDetails(md: string) {
  const nettoie = (v: string) => v.replace(/\\([|*_#\[\]()<>`~-])/g, "$1").trim();
  const sections: Record<string, string> = {};
  for (const bloc of md.split(/^## /m).slice(1)) { const i = bloc.indexOf("\n"); sections[bloc.slice(0, i).trim()] = bloc.slice(i + 1); }
  // Lignes « - Clé: valeur » d'une section ; les listes de liens deviennent des listes de textes
  const cles = (t = "") => {
    const o: Record<string, any> = {};
    for (const m of t.matchAll(/^- ([^:\n]+): (.+)$/gm)) {
      const v = nettoie(m[2]);
      const liens = [...v.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)];
      o[m[1].trim()] = liens.length > 1 || (liens.length === 1 && /, \[/.test(v)) ? liens.map((l) => l[1]) : liens.length === 1 && v.startsWith("[") ? liens[0][1] : v;
    }
    return o;
  };
  const num = (v: any) => { if (v == null) return null; const n = Number(String(v).replace(/[^0-9.-]/g, "")); return Number.isFinite(n) && String(v).match(/\d/) ? n : null; };
  const lienDe = (v: any) => String(v ?? "").match(/\((https?:\/\/[^)\s]+)\)/)?.[1] ?? null;
  const table = (t = "") => [...t.matchAll(/^\| ([^|]+?) \| \$?([\d,.]+) \|$/gm)].map((m) => ({ k: m[1].trim(), v: Math.round(Number(m[2].replace(/,/g, "")) * 100) / 100 }));
  const brut = (k: string) => md.match(new RegExp(`^- ${k}: (.+)$`, "m"))?.[1] ?? null;
  const profil = cles(sections["Profile"]), verif = cles(sections["Verification Sources"]), snap = cles(sections["Metric Snapshots"]);
  const insights = cles(sections["Startup Insights"]), tech = cles(sections["Tech Stack"]), distrib = cles(sections["Distribution"]), seo = cles(sections["SEO Domain Data"]);
  const rev = sections["Revenue"] ?? "";
  const periodes = Object.fromEntries(table(rev.split("###")[0]).map((x) => [x.k, x.v]));
  const jours = table((rev.split("### Daily revenue")[1] ?? "").split("###")[0]).map((x) => ({ d: x.k, v: x.v }));
  const vente = sections["Acquisition"] ?? "";
  const liste = (v: any) => (Array.isArray(v) ? v : v ? [v] : []) as string[];
  return {
    icone: lienDe(brut("Icon")),
    description: profil["Description"] ?? null,
    paiement: verif["Verified payment provider API source"] ?? null,
    marchand_officiel: verif["Merchant of record"] ?? null,
    synchro: verif["Revenue last synced"] ?? null,
    analytics: { ga: verif["Google Analytics API connected"] === "Yes", datafast: verif["DataFast API key connected"] === "Yes", gsc: verif["Google Search Console API connected"] === "Yes" },
    revenus: { h24: periodes["Last 24 hours"] ?? null, j7: periodes["Last 7 days"] ?? null, j30: periodes["Last 30 days"] ?? null, m3: periodes["Last 3 months"] ?? null, m6: periodes["Last 6 months"] ?? null, m12: periodes["Last 12 months"] ?? null, total: periodes["All time"] ?? null },
    croissance_revenu_30j: cles(rev)["Last 30 days revenue growth"] ?? null,
    jours,
    mrr: num(snap["Current MRR"]), croissance_mrr_30j: snap["Last 30 days MRR growth"] ?? null,
    abonnements: num(snap["Current active subscriptions"]), clients: num(snap["Current customers"] ?? snap["Customers"]),
    churn: snap["Churn rate"] ?? snap["Last 30 days churn"] ?? snap["Churn"] ?? null,
    visiteurs_30j: num(snap["Last 30 days traffic or visitors"]), revenu_par_visiteur: num(snap["Last 30 days revenue per visitor"]),
    marge: snap["Last 30 days profit margin"] ?? null,
    autres_mesures: Object.fromEntries(Object.entries(snap).filter(([k]) => !/^(Current MRR|Last 30 days MRR growth|Current active subscriptions|Last 30 days traffic or visitors|Last 30 days revenue per visitor|Last 30 days profit margin)$/.test(k))),
    proposition: insights["Value proposition"] ?? null, probleme: insights["Problem solved"] ?? null, prix: insights["Pricing model"] ?? null,
    persona: insights["Target persona"] ?? null, audience: liste(insights["Audience type"]).join(", ") || null, equipe: insights["Team size"] ?? null,
    financement: insights["Funding"] ?? null, utilisateurs: num(insights["Estimated user count"]), infos: insights["Additional info"] ?? null,
    marches: liste(insights["Markets"]),
    tech: Object.fromEntries(Object.entries(tech).map(([k, v]) => [k, liste(v)])),
    canaux: liste(distrib["Marketing channels"]),
    domain_rating: num(seo["Domain rating"]),
    captures: [...(sections["Screenshots"] ?? "").matchAll(/!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/g)].slice(0, 4).map((m) => ({ titre: m[1].replace(/\s*\(\d+x\d+\)/, ""), url: m[2] })),
    vente: (() => {
      const v = cles(vente);
      const a = /Status: Listed for sale/i.test(vente) || (/currently listed for sale/i.test(vente) && !/not currently listed for sale/i.test(vente));
      return a ? { a_vendre: true, prix: num(v["Asking price"]), multiple: v["Revenue multiple"] ?? null, depuis: v["First listed for sale"] ?? null, acheteurs_vus: num(v["Interested buyers who saw this recently"]), offres: num(v["Acquisition offers received"]), message: v["Message from the seller"] ? String(v["Message from the seller"]).replace(/^Seller\s*[—-]\s*/, "").replace(/^["“]|["”]$/g, "") : null, offre_url: (vente.match(/Make an offer: \[[^\]]*\]\((https:\/\/trustmrr\.com\/[^)\s]+)\)/) ?? [])[1] ?? null } : { a_vendre: false };
    })(),
    lu_at: new Date().toISOString(),
  };
}

const fmt$ = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ")} $`;

/** Lit les prochaines fiches de la file (rythme doux : 4 en parallèle). */
export async function trustmrrLire(n = 40, maxMs = 100_000, seul?: string) {
  const t0 = Date.now();
  await admin.from("saas_trustmrr").update({ statut: "a_lire" }).eq("statut", "en_cours").lt("at", new Date(Date.now() - 600_000).toISOString());
  // Ordre aléatoire (tiré à l'import) : le classement est représentatif dès les premières heures, pas seulement les noms en A
  const { data } = seul ? { data: [{ slug: seul }] } : await admin.from("saas_trustmrr").select("slug").eq("statut", "a_lire").order("ordre").limit(n);
  const slugs = (data ?? []).map((x) => x.slug);
  if (!slugs.length) return { lus: 0 };
  await admin.from("saas_trustmrr").update({ statut: "en_cours", at: new Date().toISOString() }).in("slug", slugs);
  const res: { slug: string; statut: string; mrr: number | null; domaine: string | null; at: string }[] = [];
  const succes: ReturnType<typeof trustmrrFiche>[] = [];
  let i = 0;
  const ouvrier = async () => {
    while (i < slugs.length && Date.now() - t0 < maxMs) {
      const slug = slugs[i++];
      const at = new Date().toISOString();
      try {
        const r = await safeFetchText(`${TM}/startup/${slug}.md`, { headers: { "user-agent": "BingooBot/1.0 (+https://kairo.maisonravita.fr)", accept: "text/markdown,text/plain" } }, 400_000, 12000);
        if (!r.ok) { res.push({ slug, statut: r.status === 404 ? "absent" : "erreur", mrr: null, domaine: null, at }); continue; }
        const f = trustmrrFiche(r.text, slug);
        // Le site doit être une vraie adresse à la racine : pas une page hébergée chez une plateforme (Google Docs, Notion, Gumroad…)
        let domaine: string | null = null;
        try {
          const u = f.site ? new URL(f.site) : null;
          const d = u?.hostname.replace(/^www\./, "").toLowerCase() ?? null;
          if (u && d && (u.pathname === "/" || u.pathname === "") && !PLATEFORMES.test(d)) domaine = d;
        } catch { /* adresse invalide */ }
        // Le MRR fait foi ; le revenu sur 30 jours ne compte que pour les startups sans abonnement (ventes à l'unité)
        const mensuel = f.mrr > 0 ? f.mrr : f.rev30;
        res.push({ slug, statut: mensuel >= MRR_MIN && domaine ? "succes" : "petit", mrr: mensuel || null, domaine, at });
        // Toutes les startups qui ont leur propre site entrent dans la bibliothèque, même à 0 $ : le chiffre affiché dit la vérité,
        // et seules celles à 100 $ par mois et plus comptent comme « en décollage » ou « à succès »
        if (domaine && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domaine) && !/(^|\.)(trustmrr\.com|apps\.apple\.com|play\.google\.com|chromewebstore\.google\.com|x\.com|twitter\.com|linkedin\.com|instagram\.com|tiktok\.com|youtube\.com)$/.test(domaine)) succes.push({ ...f, site: domaine });
      } catch { res.push({ slug, statut: "erreur", mrr: null, domaine: null, at }); }
    }
  };
  await Promise.all(Array.from({ length: 4 }, ouvrier));
  if (res.length) await admin.from("saas_trustmrr").upsert(res, { onConflict: "slug" });
  const faits = new Set(res.map((x) => x.slug));
  const restants = slugs.filter((s) => !faits.has(s));
  if (restants.length) await admin.from("saas_trustmrr").update({ statut: "a_lire" }).in("slug", restants);

  let ajoutes = 0, maj = 0;
  if (succes.length) {
    const { data: deja } = await admin.from("saas").select("id, domaine, statut, succes").in("domaine", succes.map((x) => x.site!));
    const par = new Map((deja ?? []).map((x) => [x.domaine, x]));
    for (const f of succes) {
      const mensuel = f.mrr > 0 ? f.mrr : f.rev30;
      const crois = f.croissance?.replace(".", ",").replace("%", " %");
      const fournisseur = String(f.details?.paiement ?? "").replace(/\s*\(.*\)\s*$/, "").trim() || "Stripe";
      const preuve = f.mrr ? `${fmt$(f.mrr)} de MRR vérifié par ${fournisseur}${crois && !/^[+-]?0,0/.test(crois) ? ` (${crois} en 30 jours)` : ""}` : f.rev30 ? `${fmt$(f.rev30)} de revenu vérifié sur 30 jours` : "Pas encore de revenu (Stripe connecté)";
      const s = { preuve, source: `${TM}/startup/${f.slug}`, type: "revenu_verifie", montant: mensuel * 12, mrr: f.mrr || null, revenu_30j: f.rev30 || null, croissance_30j: f.croissance, abonnements: f.abonnements, revenu_total: f.total, fonde: f.fonde, courbe: f.courbe.slice(-12), marches: f.marches, prix: f.prix, probleme: f.probleme, description: f.description, pays: f.pays, a_vendre: f.a_vendre, fondateurs: f.fondateurs, verifie_at: new Date().toISOString() };
      const e = par.get(f.site!);
      // Ne jamais écraser la preuve d'un autre SaaS (ex. un géant) : seulement si la fiche n'en a pas, ou si c'est la même startup TrustMRR
      if (e && e.succes && e.succes.source !== s.source && !String(e.succes.source ?? "").includes("trustmrr.com")) { await admin.from("saas").update({ trustmrr: f.details }).eq("id", e.id); continue; }
      if (e) {
        // Un revenu vérifié remplace une estimation ; on garde le plus récent quand les deux sont vérifiés
        await admin.from("saas").update({ succes: s, trustmrr: f.details, ...(["illisible", "a_lire"].includes(e.statut) ? { statut: "a_lire", essais: 0 } : {}) }).eq("id", e.id);
        maj++;
      } else {
        const { error } = await admin.from("saas").insert({ domaine: f.site, nom: nomPropre(f.nom || f.site!), source: "trustmrr", succes: s, trustmrr: f.details });
        if (!error) ajoutes++;
      }
    }
  }
  return { lus: res.length, succes: succes.length, ajoutes, maj };
}


// Publication sans IA des startups TrustMRR : la fiche est remplie avec leurs propres données (en anglais),
// puis l'IA la relira en français quand le budget le permet (lu_at vide = prioritaire dans la file de lecture).
const MARCHE_CAT: [RegExp, string][] = [
  [/sales|crm|lead/i, "CRM et ventes"], [/email|outreach|cold/i, "Prospection et emailing"], [/seo|marketing|advertis|ads\b|growth/i, "Marketing et SEO"],
  [/social|content|creator|video|newsletter|writing/i, "Réseaux sociaux et contenu"], [/invoic|accounting|bookkeep/i, "Facturation et comptabilité"],
  [/\bhr\b|payroll|human/i, "Paie et RH"], [/recruit|hiring|job/i, "Recrutement"], [/project|productivity|task/i, "Gestion de projet"],
  [/collaborat|document|note/i, "Collaboration et documents"], [/support|customer service|helpdesk/i, "Support client"], [/e-?comm|shopify|retail/i, "E-commerce"],
  [/fintech|finance|payment|crypto|invest|trading/i, "Paiement et finance"], [/legal|law/i, "Juridique"], [/real estate|property/i, "Immobilier"],
  [/health|fitness|medical|wellness/i, "Santé"], [/educat|learning|course|language/i, "Éducation et formation"], [/restaurant|food|travel|booking/i, "Commerce et restauration"],
  [/logistic|shipping|transport/i, "Logistique et transport"], [/dev|api|no-?code|developer/i, "Développeurs et no-code"], [/analytic|data|dashboard/i, "Données et analytics"],
  [/secur|privacy|compliance/i, "Sécurité et conformité"], [/\bai\b|automation|agent/i, "IA et automatisation"], [/event/i, "Événements"], [/agency|freelanc/i, "Agences et freelances"],
];
const PAYS_EN: Record<string, string> = { "united states": "US", usa: "US", "united kingdom": "GB", uk: "GB", france: "FR", germany: "DE", canada: "CA", spain: "ES", italy: "IT", netherlands: "NL", india: "IN", brazil: "BR", australia: "AU", portugal: "PT", poland: "PL", sweden: "SE", switzerland: "CH", belgium: "BE", ireland: "IE", singapore: "SG", "united arab emirates": "AE", israel: "IL", ukraine: "UA", turkey: "TR", mexico: "MX", argentina: "AR", japan: "JP", "south korea": "KR", indonesia: "ID", vietnam: "VN", philippines: "PH", pakistan: "PK", nigeria: "NG", estonia: "EE", romania: "RO", greece: "GR", austria: "AT", denmark: "DK", norway: "NO", finland: "FI", "czech republic": "CZ", "new zealand": "NZ", "south africa": "ZA", egypt: "EG", morocco: "MA", tunisia: "TN" };
const SERVICE = /\b(agency|agence|llc|l\.l\.c|consult\w*|digital marketing|social media management|it solutions|done[- ]for[- ]you|services?\b|freelanc|coaching|mentorship|course|cohort|community|newsletter|studio|we help|we build|marketing firm|lead generation agency|consultant|onlyfans|personal branding|white[- ]label services)\b/i;
// « Acme, LLC (only Stripe MRR counted) » → « Acme »
export const nomPropre = (n: string) => String(n).replace(/\s*[\(\[][^)\]]*[\)\]]\s*/g, " ").trim().replace(/,?\s+(l\.?l\.?c\.?|inc\.?|ltd\.?|limited|gmbh|sas|sarl|s\.?l\.?|b\.?v\.?|corp\.?|co\.|pty\.?)$/i, "").replace(/\s*[|—–-]\s+.*$/, "").replace(/\s+/g, " ").trim().slice(0, 60).replace(/^[A-Z0-9 .&'-]{5,}$/, (t) => t.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())) || String(n).slice(0, 60);
export async function trustmrrPublier(n = 300, domaine?: string) {
  let q = admin.from("saas").select("id, nom, domaine, succes").eq("statut", "a_lire").like("succes->>source", "%trustmrr.com%").is("succes->>attente", null);
  if (domaine) q = q.eq("domaine", domaine);
  const { data } = await q.limit(n);
  let publies = 0;
  for (const r of (data ?? []) as any[]) {
    const su = r.succes ?? {};
    const texte = String(su.description || su.probleme || "").replace(/\s+/g, " ").trim();
    // Agences, services ou fiche sans texte : mis de côté pour la lecture par l'IA (marqués pour ne pas bloquer la file)
    const aMettreDeCote = !texte || SERVICE.test(`${r.nom} ${texte}`);
    if (aMettreDeCote) { await admin.from("saas").update({ succes: { ...su, attente: true } }).eq("id", r.id); continue; }
    const marches: string[] = Array.isArray(su.marches) ? su.marches : [];
    const cat = MARCHE_CAT.find(([re]) => marches.some((m) => re.test(m)))?.[1] ?? MARCHE_CAT.find(([re]) => re.test(texte))?.[1] ?? "Autre";
    const pays = PAYS_EN[String(su.pays ?? "").toLowerCase().trim()] ?? (/^[A-Z]{2}$/.test(String(su.pays ?? "")) ? su.pays : null);
    const { error } = await admin.from("saas").update({
      statut: "ok", est_saas: true, genre: Number(su.mrr) > 0 || !(Number(su.revenu_30j) > 0) ? "saas" : "app_web", nom: nomPropre(r.nom || r.domaine), categorie: cat,
      description: texte.slice(0, 300), langue: "en", pays, tags: [], lu_at: null, essais: 0,
    }).eq("id", r.id).eq("statut", "a_lire");
    if (!error) publies++;
  }
  return { publies };
}


/** Chiffres d'un SaaS à la demande (sans IA) : retrouve sa fiche TrustMRR par son adresse, la lit et la publie tout de suite. */
export async function trustmrrPourDomaine(domaine: string) {
  const d = domaine.replace(/^www\./, "").toLowerCase();
  let { data: t } = await admin.from("saas_trustmrr").select("slug").eq("domaine", d).limit(1).maybeSingle();
  if (!t) {
    // Pas encore dans la file : on essaie les adresses TrustMRR les plus probables (nom du site)
    const base = d.split(".")[0];
    for (const slug of [...new Set([base, d.replace(/\./g, "-"), base.replace(/^(get|try|use)/, "")])].filter((x) => /^[a-z0-9-]{2,}$/.test(x))) {
      const r = await safeFetchText(`${TM}/startup/${slug}.md`, { headers: { "user-agent": "BingooBot/1.0 (+https://kairo.maisonravita.fr)", accept: "text/markdown,text/plain" } }, 400_000, 10000).catch(() => null);
      if (!r?.ok) continue;
      const site = trustmrrFiche(r.text, slug).site;
      let hote = ""; try { hote = site ? new URL(site).hostname.replace(/^www\./, "").toLowerCase() : ""; } catch { /* adresse illisible */ }
      if (hote === d) { await admin.from("saas_trustmrr").upsert({ slug, statut: "a_lire", domaine: d }, { onConflict: "slug" }); t = { slug }; break; }
    }
  }
  if (!t) return { trustmrr: false };
  await trustmrrLire(1, 20_000, t.slug);
  await trustmrrPublier(1, d);
  return { trustmrr: true, slug: t.slug };
}
