// Chercheur de contacts (type Waalaxy) : trouver les bons décideurs d'une entreprise par fonction,
// puis leur e-mail via une cascade de fournisseurs. Jamais d'adresse devinée sans vérification.
import { HttpError } from "./http.ts";
import { admin, askJson, env, log, type Workspace } from "./core.ts";

type Person = { nom: string; fonction: string; linkedin: string; source: string; email?: string; depuis?: string; parcours?: string; ville?: string };
export type ContactRow = { id: string; prospect_id: string; name: string; role: string; linkedin_url: string; email: string; email_status: string; email_source: string; provider_req: Record<string, string> };

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const WEB = (n: number) => [{ type: "web_search_20250305", name: "web_search", max_uses: n, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }];
const hostOf = (u: string) => { try { return new URL(/^https?:/.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
const split = (n: string) => { const p = n.trim().split(/\s+/); return { first: p[0] ?? "", last: p.slice(1).join(" ") }; };

/** Fournisseurs d'e-mails disponibles, dans l'ordre de la cascade (selon les clés présentes). */
export function providers() {
  return {
    bettercontact: !!env("BETTERCONTACT_API_KEY"),
    fullenrich: !!env("FULLENRICH_API_KEY"),
    dropcontact: !!env("DROPCONTACT_API_KEY"),
  };
}

// ---------------------------------------------------------------- 1. Trouver les personnes
async function findPeople(ws: Workspace, p: Record<string, string>, roles: string) {
  const host = hostOf(p.website ?? "");
  const r = await askJson<{ personnes: Person[]; site?: string }>(`Trouve les décideurs de cette entreprise qui correspondent aux fonctions recherchées.
Entreprise : ${p.name}${p.org ? ` (raison sociale ${p.org})` : ""}, ${p.activity ?? ""}, ${[p.postal_code, p.city].filter(Boolean).join(" ")}${p.siren ? ` · SIREN ${p.siren}` : ""}
${host ? `Site : ${host}` : "Site inconnu : trouve-le."}
${p.contact_name ? `Dirigeant connu (registre) : ${p.contact_name}${p.contact_role ? ` (${p.contact_role})` : ""}` : ""}
Fonctions recherchées : ${roles}

Cherche (5 recherches maximum) : la page équipe / à propos / mentions légales du site, les profils LinkedIn publics (recherche du type « ${p.org || p.name} ${roles.split(",")[0]} linkedin »), la presse et les annuaires professionnels.
Règles :
- Seulement des personnes qui travaillent ACTUELLEMENT dans cette entreprise (ou son groupe direct), avec une source (URL) pour chacune.
- linkedin : uniquement une URL linkedin.com/in/… trouvée dans les résultats, sinon vide.
- email : uniquement s'il est publié tel quel sur une page (jamais reconstruit), sinon vide.
- depuis : depuis quand il occupe ce poste (ex. « mars 2023 »), seulement si c'est écrit dans une source, sinon vide.
- parcours : une phrase sur son parcours professionnel PUBLIC (postes et entreprises précédents), seulement si c'est écrit dans une source, sinon vide. Rien de personnel (âge, famille, opinions, photo).
- ville : la ville où il travaille si elle est indiquée, sinon vide.
- 0 à 5 personnes, de la plus pertinente à la moins pertinente pour les fonctions recherchées. Si tu ne trouves personne, renvoie une liste vide.
Format : {"site": "https://…", "personnes": [{"nom": "Prénom Nom", "fonction": "", "depuis": "", "parcours": "", "ville": "", "linkedin": "", "email": "", "source": "URL"}]}`,
    { fast: true, maxTokens: 6000, tools: WEB(5), system: "Tu es un chercheur commercial B2B rigoureux en France. Tu ne donnes que des personnes réelles, actuelles et sourcées. Tu n'inventes jamais un nom ni une adresse." });
  const people = (r.personnes ?? [])
    .map((x) => ({
      nom: String(x.nom ?? "").trim().slice(0, 80), fonction: String(x.fonction ?? "").trim().slice(0, 100),
      linkedin: /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^\s/?#]+/i.test(String(x.linkedin ?? "")) ? String(x.linkedin).replace(/[?#].*$/, "").slice(0, 200) : "",
      email: EMAIL_RE.test(String(x.email ?? "").trim()) ? String(x.email).trim().toLowerCase() : "",
      source: String(x.source ?? "").slice(0, 300),
      depuis: String(x.depuis ?? "").trim().slice(0, 40), parcours: String(x.parcours ?? "").trim().slice(0, 300), ville: String(x.ville ?? "").trim().slice(0, 60),
    }))
    .filter((x) => /\s/.test(x.nom) && x.nom.length < 70)
    .slice(0, 5);
  return { people, site: /^https?:\/\//.test(String(r.site ?? "")) ? String(r.site).slice(0, 300) : "" };
}

// ---------------------------------------------------------------- 2. Cascade d'e-mails
async function bcSubmit(rows: { first: string; last: string; company: string; domain: string; linkedin: string; id: string }[]) {
  const key = env("BETTERCONTACT_API_KEY");
  const r = await fetch("https://app.bettercontact.rocks/api/v2/async", {
    method: "POST", headers: { "X-API-Key": key, "content-type": "application/json" },
    body: JSON.stringify({ data: rows.map((x) => ({ first_name: x.first, last_name: x.last, company: x.company, ...(x.domain ? { company_domain: x.domain } : {}), ...(x.linkedin ? { linkedin_url: x.linkedin } : {}), custom_fields: { kairo_id: x.id } })), enrich_email_address: true, enrich_phone_number: false }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.id) { console.error("bettercontact", r.status, JSON.stringify(d).slice(0, 300)); return null; }
  return String(d.id);
}
async function bcResult(id: string) {
  const d = await (await fetch(`https://app.bettercontact.rocks/api/v2/async/${encodeURIComponent(id)}`, { headers: { "X-API-Key": env("BETTERCONTACT_API_KEY") } })).json().catch(() => ({}));
  if (!/terminated|finished|completed|done/i.test(String(d.status ?? ""))) return null;
  const out = new Map<string, { email: string; ok: boolean }>();
  for (const row of d.data ?? []) {
    const cf = row.custom_fields;
    const kid = Array.isArray(cf) ? cf.find((c: { name: string }) => c.name === "kairo_id")?.value : cf?.kairo_id;
    const email = String(row.contact_email_address ?? row.email ?? "").toLowerCase();
    const st = String(row.contact_email_address_status ?? row.email_status ?? "");
    if (kid) out.set(String(kid), { email: EMAIL_RE.test(email) ? email : "", ok: /deliverable|valid|safe/i.test(st) && !/undeliverable|invalid|not_safe/i.test(st) });
  }
  return out;
}

async function feSubmit(rows: { first: string; last: string; company: string; domain: string; linkedin: string; id: string }[]) {
  const r = await fetch("https://app.fullenrich.com/api/v2/contact/enrich/bulk?silentFail=true", {
    method: "POST", headers: { Authorization: `Bearer ${env("FULLENRICH_API_KEY")}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "Bingoo!", data: rows.map((x) => ({ first_name: x.first, last_name: x.last, ...(x.domain ? { domain: x.domain } : { company_name: x.company }), ...(x.linkedin ? { linkedin_url: x.linkedin } : {}), enrich_fields: ["contact.work_emails"], custom: { kairo_id: x.id } })) }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.enrichment_id) { console.error("fullenrich", r.status, JSON.stringify(d).slice(0, 300)); return null; }
  return String(d.enrichment_id);
}
async function feResult(id: string) {
  let d = await (await fetch(`https://app.fullenrich.com/api/v2/contact/enrich/bulk/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${env("FULLENRICH_API_KEY")}` } })).json().catch(() => ({}));
  if (!d?.status) d = await (await fetch(`https://app.fullenrich.com/api/v1/contact/enrich/bulk/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${env("FULLENRICH_API_KEY")}` } })).json().catch(() => ({}));
  if (d?.status !== "FINISHED") return ["CANCELED", "CREDITS_INSUFFICIENT"].includes(d?.status) ? new Map() : null;
  const out = new Map<string, { email: string; ok: boolean }>();
  for (const row of d.datas ?? d.data ?? []) {
    const kid = row.custom?.kairo_id;
    const c = row.contact ?? row;
    const best = (c.emails ?? c.work_emails ?? []).find((e: { status: string }) => e.status === "DELIVERABLE")
      ?? (c.most_probable_email ? { email: c.most_probable_email, status: c.most_probable_email_status } : null);
    if (kid) out.set(String(kid), { email: EMAIL_RE.test(String(best?.email ?? "")) ? String(best.email).toLowerCase() : "", ok: ["DELIVERABLE", "HIGH_PROBABILITY"].includes(String(best?.status ?? "")) });
  }
  return out;
}

async function dcSubmit(row: { first: string; last: string; company: string; domain: string; id: string }) {
  const r = await fetch("https://api.dropcontact.com/v1/enrich/all", {
    method: "POST", headers: { "X-Access-Token": env("DROPCONTACT_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({ data: [{ first_name: row.first, last_name: row.last, company: row.company, ...(row.domain ? { website: row.domain } : {}), custom_fields: row.id }], siren: false, language: "fr" }),
  });
  const d = await r.json().catch(() => ({}));
  return r.ok && d.request_id ? String(d.request_id) : null;
}
async function dcResult(id: string) {
  const d = await (await fetch(`https://api.dropcontact.com/v1/enrich/all/${encodeURIComponent(id)}`, { headers: { "X-Access-Token": env("DROPCONTACT_API_KEY") } })).json().catch(() => ({}));
  if (!d.success) return null;
  const row = (d.data ?? [])[0] ?? {};
  const list = Array.isArray(row.email) ? row.email : [];
  const best = list.find((x: { qualification: string }) => /nominative@pro/i.test(x.qualification ?? "")) ?? list.find((x: { qualification: string }) => /@pro/i.test(x.qualification ?? ""));
  return { email: EMAIL_RE.test(String(best?.email ?? "")) ? String(best.email).toLowerCase() : "", ok: !!best };
}

const ORDER = ["bettercontact", "fullenrich", "dropcontact"] as const;

/** Lance l'étape suivante de la cascade pour un contact sans e-mail. */
/** Crédits de recherche d'e-mails restants ce mois-ci (formule de l'espace). */
async function creditsLeft(wsId: string) {
  const { data: ws } = await admin.from("workspaces").select("*").eq("id", wsId).single();
  if (!ws) return 0;
  const { credits } = await import("./deep.ts");
  return (await credits(ws as Workspace)).left;
}

async function launch(c: ContactRow, company: string, domain: string, skip: string[] = []) {
  const av = providers();
  const { first, last } = split(c.name);
  const row = { first, last, company, domain, linkedin: c.linkedin_url, id: c.id };
  for (const prov of ORDER) {
    if (!av[prov] || skip.includes(prov)) continue;
    const id = prov === "bettercontact" ? await bcSubmit([row]) : prov === "fullenrich" ? await feSubmit([row]) : await dcSubmit(row);
    if (id) {
      await admin.from("contacts").update({ email_status: "en_cours", provider_req: { provider: prov, id, tried: [...skip, prov].join(","), company, domain } }).eq("id", c.id);
      return prov;
    }
  }
  await admin.from("contacts").update({ email_status: "introuvable", provider_req: {} }).eq("id", c.id);
  return null;
}

/** Relève les résultats en attente et passe au fournisseur suivant si rien n'est trouvé. */
export async function pollContacts(ws: Workspace) {
  const { data } = await admin.from("contacts").select("*").eq("workspace_id", ws.id).eq("email_status", "en_cours").limit(30);
  let found = 0;
  for (const c of (data ?? []) as ContactRow[]) {
    const req = c.provider_req ?? {};
    let res: { email: string; ok: boolean } | null | undefined = null;
    try {
      if (req.provider === "bettercontact") { const m = await bcResult(req.id); res = m ? (m.get(c.id) ?? { email: "", ok: false }) : null; }
      else if (req.provider === "fullenrich") { const m = await feResult(req.id); res = m ? (m.get(c.id) ?? { email: "", ok: false }) : null; }
      else if (req.provider === "dropcontact") res = await dcResult(req.id);
    } catch (e) { console.error("cascade", e); }
    if (res === null || res === undefined) continue; // pas encore prêt
    if (res.email && res.ok) {
      await admin.from("contacts").update({ email: res.email, email_status: "verifie", email_source: `${req.provider} (vérifié)`, provider_req: {} }).eq("id", c.id);
      await log(ws.id, "credit_email", `${c.name} : e-mail trouvé (${req.provider})`);
      // Si l'entreprise n'a pas encore d'e-mail, ce contact devient l'interlocuteur principal
      const { data: p } = await admin.from("prospects").select("email").eq("id", c.prospect_id).single();
      if (p && !p.email) await useContact(ws, c.id);
      found++;
    } else if (await creditsLeft(ws.id) > 0) {
      await launch(c, req.company ?? "", req.domain ?? "", String(req.tried ?? "").split(",").filter(Boolean));
    } else {
      await admin.from("contacts").update({ email_status: "introuvable", provider_req: {} }).eq("id", c.id);
    }
  }
  return found;
}

/** Trouve les décideurs d'un prospect, enregistre les contacts et lance la recherche d'e-mails. */
export async function findContacts(ws: Workspace, prospectId: string, roles: string) {
  const { data: p } = await admin.from("prospects").select("*").eq("id", prospectId).eq("workspace_id", ws.id).single();
  if (!p) throw new HttpError(404, "Prospect introuvable");
  const t = (ws.targets ?? []).find((x) => x.id === p.target);
  const wanted = roles.trim() || t?.interlocuteur || "dirigeant, directeur commercial";
  const { people, site } = await findPeople(ws, p, wanted);
  if (site && !p.website) await admin.from("prospects").update({ website: site }).eq("id", p.id);
  const domain = hostOf(p.website || site);
  // Le dirigeant du registre officiel est toujours une piste sûre
  if (p.contact_name && /\s/.test(p.contact_name) && !people.some((x) => x.nom.toLowerCase() === p.contact_name.toLowerCase()))
    people.push({ nom: p.contact_name, fonction: p.contact_role || "Dirigeant (registre officiel)", linkedin: "", email: "", source: "Registre national des entreprises" });
  const out: ContactRow[] = [];
  for (const x of people) {
    const published = x.email && (!domain || x.email.endsWith(domain));
    const { data: row } = await admin.from("contacts").upsert({
      workspace_id: ws.id, prospect_id: p.id, name: x.nom, role: x.fonction, linkedin_url: x.linkedin, source: x.source,
      profile: { depuis: x.depuis ?? "", parcours: x.parcours ?? "", ville: x.ville ?? "" },
      ...(published ? { email: x.email, email_status: "publie", email_source: x.source } : {}),
    }, { onConflict: "prospect_id,name" }).select("*").single();
    if (row) out.push(row as ContactRow);
  }
  // Un e-mail publié pour le bon décideur devient tout de suite l'interlocuteur principal
  const first = out.find((c) => c.email);
  if (first && !p.email) await useContact(ws, first.id);
  // Recherches payantes limitées aux crédits restants de la formule
  let launched = 0, left = await creditsLeft(ws.id);
  for (const c of out) { if (left <= 0) break; if (!c.email && c.email_status !== "en_cours" && await launch(c, p.org || p.name, domain)) { launched++; left--; } }
  await log(ws.id, "contacts", `${p.name} : ${out.length} décideur${out.length > 1 ? "s" : ""} trouvé${out.length > 1 ? "s" : ""}`);
  const { data: fresh } = await admin.from("contacts").select("*").eq("prospect_id", p.id).order("created_at");
  return { contacts: fresh ?? [], launched, providers: providers() };
}

/** Choisit un contact comme interlocuteur principal du prospect (e-mails, relances, CRM). */
export async function useContact(ws: Workspace, contactId: string) {
  const { data: c } = await admin.from("contacts").select("*").eq("id", contactId).eq("workspace_id", ws.id).single();
  if (!c) throw new HttpError(404, "Contact introuvable");
  const { data: p } = await admin.from("prospects").select("status").eq("id", c.prospect_id).single();
  const patch: Record<string, unknown> = { contact_name: c.name, contact_role: c.role, contact_source: String(c.source || "recherche de décideurs").slice(0, 120) };
  if (c.linkedin_url) patch.linkedin_url = c.linkedin_url;
  if (c.email) {
    Object.assign(patch, { email: c.email, email_source: c.email_source || c.source, channel: "email" });
    if (["nouveau", "sans_email"].includes(p?.status ?? "")) patch.status = "pret";
  }
  await admin.from("prospects").update(patch).eq("id", c.prospect_id);
  return { ok: true };
}

/** Recherche libre « type Waalaxy » : un profil LinkedIn (URL) ou une personne → fiche prospect + contact. */
export async function importPerson(ws: Workspace, input: string) {
  const q = input.trim().slice(0, 300);
  if (q.length < 5) throw new HttpError(400, "Colle l'URL d'un profil LinkedIn ou « Prénom Nom, entreprise »");
  const v = await askJson<{ nom: string; fonction: string; entreprise: string; site: string; ville: string; linkedin: string; source: string }>(
    `Identifie cette personne professionnelle à partir de ses informations publiques : ${q}
Trouve son nom, sa fonction actuelle, son entreprise actuelle, le site de l'entreprise et sa ville. N'invente rien : laisse vide ce que tu ne trouves pas.
Format : {"nom": "", "fonction": "", "entreprise": "", "site": "", "ville": "", "linkedin": "", "source": "URL"}`,
    { fast: true, maxTokens: 4000, tools: WEB(3), system: "Tu es un chercheur commercial B2B rigoureux. Tu n'inventes rien." });
  if (!v?.nom || !v?.entreprise) throw new HttpError(422, "Je n'ai pas pu identifier cette personne et son entreprise : précise « Prénom Nom, entreprise ».");
  const linkedin = /linkedin\.com\/in\//i.test(q) ? q.replace(/[?#].*$/, "") : (/linkedin\.com\/in\//i.test(v.linkedin ?? "") ? v.linkedin.replace(/[?#].*$/, "") : "");
  const { data: p, error } = await admin.from("prospects").insert({
    workspace_id: ws.id, name: v.entreprise.slice(0, 120), org: v.entreprise.slice(0, 120), activity: "Import manuel", city: (v.ville ?? "").slice(0, 80),
    website: /^https?:\/\//.test(v.site ?? "") ? v.site.slice(0, 300) : "", contact_name: v.nom.slice(0, 80), contact_role: (v.fonction ?? "").slice(0, 100),
    linkedin_url: linkedin, status: "sans_email", source: "import contact",
  }).select("*").single();
  if (error) throw new HttpError(500, error.message);
  const { data: c } = await admin.from("contacts").insert({ workspace_id: ws.id, prospect_id: p.id, name: v.nom.slice(0, 80), role: (v.fonction ?? "").slice(0, 100), linkedin_url: linkedin, source: v.source ?? "" }).select("*").single();
  if (c && await creditsLeft(ws.id) > 0) await launch(c as ContactRow, p.name, hostOf(p.website));
  await log(ws.id, "contacts", `${v.nom} (${v.entreprise}) importé`);
  return { prospect_id: p.id, name: v.nom, company: v.entreprise };
}
