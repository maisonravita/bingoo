// Agent Détective : quand l'enquête rapide n'a rien donné, il creuse (site, annuaires officiels,
// groupe, documents publics), vérifie chaque adresse, appelle Dropcontact en dernier recours,
// puis choisit le meilleur canal si aucun e-mail n'existe (téléphone, LinkedIn, formulaire, courrier).
import { HttpError } from "./http.ts";
import { admin, ask, askJson, env, log, PLANS, type Prospect, type Workspace } from "./core.ts";
import { fetchHtml, textOf } from "./analyze.ts";

const EMAIL_IN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const BAD = /(example\.|sentry|wixpress|domain\.com|email\.com|votre|yourdomain|\.(png|jpe?g|gif|svg|webp)$|^(?:(?:rgpd|gdpr|privacy|dataprotection|data-protection|donnees-?personnelles|cnil)[a-z._-]*|dpo(?:[._-][a-z._-]*)?|noreply|no-reply|donotreply|webmaster|recrutement|jobs|rh|candidature|careers)@)/i;
// Dans le texte : chiffres groupés par deux avec séparateurs (01 23 45 67 89, +33 1 23 45 67 89), pour ne pas prendre un identifiant pour un numéro
const PHONE_RE = /(?<![\d])(?:\+33\s?[1-9]|0[1-9])(?:[\s.-]\d{2}){4}(?![\d])/g;
const WEB = (n: number) => [{ type: "web_search_20250305", name: "web_search", max_uses: n, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }];
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
const domOf = (e: string) => e.split("@")[1]?.toLowerCase() ?? "";

function decode(html: string) {
  return html
    // entités numériques (&#64; &#x40; …) : souvent utilisées pour cacher une adresse aux robots
    .replace(/&#(\d{2,5});/g, (_m, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]{2,4});/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&commat;/gi, "@").replace(/&period;/gi, ".")
    .replace(/\s*(?:\[at\]|\(at\)|\{at\}|\s+arobase\s+)\s*/gi, "@").replace(/\s*(?:\[dot\]|\(dot\)|\{dot\}|\s+point\s+)\s*/gi, ".").replace(/%40/g, "@");
}
/** Adresses protégées par Cloudflare (data-cfemail / email-protection#…) : décodées comme le ferait le navigateur. */
export function cloudflareEmails(html: string) {
  const out: string[] = [];
  for (const m of html.matchAll(/(?:data-cfemail=["']|email-protection#)([0-9a-f]{8,})/gi)) {
    const hex = m[1], key = parseInt(hex.slice(0, 2), 16);
    let e = "";
    for (let i = 2; i + 1 < hex.length; i += 2) e += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    if (EMAIL_RE.test(e)) out.push(e.toLowerCase());
  }
  return out;
}
/** L'adresse de l'agence qui a fait le site (« réalisé par », « création », « hébergé par »…) n'est pas celle du prospect. */
const AGENCY_CTX = /(r[ée]alis[ée]e?|con[çc]u|d[ée]velopp[ée]|cr[ée]ation|cr[ée][ée]\s+par|design|webdesign|agence\s+web|h[ée]berg|propuls[ée]|powered|made\s+by|site\s+(?:web\s+)?par)/i;
export function agencyEmail(html: string, email: string) {
  const t = html.toLowerCase();
  let i = t.indexOf(email);
  while (i >= 0) {
    if (AGENCY_CTX.test(t.slice(Math.max(0, i - 160), i))) return true;
    i = t.indexOf(email, i + 1);
  }
  return false;
}

/** Lit le site du prospect (accueil, contact, mentions légales) : e-mails, téléphones, formulaire. */
export async function siteContacts(site: string) {
  const origin = (() => { try { return new URL(site).origin; } catch { return ""; } })();
  if (!origin) return { emails: [] as string[], phones: [] as string[], form: "", home: "", origin: "" };
  const home = await fetchHtml(origin);
  const links = [...home.slice(0, 200_000).matchAll(/href=["']([^"'#]{1,200})["']/gi)].map((m) => m[1])
    .map((h) => { try { return new URL(h, origin).href; } catch { return ""; } })
    .filter((h) => h.startsWith(origin) && /(contact|mentions|legal|cgv|cgu|a-propos|qui-sommes|equipe|direction|informations)/i.test(h));
  const guesses = ["/contact", "/nous-contacter", "/contactez-nous", "/mentions-legales"].map((p) => origin + p);
  const pages = [...new Set([...links, ...guesses])].slice(0, 5);
  const htmls = await Promise.all(pages.map((u) => fetchHtml(u)));
  const all = [home, ...htmls];
  const emails = new Set<string>(); const phones = new Set<string>(); let form = "";
  all.forEach((h, i) => {
    const d = decode(h);
    for (const m of [...(d.match(EMAIL_IN) ?? []), ...cloudflareEmails(h)]) { const e = m.toLowerCase().replace(/^mailto:/, ""); if (EMAIL_RE.test(e) && !BAD.test(e) && !agencyEmail(d, e)) emails.add(e); }
    // Téléphones : liens « tel: » d'abord, puis le texte visible seulement (jamais le code des scripts, qui contient des suites de chiffres)
    for (const m of d.matchAll(/href=["']tel:([+\d\s().-]{8,20})["']/gi)) { const x = m[1].replace(/[^\d+]/g, ""); if (/^(\+33|0)[1-9]\d{8}$/.test(x.replace(/^\+330?/, "0").replace(/^0033/, "0"))) phones.add(m[1].trim()); }
    for (const m of textOf(d).match(PHONE_RE) ?? []) phones.add(m.replace(/[\s.-]/g, " ").trim());
    if (!form && i > 0 && /<form[\s\S]{0,6000}?<textarea/i.test(h)) form = pages[i - 1];
  });
  return { emails: [...emails], phones: [...phones].slice(0, 3), form, home, origin };
}

/** Le domaine reçoit-il du courrier ? */
async function mxOk(domain: string) {
  try { const r = await (await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`)).json(); return (r.Answer ?? []).length > 0; } catch { return false; }
}
/** L'adresse figure-t-elle vraiment sur la page citée ? (évite les adresses inventées) */
async function sourceHas(url: string, email: string) {
  if (!/^https?:\/\//.test(url)) return false;
  const raw = await fetchHtml(url);
  const h = decode(raw.toLowerCase());
  return h.includes(email.toLowerCase()) || cloudflareEmails(raw).includes(email.toLowerCase());
}
function pick(emails: string[], siteHost: string) {
  const score = (e: string) => (siteHost && domOf(e).endsWith(siteHost) ? 10 : 0) + (/^(direction|directeur|dir|contact|accueil|secretariat|info|bonjour|hello|commercial|achats?)[.@]/i.test(e) ? 3 : 0) + (/^[a-z]+\.[a-z]+@/i.test(e) ? 2 : 0);
  return [...emails].sort((a, b) => score(b) - score(a))[0] ?? "";
}

/** Trouve le site d'une entreprise sans payer de recherche : on essaie les adresses évidentes tirées de son nom
 *  (nom.fr, nom.com…) et on ne garde un site que s'il porte son SIREN, ou son nom et son code postal. Jamais de devinette non vérifiée. */
const LEGAL = /\b(sas|sasu|sarl|eurl|sa|sci|snc|selarl|ets|etablissements?|societe|groupe|france)\b/g;
export function slugs(name: string, city: string) {
  const base = String(name ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " et ").replace(/[^a-z0-9 ]+/g, " ").replace(LEGAL, " ").replace(/\s+/g, " ").trim();
  if (base.length < 3) return [];
  const words = base.split(" ").filter(Boolean);
  const c = String(city ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  const out = new Set([words.join(""), words.join("-")]);
  if (c) out.add(`${words.join("-")}-${c}`);
  return [...out].filter((x) => x.length >= 3 && x.length <= 40);
}
async function resolves(host: string) {
  try { const r = await (await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`, { signal: AbortSignal.timeout(5000) })).json(); return (r.Answer ?? []).length > 0; } catch { return false; }
}
export async function findSite(p: { name?: string; org?: string; siret?: string | null; postal_code?: string | null; city?: string | null }) {
  const siren = String(p.siret ?? "").replace(/\D/g, "").slice(0, 9);
  // « Luxia (hôtel boutique) », « Hôtel X – Autograph Collection », « Bureaux Y - Sigle Z » : on essaie le nom court et les sigles entre parenthèses
  const variants = (n: string) => [n.replace(/\([^)]*\)/g, " ").split(/\s[-–|,]\s|,/)[0], ...[...n.matchAll(/\(([^)]{3,30})\)/g)].map((m) => m[1]), n.replace(/^(h[oô]tel|restaurant|cabinet|clinique|institut|centre)\s+/i, "")].map((x) => x.trim()).filter((x) => x.length >= 3);
  const names = [...new Set([p.org, p.name].filter(Boolean).flatMap((n) => [n as string, ...variants(n as string)]))];
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ");
  const bases = [...new Set(names.flatMap((n) => slugs(n, p.city ?? "")))].slice(0, 6);
  const until = Date.now() + 30_000; // 30 s au plus par entreprise : un site lent ne bloque pas les autres
  // D'abord .fr et .com (la grande majorité), puis les autres extensions ; requêtes DNS par petits paquets pour ne pas être freiné
  for (const tlds of [[".fr", ".com"], [".net", ".eu", ".org", ".io", ".co"]]) {
    const hosts = bases.flatMap((b) => tlds.map((t) => b + t));
    const live: string[] = [];
    for (let i = 0; i < hosts.length && Date.now() < until; i += 6) {
      live.push(...(await Promise.all(hosts.slice(i, i + 6).map(async (h) => (await resolves(h)) ? h : (await resolves(`www.${h}`)) ? `www.${h}` : ""))).filter(Boolean));
    }
    for (const h of live) {
      if (Date.now() > until) return "";
      const origin = `https://${h}`;
      // Accueil d'abord, puis les pages légales qu'il cite vraiment (/legal, /mentions-legales.html, /cgu…), sinon les adresses habituelles
      const home = await fetchHtml(origin).catch(() => "");
      const legal = [...home.slice(0, 300_000).matchAll(/href=["']([^"'#]{1,200})["']/gi)].map((m) => { try { return new URL(m[1], origin).href; } catch { return ""; } })
        .filter((u) => u && hostOf(u) === hostOf(origin) && /(mentions|legal|l%C3%A9gal|cgu|cgv|imprint|a-propos|qui-sommes)/i.test(u));
      const more = [...new Set([...legal, `${origin}/mentions-legales`, `${origin}/mentions-legales/`])].slice(0, 3);
      const pages = [home, ...(await Promise.all(more.map((u) => fetchHtml(u).catch(() => ""))))];
      const txt = norm(pages.map((x) => textOf(x)).join(" ")).replace(/(\d) (?=\d)/g, "$1");
      const sirenOk = siren.length === 9 && txt.includes(siren);
      const nameOk = names.some((n) => { const k = norm(n).replace(LEGAL, " ").trim(); return k.length >= 4 && txt.includes(k); });
      const cpOk = !!p.postal_code && txt.includes(String(p.postal_code));
      if (sirenOk || (nameOk && cpOk)) return origin;
    }
  }
  return "";
}

/** Passe gratuite, sans IA : retrouve le site par le nom puis lit ses pages (accueil, contact, mentions légales).
 *  On ne garde qu'un e-mail publié sur le site, dont le domaine reçoit du courrier. Jamais d'adresse devinée. */
export async function freeEnrich(p: P2, save = true) {
  let site = p.website || "", foundSite = false;
  if (!site) { site = await findSite(p).catch(() => ""); foundSite = !!site; }
  let email = "", phone = "", form = "";
  if (site) {
    const sc = await siteContacts(site).catch(() => ({ emails: [] as string[], phones: [] as string[], form: "" }));
    const cand = pick(sc.emails, hostOf(site));
    if (cand && await mxOk(domOf(cand))) email = cand;
    phone = sc.phones[0] ?? ""; form = sc.form ?? "";
  }
  if (save) {
    const day = new Date().toISOString().slice(0, 10);
    const patch: Record<string, unknown> = {};
    if (foundSite) patch.website = site;
    if (phone && !p.phone) patch.phone = phone.slice(0, 30);
    if (form && !p.contact_form) patch.contact_form = form;
    if (email) Object.assign(patch, { email, email_source: `site ${hostOf(site)}`, enriched_at: new Date().toISOString(), enrich_level: 1, status: ["sans_email", "nouveau"].includes(p.status) ? "pret" : p.status,
      enrich_note: `E-mail trouvé sur son site (${hostOf(site)}), recherche gratuite du ${day}` });
    else patch.enrich_note = `Recherche gratuite du ${day} : ${site ? `site ${hostOf(site)} lu, pas d'e-mail publié` : "site introuvable par son nom"}`;
    patch.channel = chooseChannel({ ...p, ...patch } as P2);
    await admin.from("prospects").update(patch).eq("id", p.id);
  }
  return { site, foundSite, email, phone };
}

// ---------------------------------------------------------------- Crédits (e-mails trouvés par Dropcontact)
export async function credits(ws: Workspace) {
  const since = new Date(); since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);
  const { count } = await admin.from("activity").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("kind", "credit_email").gte("created_at", since.toISOString());
  const total = PLANS[ws.plan ?? "essai"]?.credits ?? 300;
  return { used: count ?? 0, total, left: Math.max(0, total - (count ?? 0)), dropcontact: !!env("DROPCONTACT_API_KEY") };
}

// ---------------------------------------------------------------- Dropcontact (paie seulement si trouvé)
const DC = "https://api.dropcontact.com/v1/enrich/all";
function dcHeaders(key: string) { return { "X-Access-Token": key, "Content-Type": "application/json", Accept: "application/json" }; }

async function dcSubmit(p: Prospect, person: string) {
  const key = env("DROPCONTACT_API_KEY");
  const parts = person.trim().split(/\s+/);
  if (!key || parts.length < 2) return null;
  const row: Record<string, string> = { first_name: parts[0], last_name: parts.slice(1).join(" "), company: p.org || p.name, custom_fields: p.id } as Record<string, string>;
  if (p.website) row.website = p.website;
  const r = await fetch(DC, { method: "POST", headers: dcHeaders(key), body: JSON.stringify({ data: [row], siren: true, language: "fr" }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error || !d.request_id) { console.error("dropcontact submit", r.status, JSON.stringify(d).slice(0, 300)); return null; }
  return String(d.request_id);
}
async function dcResult(reqId: string): Promise<{ ready: boolean; email: string; phone: string }> {
  const key = env("DROPCONTACT_API_KEY");
  const r = await fetch(`${DC}/${encodeURIComponent(reqId)}`, { headers: dcHeaders(key) });
  const d = await r.json().catch(() => ({}));
  if (!d.success) return { ready: false, email: "", phone: "" };
  const row = (d.data ?? [])[0] ?? {};
  const list = (Array.isArray(row.email) ? row.email : []) as { email: string; qualification?: string }[];
  const good = list.find((x) => /nominative@pro/i.test(x.qualification ?? "")) ?? list.find((x) => /@pro/i.test(x.qualification ?? ""));
  return { ready: true, email: good?.email?.toLowerCase() ?? "", phone: String(row.phone ?? row.mobile_phone ?? "") };
}

async function applyDropcontact(ws: Workspace, p: Prospect, res: { email: string; phone: string }) {
  const patch: Record<string, unknown> = { dropcontact_req: null };
  if (res.email && EMAIL_RE.test(res.email) && !BAD.test(res.email)) {
    Object.assign(patch, { email: res.email, status: p.status === "sans_email" ? "pret" : p.status, channel: "email", email_source: "Dropcontact (adresse vérifiée)" });
    await log(ws.id, "credit_email", `${p.name} : e-mail trouvé par Dropcontact`);
  } else {
    patch.channel = chooseChannel({ ...p, ...patch } as Prospect);
  }
  if (res.phone && !p.phone) patch.phone = res.phone.slice(0, 30);
  await admin.from("prospects").update(patch).eq("id", p.id);
  return patch;
}

/** Récupère les résultats Dropcontact en attente. */
export async function dropcontactPending(ws: Workspace) {
  if (!env("DROPCONTACT_API_KEY")) return 0;
  const { data } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).not("dropcontact_req", "is", null).limit(10);
  let n = 0;
  for (const p of data ?? []) {
    const r = await dcResult(p.dropcontact_req).catch(() => ({ ready: false, email: "", phone: "" }));
    if (r.ready) { await applyDropcontact(ws, p as Prospect, r); n++; }
  }
  return n;
}

// ---------------------------------------------------------------- Canal recommandé
type P2 = Prospect & { contact_form?: string; linkedin_url?: string; channel?: string };
export function chooseChannel(p: P2) {
  if (p.email) return "email";
  if (p.phone) return "telephone";
  if (p.linkedin_url) return "linkedin";
  if (p.contact_form) return "formulaire";
  if (p.address || p.postal_code) return "courrier";
  return "";
}

// ---------------------------------------------------------------- Enquête approfondie
export async function deepEnrich(ws: Workspace, p: P2, interlocuteur: string, wait = true) {
  const steps: string[] = [];
  let email = "", source = "", phone = p.phone || "", form = p.contact_form || "", site = p.website || "";
  let person = p.contact_name || "", role = p.contact_role || "";

  // Palier 1 : site inconnu → on essaie les adresses évidentes, vérifiées par SIREN ou nom + code postal (gratuit)
  if (!site) {
    site = await findSite(p).catch(() => "");
    steps.push(site ? `site trouvé : ${hostOf(site)}` : "site introuvable par son nom");
  }

  // Palier 2 : lecture directe du site
  if (site) {
    const sc = await siteContacts(site).catch(() => ({ emails: [], phones: [], form: "" }));
    email = pick(sc.emails, hostOf(site)); if (email) source = `site ${hostOf(site)}`;
    if (!phone && sc.phones[0]) phone = sc.phones[0];
    if (!form && sc.form) form = sc.form;
    steps.push(email ? "e-mail trouvé sur son site" : "site lu, pas d'e-mail");
  }

  // Palier 3 : enquête web approfondie
  if (!email) {
    type F = { email?: string; source?: string; site?: string; telephone?: string; formulaire?: string; decideur?: string; fonction?: string; linkedin?: string; groupe?: string; note?: string };
    const v = await askJson<F>(`Enquête approfondie : l'enquête rapide n'a trouvé aucun e-mail pour cet établissement. Creuse davantage.
Établissement : ${p.name}${p.org ? ` (raison sociale ${p.org})` : ""}, ${p.activity}
Adresse : ${[p.address, p.postal_code, p.city].filter(Boolean).join(" ")}${p.siret ? ` · SIRET ${p.siret}` : ""}
${site ? `Site : ${site}` : "Site inconnu : trouve-le."}
${person ? `Dirigeant connu : ${person}${role ? ` (${role})` : ""}` : ""}
Interlocuteur recherché : ${interlocuteur || "dirigeant ou responsable"}

Cherche dans cet ordre (6 recherches maximum) :
1. Les annuaires officiels du secteur (ex. FINESS / sanitaire-social.com pour EHPAD, cliniques, crèches ; annuaire de l'Éducation nationale ; ordres professionnels ; CCI ; annuaire des mairies ; Pages Jaunes).
2. Le site du groupe ou du gestionnaire si l'établissement appartient à un réseau (contact régional, achats).
3. Les documents publics : PDF, rapports, appels d'offres, comptes rendus, presse locale, page Facebook ou fiche Google.
4. Le nom et la fonction du décideur sur place, et son profil LinkedIn public.
Règles : ne donne un e-mail que s'il est publié tel quel sur la page \"source\" (URL exacte). Jamais d'adresse reconstruite. Si rien n'est publié, laisse vide.
Format : {"email": "", "source": "URL exacte où l'e-mail apparaît", "site": "", "telephone": "", "formulaire": "URL du formulaire de contact", "decideur": "Prénom Nom", "fonction": "", "linkedin": "", "groupe": "", "note": "une phrase"}`,
      { fast: true, maxTokens: 8000, tools: WEB(6), system: "Tu es un enquêteur commercial B2B en France, rigoureux. Tu ne donnes que des coordonnées publiées et vérifiables, avec l'URL exacte." });
    const cand = String(v.email ?? "").trim().toLowerCase().replace(/^mailto:/, "");
    if (!site && /^https?:\/\//.test(v.site ?? "")) site = String(v.site).slice(0, 300);
    if (EMAIL_RE.test(cand) && !BAD.test(cand) && await mxOk(domOf(cand))) {
      const sameDomain = !!site && domOf(cand).endsWith(hostOf(site));
      if (sameDomain || await sourceHas(String(v.source ?? ""), cand)) { email = cand; source = String(v.source ?? "").slice(0, 200) || "recherche web"; }
      else steps.push("adresse proposée mais introuvable sur la page citée, écartée");
    }
    if (!phone && v.telephone) phone = String(v.telephone).replace(/[^\d+ .]/g, "").trim().slice(0, 30);
    if (!form && /^https?:\/\//.test(v.formulaire ?? "")) form = String(v.formulaire).slice(0, 300);
    const dec = String(v.decideur ?? "").trim();
    if (dec && dec.length < 60 && /\s/.test(dec)) { person = dec; role = String(v.fonction ?? "").slice(0, 80) || role; }
    if (/linkedin\.com\/in\//i.test(v.linkedin ?? "") && !p.linkedin_url) (p as P2).linkedin_url = String(v.linkedin).replace(/[?#].*$/, "").slice(0, 200);
    steps.push(email ? "e-mail trouvé par l'enquête web" : "enquête web : aucun e-mail publié");
    if (v.groupe) steps.push(`groupe : ${String(v.groupe).slice(0, 80)}`);
  }

  // Palier 4 : Dropcontact (e-mail nominatif vérifié), seulement si on a un nom
  let dcReq: string | null = null;
  if (!email && person && env("DROPCONTACT_API_KEY")) {
    const c = await credits(ws);
    if (c.left > 0) {
      dcReq = await dcSubmit({ ...p, website: site } as Prospect, person);
      if (dcReq) {
        steps.push(`Dropcontact interrogé pour ${person}`);
        for (let i = 0; wait && i < 3 && dcReq; i++) {
          await new Promise((r) => setTimeout(r, 12000));
          const r = await dcResult(dcReq).catch(() => ({ ready: false, email: "", phone: "" }));
          if (r.ready) { dcReq = null; if (r.email) { email = r.email; source = "Dropcontact (adresse vérifiée)"; await log(ws.id, "credit_email", `${p.name} : e-mail trouvé par Dropcontact`); } if (!phone && r.phone) phone = r.phone.slice(0, 30); }
        }
        if (dcReq) steps.push("résultat Dropcontact en attente");
      }
    } else steps.push("crédits Dropcontact du mois épuisés");
  }

  const patch: Record<string, unknown> = {
    enrich_level: 2, enriched_at: new Date().toISOString(), dropcontact_req: dcReq,
    enrich_note: steps.join(" · ").slice(0, 600), contact_form: form,
  };
  if (site && !p.website) patch.website = site;
  if (phone && !p.phone) patch.phone = phone;
  if (person && person !== p.contact_name) { patch.contact_name = person; patch.contact_role = role; }
  if ((p as P2).linkedin_url && !(await admin.from("prospects").select("linkedin_url").eq("id", p.id).single()).data?.linkedin_url) patch.linkedin_url = (p as P2).linkedin_url;
  if (email) Object.assign(patch, { email, email_source: source, status: ["sans_email", "nouveau"].includes(p.status) ? "pret" : p.status });
  patch.channel = chooseChannel({ ...p, ...patch } as P2);
  await admin.from("prospects").update(patch).eq("id", p.id);
  return { id: p.id, email, channel: patch.channel as string, pending: !!dcReq, steps };
}

// ---------------------------------------------------------------- Courrier / formulaire
export async function letter(ws: Workspace, p: P2, kind: "courrier" | "formulaire") {
  const t = (ws.targets ?? []).find((x) => x.id === p.target);
  const pr = ws.profile ?? {};
  const out = await ask(kind === "courrier"
    ? `Rédige une lettre de prospection postale de ${ws.sender_name || "la direction"} (${pr.nom || ws.name}) à ${p.contact_name ? `${p.contact_name}${p.contact_role ? `, ${p.contact_role}` : ""}` : `la direction (${t?.interlocuteur || "responsable"})`} de ${p.name}, ${p.city}.
Offre : ${pr.offre ?? ""}. Argument : ${t?.angle ?? ""}. Bénéficiaires : ${t?.pour_qui ?? ""}. Faits utilisables : ${(pr.preuves ?? []).join(" ; ") || "aucun"}.
Lettre de 140 à 190 mots, vouvoiement, formule d'appel adaptée, un paragraphe d'accroche lié à leur activité, un paragraphe de valeur, une proposition d'échange de 20 minutes avec les coordonnées (${ws.sender_email}${ws.postal_address ? `, ${ws.postal_address}` : ""}), formule de politesse sobre, signature « ${ws.sender_name} ». N'invente aucun fait. Pas de prix. Texte seul, sans en-tête d'adresse.`
    : `Rédige le message à coller dans le formulaire de contact du site de ${p.name} (${p.activity}, ${p.city}), de la part de ${ws.sender_name} (${pr.nom || ws.name}).
Offre : ${pr.offre ?? ""}. Argument : ${t?.angle ?? ""}. Demande de transmettre à : ${t?.interlocuteur || "la direction"}.
60 à 90 mots, vouvoiement, une question finale pour un échange de 15 minutes, termine par le nom, l'e-mail ${ws.sender_email} et la fonction. N'invente rien. Pas de prix. Texte seul.`,
    { fast: true, maxTokens: 1500 });
  await admin.from("prospects").update({ letter: out.slice(0, 4000) }).eq("id", p.id);
  return { text: out };
}

export function assertKind(k: unknown): "courrier" | "formulaire" {
  if (k === "courrier" || k === "formulaire") return k;
  throw new HttpError(400, "Type de message inconnu");
}
