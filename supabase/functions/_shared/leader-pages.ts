// Jumeau : nouvelles pages publiques du SaaS d'inspiration (fonctionnalités, intégrations, produits), lues dans son plan du site.
// Un signal fiable et presque gratuit : une page qui apparaît dans /features/ ou /integrations/, c'est une nouveauté produit.
// Le robots.txt est respecté (règles pour tous les robots ou pour BingooBot). Le premier passage sert de référence (aucune alerte).
import { admin } from "./core.ts";
import { safeFetchText } from "./safefetch.ts";
import { autorise, robots } from "./marche-saas.ts";

const UA = "BingooBot/1.0 (+https://kairo.maisonravita.fr/#/retrait)";
const UTILE = /\/(features?|fonctionnalit[eé]s?|product|products|produit|produits|integrations?|int[eé]grations?|apps?|marketplace|solutions?|use-cases?|cas-d-usage|platform|plateforme|ai|ia|automations?|templates?|modules?|tools?|outils)(\/|$)/i;
const BRUIT = /\/(blog|news|actualit|press|presse|help|aide|support|docs?|documentation|academy|learn|careers?|jobs?|carrieres?|legal|privacy|terms|cgu|cgv|customers?|clients?|case-stud|temoignages?|webinars?|events?|glossary|glossaire|compare|vs|alternatives?|author|tag|category|partners?|affiliates?|login|signup)(\/|$)/i;
const LANGUE = /^\/([a-z]{2}(-[a-z]{2})?)(\/|$)/i;

async function lire(url: string) {
  const r = await safeFetchText(url, { headers: { "user-agent": UA, accept: "application/xml,text/xml,text/html;q=0.9,*/*;q=0.5" } }, 4_000_000, 12000).catch(() => null);
  return r?.ok ? r.text : "";
}
const locs = (xml: string) => [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));

/** Toutes les pages « produit » du plan du site, une seule langue (sans préfixe, en ou fr). */
export const diag: Record<string, unknown> = {};
async function pagesProduit(domaine: string): Promise<string[] | null> {
  const site = `https://${domaine}`;
  const interdit = await robots(site);
  const rob = await lire(`${site}/robots.txt`);
  let plans = [...rob.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]);
  if (!plans.length) plans = [`${site}/sitemap.xml`, `${site}/sitemap_index.xml`];
  const urls = new Set<string>();
  // Pages venues d'un plan « pages / produits / fonctionnalités » : candidates même sans mot-clé dans l'adresse
  const pagesDePlan = new Set<string>();
  const PLAN_PAGES = /(^|[-_/])(pages?|products?|features?|solutions?|integrations?|apps?|marketplace|fonctionnalites?|produits?|landing)([-_.]|$)/i;
  const vus = new Set<string>();
  const file = [...plans.slice(0, 4)];
  while (file.length && vus.size < 12 && urls.size < 20000) {
    const p = file.shift()!;
    if (vus.has(p) || !autorise(interdit, p)) continue;
    vus.add(p);
    const xml = await lire(p);
    if (!xml) continue;
    const l = locs(xml);
    if (/<sitemapindex/i.test(xml)) {
      // Index de plans : d'abord les plans qui parlent de produit, de pages ou de fonctionnalités
      const tri = l.sort((a, b) => Number(/page|product|feature|integration|solution|app|market|fonction/i.test(b)) - Number(/page|product|feature|integration|solution|app|market|fonction/i.test(a)));
      // Une seule langue : on saute les plans d'une autre langue que l'anglais ou le français (de-, es-, pt-br_…)
      file.push(...tri.filter((x) => !/^(?!en|fr)[a-z]{2}([-_][a-z]{2})?[-_]/i.test(x.split("/").pop() ?? "") && !/\/(?!en|fr)[a-z]{2}(-[a-z]{2})?\/[^/]+$/i.test(new URL(x, p).pathname)).filter((x) => !/(^|[-_/])(blog|posts?|news|articles?|authors?|tags?|categor\w*|help|docs?|videos?|images?|jobs?|job_\w+|podcasts?|success_stories\w*|partners?|events?|glossary|press)([-_.]|$)/i.test(x.split("/").pop() ?? "")).slice(0, 8));
    } else for (const u of l) { urls.add(u); if (PLAN_PAGES.test(p.split("/").pop() ?? "")) pagesDePlan.add(u); }
  }
  Object.assign(diag, { plans, vus: [...vus], urls: urls.size, exemple: [...urls].slice(0, 5), robots: rob.slice(0, 300) });
  if (!vus.size || !urls.size) return null;
  const hote = domaine.replace(/^www\./, "");
  return [...urls].filter((u) => {
    try {
      const x = new URL(u);
      if (x.hostname.replace(/^www\./, "") !== hote) return false;
      const lang = x.pathname.match(LANGUE);
      if (lang && !/^(en|fr|en-us|fr-fr)$/i.test(lang[1])) return false;
      const profondeur = x.pathname.split("/").filter(Boolean).length;
      return (UTILE.test(x.pathname) || (pagesDePlan.has(u) && profondeur >= 1 && profondeur <= 4)) && !BRUIT.test(x.pathname) && autorise(interdit, u);
    } catch { return false; }
  }).map((u) => u.replace(/[?#].*$/, "").replace(/\/$/, "")).filter((u, i, a) => a.indexOf(u) === i);
}

const titreDe = (url: string) => decodeURIComponent(url.split("/").filter(Boolean).pop() ?? "").replace(/[-_]+/g, " ").replace(/\.\w+$/, "").replace(/^./, (c) => c.toUpperCase());

/** Nouvelles pages depuis le dernier passage. null si le site n'a pas de plan lisible ; [] au premier passage (référence). */
export async function pagesTest(domaine: string) { const l = await pagesProduit(domaine); return { ...diag, produit: l?.length ?? null, exemples_produit: (l ?? []).slice(0, 15) }; }
export async function pagesNouvelles(saasId: string, domaine: string): Promise<{ url: string; titre: string; resume: string }[] | null> {
  const toutes = await pagesProduit(domaine);
  if (!toutes) return null;
  const { count } = await admin.from("saas_pages").select("url", { count: "exact", head: true }).eq("saas_id", saasId);
  const connues = new Set<string>();
  if (count) {
    for (let i = 0; i < count; i += 1000) {
      const { data } = await admin.from("saas_pages").select("url").eq("saas_id", saasId).range(i, i + 999);
      for (const r of data ?? []) connues.add(r.url);
    }
  }
  const neuves = toutes.filter((u) => !connues.has(u));
  for (let i = 0; i < neuves.length && i < 5000; i += 500) await admin.from("saas_pages").upsert(neuves.slice(i, i + 500).map((url) => ({ saas_id: saasId, url })), { onConflict: "saas_id,url", ignoreDuplicates: true });
  if (!count) return [];
  // Titre et description des nouvelles pages (5 au plus)
  const out: { url: string; titre: string; resume: string }[] = [];
  for (const url of neuves.slice(0, 5)) {
    const html = await lire(url);
    const t = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const d = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] ?? "").trim();
    out.push({ url, titre: (t || titreDe(url)).slice(0, 120), resume: d.slice(0, 300) });
  }
  return out;
}
