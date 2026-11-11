// Découverte de SaaS à grande échelle, sans IA :
// 1. la liste publique Tranco (le million de sites les plus visités, recalculée chaque jour) remplit saas_candidats ;
// 2. chaque candidat est trié par une simple lecture de son accueil (tarifs, inscription, prix au mois…) : gratuit ;
// 3. seuls les sites qui ressemblent à un SaaS entrent dans l'Explorer, où l'IA les lit (sous plafond quotidien).
import { admin } from "./core.ts";
import { safeFetchText } from "./safefetch.ts";
import { saasAdd } from "./saas-base.ts";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// Sites qui ne sont jamais des SaaS à suivre : administrations, écoles, médias de masse, réseaux, infrastructures
const EXCLU = /\.(gov|gouv\.fr|edu|mil|int|ac\.[a-z]{2}|gov\.[a-z]{2}|edu\.[a-z]{2})$|(^|\.)(google|facebook|instagram|whatsapp|youtube|wikipedia|amazon|apple|microsoft|twitter|x|tiktok|netflix|yahoo|bing|baidu|yandex|akamai|cloudflare|amazonaws|googleapis|gstatic|doubleclick|fbcdn|cdn|porn|xxx|casino|bet)[.-]/;
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
