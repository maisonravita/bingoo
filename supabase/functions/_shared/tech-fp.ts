// Empreintes techniques des outils (scripts, domaines chargés par la page) et des pages carrières (logiciels de recrutement).
// Repérage sans IA, à partir du code HTML de la page d'accueil.

export type Fp = { name: string; cat: string; re: RegExp };
export const CAT_LABEL: Record<string, string> = {
  crm: "CRM", marketing: "marketing automation / e-mailing", chat: "chat en ligne", support: "service client", paiement: "paiement",
  analytics: "mesure d'audience", ab: "tests A/B et personnalisation", cms: "site web", ecommerce: "boutique en ligne", rdv: "prise de rendez-vous",
  rh: "recrutement", signature: "signature électronique", avis: "avis clients", consentement: "gestion des cookies", pub: "publicité", formulaire: "formulaires", prospection: "prospection",
};

export const FP: Fp[] = [
  // CRM et vente
  { name: "HubSpot", cat: "crm", re: /js\.hs-scripts\.com|js\.hsforms\.net|js\.hs-analytics\.net|hs-banner\.com|js\.usemessages\.com/i },
  { name: "Salesforce", cat: "crm", re: /force\.com|salesforce\.com\/|pardot\.com|pi\.pardot|salesforceliveagent/i },
  { name: "Pipedrive", cat: "crm", re: /leadbooster-chat\.pipedrive|webforms\.pipedrive|pipedrivewebforms/i },
  { name: "Zoho", cat: "crm", re: /zohopublic|salesiq\.zoho|zohocdn|crm\.zoho/i },
  { name: "Axonaut", cat: "crm", re: /axonaut\.com/i },
  { name: "Sellsy", cat: "crm", re: /sellsy\.com/i },
  { name: "Microsoft Dynamics", cat: "crm", re: /dynamics\.com|mktdplp|clickdimensions/i },
  { name: "Lemlist", cat: "prospection", re: /lemlist\.com|lemlist\b/i },
  { name: "Waalaxy", cat: "prospection", re: /waalaxy/i },
  // Marketing / e-mailing
  { name: "Brevo", cat: "marketing", re: /sibforms\.com|sendinblue|brevo\.com|sibautomation/i },
  { name: "Mailchimp", cat: "marketing", re: /chimpstatic\.com|list-manage\.com|mailchimp/i },
  { name: "ActiveCampaign", cat: "marketing", re: /activehosted\.com|trackcmp\.net|activecampaign/i },
  { name: "Klaviyo", cat: "marketing", re: /klaviyo\.com/i },
  { name: "Marketo", cat: "marketing", re: /munchkin\.marketo|mktoforms|marketo\.com/i },
  { name: "Plezi", cat: "marketing", re: /plezi\.co/i },
  { name: "Webmecanik", cat: "marketing", re: /webmecanik|mautic/i },
  { name: "Mailjet", cat: "marketing", re: /mailjet\.com/i },
  { name: "Customer.io", cat: "marketing", re: /customer\.io|customerioforms/i },
  // Chat et service client
  { name: "Intercom", cat: "chat", re: /widget\.intercom\.io|js\.intercomcdn\.com|intercomSettings/i },
  { name: "Crisp", cat: "chat", re: /client\.crisp\.chat|CRISP_WEBSITE_ID/i },
  { name: "Drift", cat: "chat", re: /js\.driftt\.com|drift\.com\/include/i },
  { name: "LiveChat", cat: "chat", re: /cdn\.livechatinc\.com/i },
  { name: "Tawk.to", cat: "chat", re: /embed\.tawk\.to/i },
  { name: "iAdvize", cat: "chat", re: /iadvize\.com/i },
  { name: "Tidio", cat: "chat", re: /code\.tidio\.co/i },
  { name: "Zendesk", cat: "support", re: /static\.zdassets\.com|zendesk\.com|zopim/i },
  { name: "Freshdesk", cat: "support", re: /freshdesk|freshchat|freshworks|fw-cdn\.com/i },
  { name: "Gorgias", cat: "support", re: /gorgias\.(?:chat|io)/i },
  { name: "Axeptio", cat: "consentement", re: /axept\.io|axeptio/i },
  { name: "Didomi", cat: "consentement", re: /sdk\.privacy-center\.org|didomi/i },
  { name: "OneTrust", cat: "consentement", re: /cdn\.cookielaw\.org|onetrust/i },
  { name: "Cookiebot", cat: "consentement", re: /consent\.cookiebot\.com/i },
  { name: "Tarteaucitron", cat: "consentement", re: /tarteaucitron/i },
  // Paiement
  { name: "Stripe", cat: "paiement", re: /js\.stripe\.com|checkout\.stripe\.com|buy\.stripe\.com/i },
  { name: "PayPal", cat: "paiement", re: /paypal\.com\/sdk|paypalobjects\.com/i },
  { name: "Mollie", cat: "paiement", re: /js\.mollie\.com/i },
  { name: "PayPlug", cat: "paiement", re: /payplug/i },
  { name: "Adyen", cat: "paiement", re: /adyen\.com/i },
  { name: "Lyra / PayZen", cat: "paiement", re: /lyra\.com|payzen\.eu|systempay/i },
  { name: "GoCardless", cat: "paiement", re: /gocardless/i },
  { name: "Alma", cat: "paiement", re: /getalma\.eu|alma-widget/i },
  // Mesure et A/B
  { name: "Google Analytics", cat: "analytics", re: /googletagmanager\.com\/gtag\/js\?id=G-|google-analytics\.com\/analytics\.js/i },
  { name: "Google Tag Manager", cat: "analytics", re: /googletagmanager\.com\/gtm\.js/i },
  { name: "Matomo", cat: "analytics", re: /matomo\.(?:js|php|cloud)|piwik\.js/i },
  { name: "Plausible", cat: "analytics", re: /plausible\.io\/js/i },
  { name: "Segment", cat: "analytics", re: /cdn\.segment\.com|analytics\.js\/v1/i },
  { name: "Mixpanel", cat: "analytics", re: /cdn\.mxpnl\.com|mixpanel/i },
  { name: "Amplitude", cat: "analytics", re: /cdn\.amplitude\.com|amplitude\.com\/libs/i },
  { name: "Hotjar", cat: "analytics", re: /static\.hotjar\.com|hotjar/i },
  { name: "Contentsquare", cat: "analytics", re: /contentsquare\.net|t\.contentsquare/i },
  { name: "AB Tasty", cat: "ab", re: /abtasty\.com/i },
  { name: "Kameleoon", cat: "ab", re: /kameleoon/i },
  // Publicité
  { name: "Google Ads", cat: "pub", re: /googleadservices\.com|gtag\/js\?id=AW-/i },
  { name: "Meta Pixel", cat: "pub", re: /connect\.facebook\.net\/[^"']*fbevents|fbq\(/i },
  { name: "LinkedIn Insight", cat: "pub", re: /snap\.licdn\.com/i },
  { name: "TikTok Pixel", cat: "pub", re: /analytics\.tiktok\.com/i },
  // Site et boutique
  { name: "WordPress", cat: "cms", re: /wp-content\/|wp-includes\//i },
  { name: "Webflow", cat: "cms", re: /webflow\.com|wf-page|assets\.website-files\.com/i },
  { name: "Wix", cat: "cms", re: /static\.wixstatic\.com|wix\.com/i },
  { name: "Squarespace", cat: "cms", re: /squarespace\.com|static1\.squarespace/i },
  { name: "Framer", cat: "cms", re: /framerusercontent\.com|framer\.com\/m\//i },
  { name: "Shopify", cat: "ecommerce", re: /cdn\.shopify\.com|myshopify\.com/i },
  { name: "PrestaShop", cat: "ecommerce", re: /prestashop/i },
  { name: "WooCommerce", cat: "ecommerce", re: /woocommerce/i },
  { name: "Magento", cat: "ecommerce", re: /mage\/cookies|magento/i },
  // Rendez-vous, formulaires, signature, avis
  { name: "Calendly", cat: "rdv", re: /assets\.calendly\.com|calendly\.com\//i },
  { name: "HubSpot Meetings", cat: "rdv", re: /meetings\.hubspot\.com/i },
  { name: "Doctolib", cat: "rdv", re: /doctolib\.fr/i },
  { name: "Typeform", cat: "formulaire", re: /embed\.typeform\.com|typeform\.com\/to\//i },
  { name: "Tally", cat: "formulaire", re: /tally\.so/i },
  { name: "Yousign", cat: "signature", re: /yousign/i },
  { name: "DocuSign", cat: "signature", re: /docusign/i },
  { name: "Trustpilot", cat: "avis", re: /widget\.trustpilot\.com/i },
  { name: "Avis Vérifiés", cat: "avis", re: /cl\.avis-verifies\.com|avis-verifies/i },
  { name: "Guest Suite", cat: "avis", re: /guest-suite/i },
  // Recrutement
  { name: "Welcome to the Jungle", cat: "rh", re: /welcometothejungle\.com/i },
  { name: "Teamtailor", cat: "rh", re: /teamtailor\.com/i },
  { name: "Recruitee", cat: "rh", re: /recruitee\.com/i },
  { name: "Lever", cat: "rh", re: /jobs\.(?:eu\.)?lever\.co/i },
  { name: "Greenhouse", cat: "rh", re: /greenhouse\.io/i },
  { name: "Workable", cat: "rh", re: /workable\.com/i },
  { name: "Ashby", cat: "rh", re: /ashbyhq\.com/i },
  { name: "Flatchr", cat: "rh", re: /flatchr\.io/i },
  { name: "Taleez", cat: "rh", re: /taleez\.com/i },
  { name: "Jobaffinity", cat: "rh", re: /jobaffinity\.fr/i },
];

/** Outils installés sur une page (dans le code). */
export const toolsIn = (html: string) => html ? FP.filter((f) => f.re.test(html)).map((f) => f.name) : [];

/** Outils cités en toutes lettres dans un texte (offre d'emploi : « maîtrise de Salesforce »). */
export function toolsNamed(text: string) {
  const t = ` ${text} `;
  return FP.filter((f) => !["cms", "analytics", "pub", "consentement", "rh"].includes(f.cat) && f.name.length > 3 && new RegExp(`[^\\p{L}]${f.name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}[^\\p{L}]`, "iu").test(t)).map((f) => f.name);
}

export const catOf = (tool: string) => FP.find((f) => f.name === tool)?.cat ?? "";

// ---------------------------------------------------------------- Pages carrières
export type Ats = "greenhouse" | "lever" | "ashby" | "recruitee" | "workable" | "teamtailor" | "wttj";
const ATS_RE: [Ats, RegExp][] = [
  ["greenhouse", /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)/i],
  ["lever", /jobs\.(?:eu\.)?lever\.co\/([a-z0-9_.-]+)/i],
  ["ashby", /jobs\.ashbyhq\.com\/([A-Za-z0-9_.%-]+)/i],
  ["recruitee", /\/\/([a-z0-9-]+)\.recruitee\.com/i],
  ["workable", /apply\.workable\.com\/([a-z0-9_-]+)/i],
  ["teamtailor", /\/\/([a-z0-9-]+)\.teamtailor\.com/i],
  ["wttj", /welcometothejungle\.com\/(?:fr|en)\/companies\/([a-z0-9_-]+)/i],
];
const BAD_SLUG = /^(embed|api|jobs?|static|assets|www|app|careers?|cdn|widget|js|v\d|companies)$/i;

/** Logiciel de recrutement utilisé et identifiant public de l'entreprise, repérés dans les liens de la page. */
export function atsIn(html: string): { ats: Ats; slug: string } | null {
  for (const [ats, re] of ATS_RE) {
    const m = html.match(re);
    if (m?.[1] && !BAD_SLUG.test(m[1])) return { ats, slug: decodeURIComponent(m[1]).replace(/[^A-Za-z0-9_.-]/g, "") };
  }
  return null;
}

/** Lien vers la page carrières du site (même domaine). */
export function careersLink(html: string, base: string): string | null {
  const re = /href=["']([^"'#]+)["'][^>]*>([^<]{0,60})</gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1], label = m[2];
    if (/(carri[eè]res?|careers?|\bjobs?\b|recrutement|recrute|rejoign|nous-rejoindre|join-?us|emplois?|offres-d-emploi|work-with-us)/i.test(`${href} ${label}`)) {
      try { const u = new URL(href, base); if (/^https?:$/.test(u.protocol)) return u.toString(); } catch { /* lien invalide */ }
    }
  }
  return null;
}

export type Job = { title: string; url: string; date: string | null; place: string; text: string };
const strip = (h: string) => String(h ?? "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const isoDay = (v: unknown) => { if (v == null || v === "") return null; const d = new Date(typeof v === "number" ? v : String(v)); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); };

async function getJ(u: string) {
  const r = await fetch(u, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(12000) }).catch(() => null);
  return r?.ok ? await r.json().catch(() => null) : null;
}
async function getT(u: string) {
  const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (compatible; BingooRadar/1.0)" }, signal: AbortSignal.timeout(12000) }).catch(() => null);
  return r?.ok ? await r.text().catch(() => "") : "";
}

/** Offres d'emploi publiées par l'entreprise sur son logiciel de recrutement (listes publiques prévues pour être affichées sur les sites). */
export async function jobsOf(ats: Ats, slug: string): Promise<Job[] | null> {
  // deno-lint-ignore no-explicit-any
  type A = any;
  if (ats === "greenhouse") {
    const d = await getJ(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
    return d ? (d.jobs ?? []).map((j: A) => ({ title: j.title, url: j.absolute_url, date: isoDay(j.first_published ?? j.updated_at), place: j.location?.name ?? "", text: strip(j.content).slice(0, 4000) })) : null;
  }
  if (ats === "lever") {
    const d = (await getJ(`https://api.lever.co/v0/postings/${slug}?mode=json`)) ?? (await getJ(`https://api.eu.lever.co/v0/postings/${slug}?mode=json`));
    return Array.isArray(d) ? d.map((j: A) => ({ title: j.text, url: j.hostedUrl, date: isoDay(j.createdAt), place: j.categories?.location ?? "", text: String(j.descriptionPlain ?? "").slice(0, 4000) })) : null;
  }
  if (ats === "ashby") {
    const d = await getJ(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
    return d ? (d.jobs ?? []).filter((j: A) => j.isListed !== false).map((j: A) => ({ title: j.title, url: j.jobUrl, date: isoDay(j.publishedAt), place: j.location ?? "", text: String(j.descriptionPlain ?? "").slice(0, 4000) })) : null;
  }
  if (ats === "recruitee") {
    const d = await getJ(`https://${slug}.recruitee.com/api/offers/`);
    return d ? (d.offers ?? []).map((j: A) => ({ title: j.title, url: j.careers_url, date: isoDay(j.published_at ?? j.created_at), place: j.location ?? j.city ?? "", text: strip(`${j.description ?? ""} ${j.requirements ?? ""}`).slice(0, 4000) })) : null;
  }
  if (ats === "workable") {
    const d = await getJ(`https://apply.workable.com/api/v1/widget/accounts/${slug}`);
    return d ? (d.jobs ?? []).map((j: A) => ({ title: j.title, url: j.url ?? j.shortlink, date: isoDay(j.published_on ?? j.created_at), place: [j.city, j.country].filter(Boolean).join(", "), text: "" })) : null;
  }
  if (ats === "teamtailor") {
    const x = await getT(`https://${slug}.teamtailor.com/jobs.rss`);
    if (!x) return null;
    return [...x.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
      const g = (t: string) => strip((m[1].match(new RegExp(`<${t}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`)) ?? [])[1] ?? "");
      return { title: g("title"), url: g("link"), date: isoDay(g("pubDate")), place: "", text: g("description").slice(0, 4000) };
    });
  }
  if (ats === "wttj") {
    const x = await getT(`https://www.welcometothejungle.com/fr/companies/${slug}/jobs`);
    if (!x) return null;
    const seen = new Set<string>();
    return [...x.matchAll(new RegExp(`/fr/companies/${slug}/jobs/([a-z0-9-]+)(?:_([a-z0-9-]+))?`, "gi"))].filter((m) => !seen.has(m[1]) && seen.add(m[1])).map((m) => ({
      title: m[1].replace(/-/g, " ").replace(/\b(h f|f h|m f|f m)\b/g, "").trim().replace(/^./, (c) => c.toUpperCase()), url: `https://www.welcometothejungle.com${m[0]}`, date: null, place: (m[2] ?? "").replace(/-/g, " "), text: "",
    }));
  }
  return null;
}

const GENERIC = new Set(["responsable", "manager", "charge", "chargee", "senior", "junior", "stagiaire", "stage", "alternance", "alternant", "assistant", "assistante", "directeur", "directrice", "head", "lead", "chef", "global", "france", "paris", "chief", "officer", "specialist", "associate", "executive"]);
const n = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Le poste correspond-il à un des postes « signal » ? (mots significatifs du poste présents dans l'intitulé) */
export function roleMatch(title: string, postes: string[]) {
  const t = ` ${n(title)} `;
  return postes.find((p) => {
    const w = n(p).split(" ").filter((x) => x.length > 2 && !GENERIC.has(x));
    if (!w.length) return t.includes(` ${n(p)} `);
    return w.every((x) => t.includes(` ${x}`)) || (w.length > 1 && t.includes(` ${w.join(" ")} `));
  }) ?? null;
}
