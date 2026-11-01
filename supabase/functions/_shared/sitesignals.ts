// Signaux lus sur le site d'un prospect, sans appel à l'IA (adapté de Harvey, © 2026 Ethan Rogers, licence MIT :
// voir THIRD_PARTY_HARVEY_LICENSE.txt). Règle : ne rien affirmer que la page ne prouve pas.
async function fetchText(url: string): Promise<string> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000), redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; prospection B2B)" } });
    return r.ok ? (await r.text()).slice(0, 400_000) : "";
  } catch { return ""; }
}

export type Signal = { type: string; label: string; url?: string; value?: string; at?: string };

const has = (html: string, pats: RegExp[]) => pats.some((p) => p.test(html));
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]{0,800}>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");

const TECH: Record<string, RegExp[]> = {
  WordPress: [/wp-content\//i, /wp-includes\//i], Wix: [/static\.parastorage\.com/i], Shopify: [/cdn\.shopify\.com/i, /myshopify\.com/i],
  Webflow: [/assets\.website-files\.com/i, /data-wf-domain/i], Squarespace: [/static1\.squarespace\.com/i], PrestaShop: [/prestashop/i],
  Framer: [/framerusercontent\.com/i], HubSpot: [/js\.hs-scripts\.com/i, /js\.hsforms\.net/i], Salesforce: [/salesforce\.com\/embeddedservice/i],
  Brevo: [/sibforms\.com|sendinblue|brevo\.com\/js/i], Mailchimp: [/chimpstatic\.com|list-manage\.com/i], Intercom: [/widget\.intercom\.io/i],
  Crisp: [/client\.crisp\.chat/i], Zendesk: [/static\.zdassets\.com/i], Axeptio: [/axept\.io/i], Stripe: [/js\.stripe\.com/i],
};
const GOOGLE_ADS = [/googleadservices\.com/i, /gtag\/js\?id=AW-/i, /google_conversion/i, /['"]AW-\d{6,}/];
const META_PIXEL = [/connect\.facebook\.net\/[^"']*fbevents\.js/i, /fbq\s*\(\s*['"]init/i];
const LINKEDIN_ADS = [/snap\.licdn\.com\/li\.lms-analytics/i, /_linkedin_partner_id/i];
const BOOKING = [/calendly\.com/i, /doctolib\.fr/i, /planity\.com/i, /treatwell\.fr/i, /zenchef/i, /thefork|lafourchette/i, /booksy\.com/i, /acuityscheduling/i,
  /setmore/i, /simplybook/i, /resengo/i, /guestonline/i, /maiia\.com/i, /rdv360|rendez-vous\.360/i, /hubspot\.com\/meetings/i, /cal\.com\//i, /prendre[-_ ]rendez[-_ ]vous|reserver[-_ ]en[-_ ]ligne|r[ée]servation en ligne/i];
const ATS: [string, RegExp][] = [
  ["greenhouse", /boards\.greenhouse\.io\/([a-z0-9-]+)/i], ["lever", /jobs\.lever\.co\/([a-z0-9-]+)/i], ["ashby", /jobs\.ashbyhq\.com\/([a-z0-9-]+)/i],
  ["welcometothejungle", /welcometothejungle\.com\/[a-z]{2}\/companies\/([a-z0-9-]+)/i], ["workable", /apply\.workable\.com\/([a-z0-9-]+)/i],
  ["teamtailor", /([a-z0-9-]+)\.teamtailor\.com/i], ["recruitee", /([a-z0-9-]+)\.recruitee\.com/i], ["smartrecruiters", /jobs\.smartrecruiters\.com\/([a-z0-9-]+)/i],
  ["flatchr", /careers\.flatchr\.io\/[a-z]{2}\/company\/([a-z0-9-]+)/i],
];
const CAREERS_LINK = /href=["']([^"']*\/(?:carrieres?|recrutement|nous-rejoindre|rejoignez-nous|jobs?|careers?|emplois?|offres-d-emploi)\/?)["']/i;
const ACCELERATORS: [string, RegExp][] = [
  ["Y Combinator", /\b(?:y ?combinator|yc [wsf]\d{2})\b/i], ["Techstars", /\btechstars\b/i], ["Station F", /station f(?: founders program| fighters)?/i],
  ["French Tech 120 / Next40", /french ?tech ?(?:120|next ?40)/i], ["Wilco", /\bwilco\b(?=[^.]{0,60}(?:accél|accel|programme|lauréat))/i],
  ["Réseau Entreprendre", /r[ée]seau entreprendre/i], ["Schoolab", /\bschoolab\b/i], ["50 Partners", /50 ?partners/i],
];
const FUNDING = /\b(?:nous avons|[a-z]+ a|vient de|annonce(?:r)?(?: une)?)\s+lev(?:é|ée|er|e)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(m€|millions?(?:\s+d['’]euros)?|k€|md€|m\s?€)/i;
const ROUND = /\b(seed|amorçage|pré-seed|série\s?[abc]|series\s?[abc])\b/i;
const CREDIT = /(?:site\s+(?:internet\s+|web\s+)?)?(?:r[ée]alis[ée]|cr[ée]{1,2}[ée]?|con[çc]u|d[ée]velopp[ée]|propuls[ée]|design)\s+(?:et\s+\w+\s+)?par\s*:?\s*(?:<[^>]*>\s*)*([A-Z][\w&'’ .-]{1,40}?)(?:\s*<|\s*[|©.,]|$)/;
const NOT_AGENCY = /^(wordpress|wix|shopify|webflow|squarespace|prestashop|jimdo|framer|ovh|o2switch|hostinger|google|nous|notre|l['’]équipe|la direction)$/i;

/** Lit la page d'accueil (déjà téléchargée) et, au besoin, 2 ou 3 petites ressources publiques. */
export async function siteSignals(origin: string, home: string, rivals: { name: string; host: string }[] = []): Promise<Signal[]> {
  if (!home) return [];
  const out: Signal[] = [];
  const add = (s: Signal) => { if (!out.some((x) => x.type === s.type && x.label === s.label)) out.push(s); };
  const t = text(home);

  // Comprendre → Agir : un concurrent suivi par Espion est relié au site du prospect (lien, script, widget)
  const own = (() => { try { return new URL(origin).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  for (const r of rivals) {
    if (!r.host || own.endsWith(r.host)) continue;
    if (new RegExp(`[/.@"']${r.host.replace(/\./g, "\\.")}`, "i").test(home)) { add({ type: "concurrent", label: `Utilise ${r.name} (repéré sur son site)`, value: r.host }); break; }
  }

  // Budget d'acquisition visible
  if (has(home, GOOGLE_ADS)) add({ type: "pub_google", label: "Fait de la publicité Google (balise de conversion sur son site)" });
  if (has(home, META_PIXEL)) add({ type: "pub_meta", label: "Fait de la publicité Facebook / Instagram (pixel Meta sur son site)" });
  if (has(home, LINKEDIN_ADS)) add({ type: "pub_linkedin", label: "Suit ses campagnes LinkedIn (balise LinkedIn sur son site)" });

  // Outils et manques concrets
  const tools = Object.entries(TECH).filter(([, p]) => has(home, p)).map(([n]) => n);
  if (tools.length) add({ type: "techno", label: `Site sous ${tools.slice(0, 3).join(", ")}`, value: tools.join(",") });
  if (!has(home, BOOKING)) add({ type: "sans_reservation", label: "Pas de prise de rendez-vous en ligne sur son site" });
  if (!/application\/ld\+json/i.test(home)) add({ type: "sans_schema", label: "Pas de données structurées (référencement Google et IA moins bon)" });

  // Agence citée en pied de page
  const foot = home.slice(-25_000);
  const cm = foot.match(CREDIT);
  if (cm) { const name = cm[1].trim().replace(/\s+/g, " "); if (name.length > 2 && !NOT_AGENCY.test(name)) add({ type: "agence", label: `Site réalisé par ${name}`, value: name }); }

  // Startup : accélérateur, levée de fonds (ce que l'entreprise dit d'elle-même)
  for (const [n, re] of ACCELERATORS) if (re.test(t)) { add({ type: "accelerateur", label: `Accompagnée par ${n} (d'après son site)`, value: n }); break; }
  const fm = t.match(FUNDING);
  if (fm) { const round = t.slice(Math.max(0, (fm.index ?? 0) - 120), (fm.index ?? 0) + 200).match(ROUND)?.[1]; add({ type: "levee", label: `A annoncé une levée de ${fm[1]} ${fm[2].replace(/\s/g, "")}${round ? ` (${round})` : ""} sur son site` }); }

  // Recrutement : page d'offres ou outil de recrutement relié au site
  let ats: [string, string] | null = null;
  for (const [n, re] of ATS) { const m = home.match(re); if (m) { ats = [n, m[1].toLowerCase()]; break; } }
  const roles = ats ? await openRoles(ats[0], ats[1]).catch(() => [] as string[]) : [];
  if (roles.length) add({ type: "recrutement", label: `Recrute : ${roles.slice(0, 2).join(", ")}${roles.length > 2 ? ` (+${roles.length - 2})` : ""}`, value: roles.join(" | ") });
  else if (ats || CAREERS_LINK.test(home)) add({ type: "recrutement", label: "Publie des offres d'emploi sur son site" });

  // Fraîcheur du contenu (plan du site) et visibilité pour les moteurs IA (robots.txt)
  const [sitemap, robots] = await Promise.all([fetchText(`${origin}/sitemap.xml`), fetchText(`${origin}/robots.txt`)]);
  const dates = [...sitemap.matchAll(/<lastmod>\s*(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]).sort();
  if (dates.length) {
    const newest = dates[dates.length - 1];
    const days = Math.floor((Date.now() - new Date(newest).getTime()) / 864e5);
    if (days > 365) add({ type: "site_inactif", label: `Site pas mis à jour depuis ${Math.floor(days / 30)} mois`, at: newest });
  }
  if (/user-agent:\s*(gptbot|claudebot|anthropic-ai|perplexitybot|google-extended)[\s\S]{0,80}?disallow:\s*\/\s*$/im.test(robots)) add({ type: "ia_bloquee", label: "Son site bloque les moteurs IA (ChatGPT, Claude…) : invisible dans leurs réponses" });

  return out;
}

/** Intitulés des postes ouverts, lus sur le flux public de l'outil de recrutement (1 requête). */
async function openRoles(kind: string, slug: string): Promise<string[]> {
  const get = async (u: string) => { const r = await fetch(u, { signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } }); return r.ok ? await r.json() : null; };
  if (kind === "greenhouse") return ((await get(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`))?.jobs ?? []).map((j: { title: string }) => j.title).slice(0, 10);
  if (kind === "lever") return ((await get(`https://api.lever.co/v0/postings/${slug}?mode=json`)) ?? []).map((j: { text: string }) => j.text).slice(0, 10);
  if (kind === "ashby") return ((await get(`https://api.ashbyhq.com/posting-api/job-board/${slug}`))?.jobs ?? []).map((j: { title: string }) => j.title).slice(0, 10);
  return [];
}

/** Libellés courts pour l'interface et le ciblage. */
export const SIGNAL_LABELS: Record<string, string> = {
  pub_google: "Pub Google", pub_meta: "Pub Facebook/Instagram", pub_linkedin: "Pub LinkedIn", techno: "Techno du site", sans_reservation: "Pas de RDV en ligne",
  sans_schema: "Référencement à améliorer", agence: "A une agence web", accelerateur: "Accélérateur", levee: "Levée de fonds", recrutement: "Recrute",
  site_inactif: "Site à l'abandon", ia_bloquee: "Invisible pour les IA", concurrent: "Utilise un concurrent",
};
