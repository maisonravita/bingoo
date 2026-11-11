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
  const ok = note >= 6 && (tarifs || mensuel) && (inscription || connexion) && !media;
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
const MRR_MIN = 1000; // en dessous de 1 000 $ par mois, ce n'est pas (encore) un SaaS à succès

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
  const ligne = (k: string) => md.match(new RegExp(`^- ${k}: (.+)$`, "m"))?.[1]?.trim() ?? null;
  const site = ligne("Website")?.match(/\((https?:\/\/[^)\s]+)\)/)?.[1] ?? null;
  const mrr = dollars(ligne("Current MRR"));
  const rev30 = dollars(ligne("Last 30 days revenue snapshot"));
  const croissance = ligne("Last 30 days MRR growth") ?? ligne("Last 30 days revenue growth");
  const abonnements = dollars(ligne("Current active subscriptions")) || null;
  const total = dollars(ligne("All-time revenue snapshot")) || null;
  const courbe = [...(md.split("### Monthly revenue timeline")[1] ?? "").matchAll(/^\| (\d{4}-\d{2}) \| \$([\d,]+) \|$/gm)].map((m) => ({ m: m[1], v: Number(m[2].replace(/,/g, "")) }));
  const marches = [...(ligne("Markets") ?? "").matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]).slice(0, 5);
  return {
    slug, site, nom: ligne("Name"), description: ligne("Description"), pays: ligne("Country"), fonde: ligne("Founded date"),
    mrr, rev30, croissance, abonnements, total, courbe, marches, prix: ligne("Pricing model"), probleme: ligne("Problem solved"),
    a_vendre: /currently listed for sale/i.test(md) && !/not currently listed for sale/i.test(md),
  };
}

const fmt$ = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ")} $`;

/** Lit les prochaines fiches de la file (rythme doux : 4 en parallèle). */
export async function trustmrrLire(n = 40, maxMs = 100_000) {
  const t0 = Date.now();
  await admin.from("saas_trustmrr").update({ statut: "a_lire" }).eq("statut", "en_cours").lt("at", new Date(Date.now() - 600_000).toISOString());
  const { data } = await admin.from("saas_trustmrr").select("slug").eq("statut", "a_lire").limit(n);
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
        let domaine: string | null = null;
        try { domaine = f.site ? new URL(f.site).hostname.replace(/^www\./, "").toLowerCase() : null; } catch { /* adresse invalide */ }
        const mensuel = Math.max(f.mrr, f.rev30);
        res.push({ slug, statut: mensuel >= MRR_MIN && domaine ? "succes" : "petit", mrr: mensuel || null, domaine, at });
        if (mensuel >= MRR_MIN && domaine && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domaine) && !/(trustmrr|apps\.apple|play\.google|chromewebstore|x\.com|twitter|linkedin|instagram|tiktok|youtube)/.test(domaine)) succes.push({ ...f, site: domaine });
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
      const mensuel = Math.max(f.mrr, f.rev30);
      const preuve = f.mrr ? `${fmt$(f.mrr)} de MRR vérifié par Stripe${f.croissance ? ` (${f.croissance} en 30 jours)` : ""}` : `${fmt$(f.rev30)} de revenu vérifié sur 30 jours`;
      const s = { preuve, source: `${TM}/startup/${f.slug}`, type: "revenu_verifie", montant: mensuel * 12, mrr: f.mrr || null, revenu_30j: f.rev30 || null, croissance_30j: f.croissance, abonnements: f.abonnements, revenu_total: f.total, fonde: f.fonde, courbe: f.courbe.slice(-12), marches: f.marches, prix: f.prix, probleme: f.probleme, a_vendre: f.a_vendre, verifie_at: new Date().toISOString() };
      const e = par.get(f.site!);
      if (e) {
        // Un revenu vérifié remplace une estimation ; on garde le plus récent quand les deux sont vérifiés
        await admin.from("saas").update({ succes: s, ...(["illisible", "a_lire"].includes(e.statut) ? { statut: "a_lire", essais: 0 } : {}) }).eq("id", e.id);
        maj++;
      } else {
        const { error } = await admin.from("saas").insert({ domaine: f.site, nom: f.nom, source: "trustmrr", succes: s });
        if (!error) ajoutes++;
      }
    }
  }
  return { lus: res.length, succes: succes.length, ajoutes, maj };
}
