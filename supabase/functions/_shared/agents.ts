// Agents Enquêteur (coordonnées), Rédacteur (premier e-mail) et Facteur (envoi).
import { learned } from "./intelligence.ts";
import { HttpError } from "./http.ts";
import { admin, ask, assertPlan, askJson, knowledgeOf, log, type Prospect, type Workspace } from "./core.ts";
import { resend, replyAddress, sendMail, signature } from "./mail.ts";
import { markWarmup, warmup } from "./growth.ts";
import { campaignOf, goalText, pickVariant } from "./campaigns.ts";
import { siteContacts } from "./deep.ts";
import { siteSignals, type Signal } from "./sitesignals.ts";
import { humanize, PLAYBOOK_ECRITURE, PLAYBOOK_OFFRE, PLAYBOOK_SIGNAUX, PLAYBOOK_STARTUPS } from "./playbooks.ts";

// ---------------------------------------------------------------- Enquêteur
const SYSTEM_ENQ = `Tu es un assistant de recherche commerciale B2B en France. Tu cherches sur le web les coordonnées professionnelles publiques d'un établissement.
Règles strictes :
- Ne donne une adresse e-mail que si tu l'as vue publiée (site officiel de l'établissement ou de son gestionnaire, annuaire officiel, page de contact). Ne construis jamais une adresse à partir d'un nom.
- Préfère l'adresse d'un responsable publiée pour sa fonction, sinon une adresse générique de l'établissement (contact@, accueil@, direction@…).
- Si tu n'es pas sûr qu'une coordonnée appartient bien à cet établissement, laisse le champ vide.`;

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const BAD = /(example\.|sentry\.|wixpress|domain\.com|email\.com|votre|yourdomain|^(?:(?:rgpd|gdpr|privacy|dataprotection|data-protection|donnees-?personnelles|cnil)[a-z._-]*|dpo(?:[._-][a-z._-]*)?|noreply|no-reply|webmaster|recrutement|jobs|rh)@)/i;

/** Le domaine de l'adresse reçoit-il du courrier ? (évite les rebonds qui abîment la boîte du client) */
const mxCache = new Map<string, boolean>();
export async function mxOk(email: string) {
  const d = (email.split("@")[1] ?? "").toLowerCase();
  if (!d) return false;
  if (mxCache.has(d)) return mxCache.get(d)!;
  let ok = true; // en cas de panne du contrôle, on ne bloque pas
  try {
    const r = await (await fetch(`https://dns.google/resolve?name=${encodeURIComponent(d)}&type=MX`, { signal: AbortSignal.timeout(5000) })).json();
    if (r.Status === 3) ok = false; // domaine inexistant
    else if (r.Status === 0) {
      const mx = ((r.Answer ?? []) as { type: number; data: string }[]).filter((x) => x.type === 15);
      if (mx.some((x) => /^0\s+\.?$/.test(x.data.trim()))) ok = false; // « null MX » : le domaine refuse tout courrier
      else if (!mx.length) {
        const a = await (await fetch(`https://dns.google/resolve?name=${encodeURIComponent(d)}&type=A`, { signal: AbortSignal.timeout(5000) })).json();
        ok = (a.Answer ?? []).length > 0;
      }
    }
  } catch { ok = true; }
  mxCache.set(d, ok);
  return ok;
}

// Lecture gratuite du site (pages Contact, Mentions légales…) : aucun appel à l'IA ni à un fournisseur.
// On ne garde que les adresses du domaine de l'entreprise ou d'une messagerie grand public :
// une adresse d'un autre domaine (agence web, hébergeur) n'est pas celle de l'entreprise.
const FREEMAIL = /@(gmail|googlemail|orange|wanadoo|free|hotmail|outlook|live|msn|yahoo|sfr|neuf|laposte|icloud|me|aol|bbox|numericable)\./i;
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };

async function fromSite(site: string, person: string, company = "", rivals: Rival[] = []) {
  const sc = await siteContacts(site).catch(() => ({ emails: [] as string[], phones: [] as string[], form: "", home: "", origin: "" }));
  const host = hostOf(site), base = host.split(".").slice(-2).join(".");
  const last = (person.split(" ").pop() ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const score = (e: string) => (e.split("@")[1]?.endsWith(base) ? 10 : 0) + (last.length > 2 && e.includes(last) ? 6 : 0)
    + (/^(direction|directeur|dir|gerant|gerance|contact|accueil|secretariat|info|bonjour|hello|commercial|achats?)[.@]/i.test(e) ? 3 : 0);
  // Autre domaine accepté seulement s'il porte le nom de l'entreprise (ex. info@camden.agency sur camdenpublicite.com)
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  const brand = (e: string) => { const lab = norm((e.split("@")[1] ?? "").split(".").slice(-2)[0] ?? ""); return lab.length >= 4 && (norm(host).includes(lab) || norm(company).includes(lab)); };
  const ok = sc.emails.filter((e) => (base && e.split("@")[1]?.endsWith(base)) || FREEMAIL.test(e) || brand(e)).sort((a, b) => score(b) - score(a));
  const signals: Signal[] = sc.home ? await siteSignals(sc.origin, sc.home, rivals).catch(() => []) : [];
  return { email: ok[0] ?? "", phone: sc.phones[0] ?? "", form: sc.form, signals };
}

/** Concurrents suivis par Espion : nom propre, domaine, argumentaire (battlecard). Cache par espace. */
type Rival = { name: string; host: string; pitch: string; objections: { objection: string; reponse: string }[]; weak?: string[]; questions?: string[]; opps?: string[] };
const RIVALS = new Map<string, Promise<Rival[]>>();
export function rivalsOf(wsId: string): Promise<Rival[]> {
  if (!RIVALS.has(wsId)) RIVALS.set(wsId, (async () => {
    const { data } = await admin.from("competitors").select("name, url, summary, status").eq("workspace_id", wsId).neq("status", "ecarte").neq("status", "propose").limit(20);
    return (data ?? []).map((c) => {
      const host = hostOf(c.url ?? "");
      const sum = (c.summary ?? {}) as { nom?: string; battlecard?: { pitch?: string; objections?: { objection: string; reponse: string }[]; questions_pieges?: string[] }; faiblesses?: { texte?: string; type?: string }[]; opportunites?: string[] };
      const raw = String(sum.nom || c.name || "");
      const label = host.split(".")[0] ?? "";
      const name = raw && raw.length <= 30 && !/[≠(]/.test(raw) ? raw : label.charAt(0).toUpperCase() + label.slice(1);
      const clean = (x: unknown) => String(x ?? "").replace(/<\/?cite[^>]*>/g, "").trim();
      return { name, host, pitch: clean(sum.battlecard?.pitch).slice(0, 500), objections: (sum.battlecard?.objections ?? []).slice(0, 4),
        weak: (sum.faiblesses ?? []).filter((f) => f.type !== "hypothese").map((f) => clean(f.texte)).filter(Boolean).slice(0, 2),
        questions: (sum.battlecard?.questions_pieges ?? []).map(clean).slice(0, 2), opps: (sum.opportunites ?? []).map(clean).slice(0, 6) };
    }).filter((r) => r.host);
  })());
  return RIVALS.get(wsId)!;
}

/** Ajoute les signaux du site à ceux du prospect (sans doublon, les plus récents remplacent). */
export function mergeSignals(old: Signal[] | null | undefined, add: Signal[]) {
  const keep = (old ?? []).filter((s) => !add.some((a) => a.type === s.type));
  return [...keep, ...add.map((a) => ({ ...a, at: a.at ?? new Date().toISOString().slice(0, 10) }))];
}

export async function enrich(p: Prospect, interlocuteur: string) {
  // 1. Site déjà connu : on le lit d'abord (gratuit)
  if (p.website) {
    const r = await fromSite(p.website, p.contact_name ?? "", `${p.name} ${p.org ?? ""}`, await rivalsOf(p.workspace_id));
    if (r.email && !(await mxOk(r.email))) r.email = "";
    if (r.signals.length) { p.signals = mergeSignals(p.signals as Signal[], r.signals); await admin.from("prospects").update({ signals: p.signals }).eq("id", p.id); }
    // Promesse Bingoo! : jamais d'adresse devinée (pas de prénom.nom reconstruit), seulement des adresses publiées ou vérifiées
    if (r.email) {
      const patch: Record<string, unknown> = { enriched_at: new Date().toISOString(), enrich_note: `E-mail trouvé sur son site (${hostOf(p.website)})`, status: "pret", enrich_level: 1, channel: "email", email_source: `site ${hostOf(p.website)}`, email: r.email };
      if (r.phone && !p.phone) patch.phone = r.phone;
      if (r.form && !p.contact_form) patch.contact_form = r.form;
      await admin.from("prospects").update(patch).eq("id", p.id);
      return { id: p.id, email: r.email, phone: r.phone, site: p.website, via: "site" };
    }
  }
  const fiche = [
    `Nom : ${p.name}`,
    p.org && `Raison sociale : ${p.org}`,
    p.activity && `Activité : ${p.activity}`,
    `Adresse : ${[p.address, p.postal_code, p.city].filter(Boolean).join(" ")}`,
    p.siret && `SIRET : ${p.siret}`,
    p.contact_name && `Dirigeant connu : ${p.contact_name}${p.contact_role ? ` (${p.contact_role})` : ""}`,
    p.website && `Site connu : ${p.website}`,
    interlocuteur && `Interlocuteur recherché : ${interlocuteur}`,
  ].filter(Boolean).join("\n");
  type Found = { site?: string; email?: string; telephone?: string; contact?: string; fonction?: string; source?: string; note?: string };
  const v = await askJson<Found>(`Trouve les coordonnées professionnelles publiques de cet établissement :
${fiche}

Cherche son site officiel, puis une adresse e-mail professionnelle publiée, un numéro de téléphone et, si publié, le nom de la personne qui occupe la fonction recherchée.
Format : {"site": "https://…", "email": "", "telephone": "", "contact": "Prénom Nom ou vide", "fonction": "", "source": "URL où l'e-mail est publié", "note": "une phrase"}`,
    { fast: true, maxTokens: 6000, system: SYSTEM_ENQ, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }] });

  const email = String(v.email ?? "").trim().toLowerCase().replace(/^mailto:/, "");
  let ok = EMAIL_RE.test(email) && !BAD.test(email) ? email : "";
  const site = /^https?:\/\//i.test(String(v.site ?? "")) ? String(v.site).trim().slice(0, 300) : "";
  let siteSig: Signal[] = [];
  // 3. L'IA a trouvé le site mais pas d'e-mail : on lit ses pages nous-mêmes (gratuit)
  if (!ok && site && site !== p.website) {
    const r = await fromSite(site, String(v.contact ?? p.contact_name ?? ""), `${p.name} ${p.org ?? ""}`, await rivalsOf(p.workspace_id));
    if (r.signals.length) siteSig = r.signals;
    if (r.email) { ok = r.email; v.source = `site ${hostOf(site)}`; }
  }
  if (ok && !(await mxOk(ok))) { v.note = `Adresse trouvée (${ok}) mais son domaine ne reçoit pas de courrier : écartée`; ok = ""; }
  const phone = String(v.telephone ?? "").replace(/[^\d+ .]/g, "").trim().slice(0, 30);
  const patch: Record<string, unknown> = {
    ...(siteSig.length ? { signals: mergeSignals(p.signals as Signal[], siteSig) } : {}),
    enriched_at: new Date().toISOString(),
    enrich_note: [ok ? `E-mail trouvé${v.source ? ` sur ${String(v.source).slice(0, 200)}` : ""}` : "Aucun e-mail public trouvé", v.note ? String(v.note).slice(0, 300) : ""].filter(Boolean).join(" · "),
    status: ok ? "pret" : "sans_email",
    enrich_level: 1,
    channel: ok ? "email" : (phone || p.phone) ? "telephone" : "",
    email_source: ok ? String(v.source ?? "recherche web").slice(0, 200) : "",
  };
  if (ok) patch.email = ok;
  if (site && !p.website) patch.website = site;
  if (phone && !p.phone) patch.phone = phone;
  const contact = String(v.contact ?? "").trim();
  if (ok && contact && contact.length < 60 && /\s/.test(contact)) { patch.contact_name = contact; patch.contact_role = String(v.fonction ?? "").slice(0, 80); }
  await admin.from("prospects").update(patch).eq("id", p.id);
  return { id: p.id, email: ok, phone, site };
}

// ---------------------------------------------------------------- Rédacteur
export function systemFor(ws: Workspace) {
  const pr = ws.profile ?? {};
  return `Tu écris des e-mails de prospection B2B au nom de ${ws.sender_name || "l'équipe"} de ${pr.nom || ws.name}.
Entreprise : ${pr.resume ?? ""}
Offre : ${pr.offre ?? ""}
Ce qui la distingue : ${pr.differenciation ?? ""}
Faits vérifiables utilisables : ${(pr.preuves ?? []).join(" ; ") || "aucun"}
Ton de la marque : ${pr.ton || "professionnel et sobre"}${knowledgeOf(ws) ? `\n\nFiche de l'entreprise (informations exactes, à utiliser pour répondre aux questions précises ; rien d'autre) :\n${knowledgeOf(ws)}` : ""}

Règles absolues :
- Français, vouvoiement, ton professionnel et direct, phrases courtes, aucun jargon marketing, aucun superlatif.
- Premier e-mail : 50 à 90 mots. Relances : 40 mots maximum. Pas de liste à puces. Pas d'emoji.
- N'invente rien : aucun client, chiffre, label, prix, délai ou fait qui ne figure pas dans les informations fournies.
- Dans un premier e-mail, ne parle jamais de prix. Dans une réponse à une question, tu peux citer un prix ou un délai seulement s'il figure dans la fiche.
- Parle du bénéfice pour les personnes concernées chez le prospect (par exemple ses clients, salariés, résidents, patients).
- Un seul objectif : obtenir un court échange (15 à 20 minutes). Une seule question claire à la fin.
- Pas de formule creuse (« j'espère que vous allez bien », « je me permets de… » en ouverture).${learned(ws)}`;
}

/** Comprendre → Agir : ce que la veille Espion apporte à l'e-mail. */
/** Dossier Espion du prospect : concurrent probablement utilisé, ses faiblesses vérifiées, l'objection à prévoir, l'angle à prendre.
 *  Transmis à Hugo pour l'e-mail, et gardé sur la fiche du prospect. Aucune IA en plus : tout vient des rapports d'Espion. */
async function rivalBrief(wsId: string, p: Prospect) {
  const rivals = (await rivalsOf(wsId)).filter((r) => r.pitch);
  if (!rivals.length) return "";
  const used = (p.signals ?? []).find((x) => x.type === "concurrent");
  const r = used ? rivals.find((x) => x.host === (used as Signal).value) : null;
  const words = `${p.activity ?? ""} ${p.name ?? ""}`.toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter((w) => w.length > 4);
  const opp = rivals.flatMap((x) => x.opps ?? []).find((o) => words.some((w) => o.toLowerCase().includes(w))) ?? "";
  const dossier = r
    ? { concurrent: r.name, angle: r.pitch, faiblesses: r.weak ?? [], objection: r.objections?.[0] ?? null, question: r.questions?.[0] ?? "", at: new Date().toISOString() }
    : { concurrent: "", angle: rivals.slice(0, 2).map((x) => x.pitch).join(" / "), faiblesses: [], objection: null, question: "", opportunite: opp, at: new Date().toISOString() };
  await admin.from("prospects").update({ insight: { ...((p.insight as Record<string, unknown>) ?? {}), espion: dossier } }).eq("id", p.id);
  if (r) return `DOSSIER ESPION — le prospect utilise déjà ${r.name} (repéré sur son site). Notre positionnement face à ${r.name} : ${r.pitch}${r.weak?.length ? `\nLimites vérifiées de ${r.name} (à évoquer en creux, sans jamais le citer ni le dénigrer) : ${r.weak.join(" ; ")}` : ""}${r.objections?.[0] ? `\nObjection probable : « ${r.objections[0].objection} » — réponse prévue : ${r.objections[0].reponse}` : ""}\n`;
  return `DOSSIER ESPION — ce qui nous distingue des alternatives du marché (utilise-le comme angle si c'est pertinent, sans citer de concurrent) : ${dossier.angle}${opp ? `\nOpportunité repérée pour ce type d'entreprise : ${opp}` : ""}\n`;
}

export async function draft(ws: Workspace, p: Prospect) {
  // Pas de rédaction (ni de crédit IA) pour une adresse qui ne passera pas la vérification d'envoi
  if (p.email) {
    const vf = await (await import("./verif.ts")).verifierEmail(p.email, ws.id);
    if (vf.statut === "invalide") {
      await admin.from("prospects").update({ email: "", status: "sans_email", channel: "", enrich_note: `Adresse ${p.email} écartée : ${vf.raison}` }).eq("id", p.id);
      throw new HttpError(400, `Adresse écartée (${vf.raison}) : le prospect repart en enquête`);
    }
  }
  const { subject, body, active, v } = await writeDraft(ws, p);
  const { data, error } = await admin.from("messages").insert({ workspace_id: ws.id, prospect_id: p.id, step: 0, subject, body, status: "brouillon", campaign_id: active?.id ?? null, variant: v?.key ?? "" }).select("id").single();
  if (error?.code === "23505") throw new HttpError(409, "Un message est déjà prêt pour ce prospect");
  if (error) throw new HttpError(500, error.message);
  await admin.from("prospects").update({ status: "a_valider" }).eq("id", p.id);
  return { id: data.id, subject };
}

/** Rédige le premier e-mail sans l'enregistrer (sert aussi aux tests de qualité). */
export async function writeDraft(ws: Workspace, p: Prospect) {
  const t = (ws.targets ?? []).find((x) => x.id === p.target);
  const camp = await campaignOf((p as Prospect & { campaign_id?: string }).campaign_id);
  const active = camp && camp.status === "active" ? camp : null;
  const v = active ? pickVariant(active, p.id) : null;
  const out = await ask(`Rédige le premier e-mail de prospection pour ce prospect.
Prospect : ${p.name}${p.org ? ` (${p.org})` : ""}, ${p.activity}, ${p.city}.
Interlocuteur : ${p.contact_name ? `${p.contact_name}${p.contact_role ? `, ${String(p.contact_role).replace(/\s*\(.*$/, "").slice(0, 60)}` : ""}` : `inconnu (fonction visée : ${t?.interlocuteur || "dirigeant"}) : n'invente ni nom ni fonction`}.
Pourquoi cette cible a besoin de l'offre : ${t?.pourquoi ?? ""}
Angle à utiliser : ${v ? v.angle : t?.angle ?? ""}
${v?.objet ? `Objet à utiliser tel quel ou presque : ${v.objet}\n` : ""}${active ? `Objectif de l'e-mail : ${goalText(active.goal)}.\n` : ""}Bénéficiaires à nommer : ${t?.pour_qui ?? ""}
${(() => { const sg = (p.signals ?? []).filter((x) => x.label && x.type !== "taille" && x.type !== "reseau"); return sg.length ? `Faits publics observés sur ce prospect (registre, Radar, son site) :\n${sg.slice(0, 8).map((x) => `- ${String(x.label).replace(/\s*(?:publi[ée]e? )?(?:au|dans le|selon le) (?:BODACC|registre[^,.;]*)/gi, "")}`).join("\n")}\nChoisis LE fait le plus utile pour notre offre et ouvre l'e-mail avec, sans rien y ajouter ni l'interpréter. N'utilise pas les autres.\n` : ""; })()}${(p.insight as { reseaux?: { accroche?: string } } | null)?.reseaux?.accroche ? `Première phrase possible, fondée sur une publication ou une actualité réelle du prospect (à reprendre ou adapter si elle sonne naturelle, sinon ignore-la) : ${(p.insight as { reseaux: { accroche: string } }).reseaux.accroche}
` : ""}
${await rivalBrief(ws.id, p)}Commence par « Bonjour${p.contact_name ? " Madame/Monsieur <Nom>" : ""}, » (si l'interlocuteur est connu mais que le genre est incertain, écris « Bonjour <Prénom>, », jamais prénom et nom ensemble).
Longueur : 60 à 90 mots, trois courts paragraphes au plus.
Ne mets pas de signature : elle est ajoutée automatiquement.

Format exact :
OBJET: <objet de 2 à 5 mots, en minuscules sauf noms propres, sans point d'exclamation>
---
<corps>`, { fast: true, system: systemFor(ws) + PLAYBOOK_ECRITURE + PLAYBOOK_OFFRE + PLAYBOOK_SIGNAUX + ((p.signals ?? []).some((x) => ["levee", "accelerateur"].includes(x.type)) ? PLAYBOOK_STARTUPS : ""), maxTokens: 1500 });
  // Tolérant aux lignes vides autour du séparateur ; jamais d'« OBJET: » ni de « --- » laissés dans le corps
  const m = out.match(/OBJET\s*:\s*(.+?)\s*\n\s*-{3,}\s*\n([\s\S]+)/i);
  const loose = out.match(/OBJET\s*:\s*(.+)/i);
  const subject = humanize(m ? m[1] : loose ? loose[1] : `${ws.profile?.nom || ws.name} – ${p.name}`).replace(/^(re|tr|fwd?)\s*:\s*/i, "").slice(0, 140);
  let body = humanize((m ? m[2] : out).replace(/^\s*OBJET\s*:.*$/gim, "").replace(/^\s*-{3,}\s*$/gm, "").replace(/^\n+/, ""));
  // « Bonjour Richard Michaud, » → « Bonjour Richard, » (prénom et nom ensemble sonnent comme un publipostage)
  const full = String(p.contact_name ?? "").trim();
  if (full.includes(" ")) body = body.replace(new RegExp(`^Bonjour ${full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`), `Bonjour ${full.split(/\s+/)[0]},`);
  return { subject, body, active, v };
}

/** Protection de la réputation : trop de rebonds récents → envois suspendus (adapté de Harvey). */
export async function bounceGuard(ws: Workspace) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const [{ count: sent }, { count: bounced }] = await Promise.all([
    admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", since),
    admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("bounced", true).gte("sent_at", since),
  ]);
  const rate = (sent ?? 0) ? (bounced ?? 0) / (sent ?? 1) : 0;
  return { ok: (sent ?? 0) < 20 || rate <= 0.05, sent: sent ?? 0, bounced: bounced ?? 0, rate };
}

// ---------------------------------------------------------------- Domaine d'envoi (Resend)
type DnsRec = { record?: string; name: string; type: string; value: string; priority?: number; status?: string; ttl?: string };

async function txt(name: string): Promise<string[]> {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`);
    const d = await r.json();
    return (d.Answer ?? []).map((a: { data: string }) => String(a.data).replace(/^"|"$/g, "").replace(/" "/g, ""));
  } catch { return []; }
}

export async function setDomain(ws: Workspace, input: string) {
  const domain = String(input ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) throw new HttpError(400, "Nom de domaine invalide (ex. monentreprise.fr)");
  if (/(gmail|outlook|hotmail|yahoo|icloud|orange|free|sfr|laposte|wanadoo)\./.test(domain)) throw new HttpError(400, "Il faut un domaine qui t'appartient (pas une messagerie gratuite)");
  const { data: taken } = await admin.from("workspaces").select("id").eq("domain", domain).neq("id", ws.id).limit(1);
  if (taken?.length) throw new HttpError(409, "Ce domaine est déjà utilisé par un autre espace");

  let r = await resend("/domains", "POST", { name: domain, region: "eu-west-1" });
  let preexisting = false;
  if (!r.ok) {
    // Domaine déjà présent sur le compte d'envoi : on le retrouve
    const list = await resend("/domains");
    const found = (list.data?.data ?? []).find((d: { name: string }) => d.name === domain);
    if (!found) throw new HttpError(502, "Service d'envoi : " + (r.data?.message ?? "erreur"));
    r = await resend(`/domains/${found.id}`);
    preexisting = true;
  }
  const records: DnsRec[] = (r.data?.records ?? []).map((x: DnsRec) => ({ record: x.record, name: x.name, type: x.type, value: x.value, priority: x.priority, status: x.status }));
  // Domaine déjà connu : il faut prouver qu'il appartient à cet espace
  if (preexisting) records.unshift({ record: "Propriété", name: `_machine.${domain}`, type: "TXT", value: `machine-verif=${ws.id}`, status: "not_started" });
  await admin.from("workspaces").update({ domain, domain_id: r.data.id, domain_status: "pending", domain_records: records }).eq("id", ws.id);
  return { domain, records, status: "pending" };
}

export async function checkDomain(ws: Workspace) {
  if (!ws.domain_id) throw new HttpError(400, "Aucun domaine configuré");
  let records = (ws.domain_records ?? []) as DnsRec[];
  const proof = records.find((x) => x.record === "Propriété");
  let proofOk = true;
  if (proof) {
    proofOk = (await txt(proof.name)).includes(proof.value);
    proof.status = proofOk ? "verified" : "pending";
  }
  await resend(`/domains/${ws.domain_id}/verify`, "POST");
  const r = await resend(`/domains/${ws.domain_id}`);
  const fresh: DnsRec[] = (r.data?.records ?? []).map((x: DnsRec) => ({ record: x.record, name: x.name, type: x.type, value: x.value, priority: x.priority, status: x.status }));
  if (fresh.length) records = proof ? [proof, ...fresh] : fresh;
  // L'envoi suffit (SPF + DKIM) ; la réception n'est pas nécessaire : les réponses vont dans la boîte de l'expéditeur
  const sending = r.data?.capabilities?.sending ?? r.data?.status;
  // « capabilities.sending = enabled » veut seulement dire que l'envoi est prévu, pas que le DNS est validé
  const verified = proofOk && r.data?.status === "verified";
  const status = verified ? "verified" : r.data?.status === "failed" ? "failed" : "pending";
  await admin.from("workspaces").update({ domain_status: status, domain_records: records }).eq("id", ws.id);
  // Suivi des ouvertures et des clics, activé une fois le domaine vérifié
  if (status === "verified" && ws.domain_status !== "verified") await resend(`/domains/${ws.domain_id}`, "PATCH", { open_tracking: false, click_tracking: false }).catch(() => null);
  return { status, records };
}

// ---------------------------------------------------------------- Facteur
export async function sendOne(ws: Workspace, messageId: string) {
  const { data: msg } = await admin.from("messages").select("*, prospects(*)").eq("id", messageId).eq("workspace_id", ws.id).single();
  if (!msg) throw new HttpError(404, "Message introuvable");
  if (msg.status !== "brouillon") return { id: messageId, skipped: msg.status === "envoi" ? "envoi déjà en cours" : "déjà traité" };
  if (msg.campaign_id) { const c = await campaignOf(msg.campaign_id); if (c && c.status !== "active") return { id: messageId, skipped: "campagne en pause" }; }
  const p = msg.prospects as Prospect;
  if (!p?.email) {
    // Brouillon devenu inutilisable (adresse retirée depuis) : mis de côté, pour ne jamais bloquer les envois suivants
    await admin.from("messages").update({ status: "echec", error: "Ce prospect n'a plus d'adresse e-mail : message mis de côté" }).eq("id", messageId).eq("status", "brouillon");
    return { id: messageId, skipped: "ce prospect n'a plus d'adresse e-mail" };
  }
  if (["repondu", "rdv", "client", "refus", "ignore"].includes(p.status) && msg.step > 0) {
    await admin.from("messages").update({ status: "ignore", error: "Le prospect a déjà répondu" }).eq("id", messageId);
    return { id: messageId, skipped: "il a déjà répondu" };
  }
  // Un seul parcours e-mail + LinkedIn : jamais les deux le même jour pour la même personne (le message reste prêt pour demain)
  const day0 = new Date(); day0.setHours(0, 0, 0, 0);
  const { count: liToday } = await admin.from("linkedin_actions").select("id", { count: "exact", head: true }).eq("prospect_id", p.id).eq("status", "fait").in("kind", ["invitation", "message", "relance"]).gte("done_at", day0.toISOString());
  if ((liToday ?? 0) > 0) return { id: messageId, skipped: "il a reçu un message LinkedIn aujourd'hui : l'e-mail partira demain" };
  // Vérification de l'adresse juste avant l'envoi : une adresse douteuse ne part jamais (ça protège la boîte du client)
  const vf = await (await import("./verif.ts")).verifierEmail(p.email, ws.id);
  if (vf.statut === "invalide" || (vf.statut === "risque" && vf.via === "historique")) {
    await admin.from("messages").update({ status: "ignore", error: `Adresse écartée : ${vf.raison}` }).eq("id", messageId);
    await admin.from("prospects").update({ email: "", status: "sans_email", channel: "", enrich_note: `Adresse ${p.email} écartée avant l'envoi : ${vf.raison}` }).eq("id", p.id);
    return { id: messageId, skipped: `adresse écartée (${vf.raison}). Le prospect repart en enquête.` };
  }
  // Abonnement à jour obligatoire (essai en cours, abonnement réglé ou offert)
  const { data: plan } = await admin.from("workspaces").select("plan, plan_status, trial_ends").eq("id", ws.id).single();
  assertPlan(plan ?? {});
  // Opposition : une personne qui a demandé à ne plus être contactée ne reçoit plus rien, quel que soit l'espace
  const addr = p.email.trim().toLowerCase();
  const [unsub, sup] = await Promise.all([
    admin.from("prospects").select("id").eq("workspace_id", ws.id).eq("email", p.email).eq("status", "refus").limit(1),
    admin.from("suppressions").select("email").eq("email", addr).limit(1),
  ]);
  if (sup.data?.length) {
    await admin.from("messages").update({ status: "ignore", error: "Opposition à toute sollicitation" }).eq("id", messageId);
    await admin.from("prospects").update({ status: "refus", next_action_at: null, next_action: "" }).eq("id", p.id).neq("status", "client");
    return { id: messageId, skipped: "cette personne a demandé à ne plus être contactée" };
  }
  if (unsub.data?.length) {
    await admin.from("messages").update({ status: "ignore", error: "Contact désinscrit" }).eq("id", messageId);
    return { id: messageId, skipped: "désinscrit" };
  }
  // Verrou : un seul envoi possible, même si deux demandes arrivent en même temps
  const guard = await bounceGuard(ws);
  if (!guard.ok) throw new HttpError(429, `Envois suspendus : ${guard.bounced} adresses en rebond sur ${guard.sent} envois ces 14 derniers jours (${Math.round(guard.rate * 100)} %). Au-delà de 5 %, ton domaine risque d'être classé en indésirable : vérifie les adresses avant de reprendre.`);
  const { data: claimed } = await admin.from("messages").update({ status: "envoi", claimed_at: new Date().toISOString() })
    .eq("id", messageId).eq("status", "brouillon").select("id");
  if (!claimed?.length) return { id: messageId, skipped: "envoi déjà en cours" };
  // Plafond du jour vérifié après la réservation : des envois simultanés ne peuvent pas le dépasser ensemble
  {
    const day0 = new Date(); day0.setHours(0, 0, 0, 0);
    const [{ count: done }, { count: inflight }] = await Promise.all([
      admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", day0.toISOString()),
      admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "envoi"),
    ]);
    const cap = warmup(ws).cap * await (await import("./boites.ts")).nbBoites(ws);
    if ((done ?? 0) + (inflight ?? 0) > cap) {
      await admin.from("messages").update({ status: "brouillon", claimed_at: null }).eq("id", messageId).eq("status", "envoi");
      throw new HttpError(429, `Limite de ${cap} envois par jour atteinte : la suite partira demain (ça protège ton domaine)`);
    }
  }
  try {
    const link = ws.app_url && ws.booking_slug && msg.step < 2 ? `${ws.app_url.replace(/\/$/, "")}/#/rdv/${ws.booking_slug}?t=${p.public_token}` : "";
    const body = `${msg.body.trim()}${link ? `\n\nSi c'est plus simple, vous pouvez choisir directement un créneau ici : ${link}` : ""}\n\n${signature(ws)}`;
    // Relance : on répond dans le fil du premier message envoyé à la même adresse (boîte connectée seulement ;
    // sans fil possible, l'objet perd son « Re : » pour ne pas faire croire à une réponse)
    let parentKey = "", subject = msg.subject, parentVia: string | null = null;
    if (msg.step > 0) {
      const { data: first } = await admin.from("messages").select("id, sent_via").eq("prospect_id", p.id).eq("step", 0).eq("status", "envoye").order("sent_at").limit(1);
      if (first?.[0]) { parentKey = first[0].id; parentVia = first[0].sent_via ?? null; }
    }
    // Boîte d'envoi : celle du premier message pour une relance, sinon la moins utilisée aujourd'hui
    const { choisir } = await import("./boites.ts");
    const pick = await choisir(ws, warmup(ws).cap, parentVia);
    if (!pick) {
      await admin.from("messages").update({ status: "brouillon", claimed_at: null }).eq("id", messageId).eq("status", "envoi");
      throw new HttpError(429, "Toutes tes boîtes ont atteint leur limite du jour : la suite partira demain");
    }
    const wsx = pick.ws;
    if (!(pick.fil && parentKey && wsx.integrations?.mailbox?.ok)) { parentKey = ""; subject = subject.replace(/^re\s*:\s*/i, ""); }
    const r = await sendMail(wsx, { to: p.email, subject, text: body, replyTo: replyAddress(wsx, p.public_token), prospecting: true, key: msg.id, parentKey: parentKey || undefined });
    await admin.from("messages").update({ status: "envoye", sent_at: new Date().toISOString(), provider_id: r.id, sent_via: wsx.integrations?.mailbox?.ok ? wsx.integrations.mailbox.email : "domaine" }).eq("id", messageId);
    await markWarmup(ws);
    if (["pret", "a_valider", "envoye", "nouveau", "sans_email"].includes(p.status)) await admin.from("prospects").update({ status: "envoye" }).eq("id", p.id);
    return { id: messageId, sent: true };
  } catch (e) {
    // Délai dépassé ou coupure : l'e-mail a pu partir quand même. On ne renvoie jamais automatiquement.
    const msgErr = String((e as Error).message);
    const uncertain = /timeout|timed out|ETIMEDOUT|ECONNRESET|socket|aborted|network/i.test(msgErr);
    await admin.from("messages").update({ status: "echec", error: (uncertain ? "Envoi incertain (coupure) : vérifie ta boîte d'envoi avant de renvoyer. " : "") + msgErr.slice(0, 260) }).eq("id", messageId);
    return { id: messageId, error: msgErr };
  }
}

// ---------------------------------------------------------------- LinkedIn assisté
// Aucun robot sur le compte LinkedIn de l'utilisateur : on trouve le décideur,
// on prépare l'invitation et le message, l'utilisateur envoie lui-même en un clic.
export async function linkedin(ws: Workspace, p: Prospect) {
  const t = (ws.targets ?? []).find((x) => x.id === p.target);
  type L = { url?: string; personne?: string; fonction?: string; note?: string; message?: string };
  const known = /linkedin\.com\/in\//i.test(p.linkedin_url ?? "");
  const v = await askJson<L>(`${known ? `Rédige une note d'invitation LinkedIn et un premier message pour cette personne, dont le profil est déjà connu : ${p.linkedin_person || p.contact_name} (${p.linkedin_url}). Les champs "note" et "message" sont obligatoires ; laisse "url" vide.` : "Trouve sur le web le profil LinkedIn public du décideur à contacter dans cet établissement, puis prépare une invitation et un message."}
Établissement : ${p.name}${p.org ? ` (${p.org})` : ""}, ${p.activity}, ${[p.postal_code, p.city].filter(Boolean).join(" ")}.
${p.contact_name ? `Dirigeant connu : ${p.contact_name}${p.contact_role ? ` (${p.contact_role})` : ""}.` : ""}
Fonction visée : ${t?.interlocuteur || "dirigeant"}.
${(() => { const sg = (p.signals ?? []).filter((x) => x.label && x.type !== "taille" && x.type !== "reseau"); return sg.length ? `Faits publics observés (utilise le plus pertinent comme référence précise) :\n${sg.slice(0, 4).map((x) => `- ${String(x.label).replace(/\s*(?:publi[ée]e? )?(?:au|dans le|selon le) (?:BODACC|registre[^,.;]*)/gi, "")}`).join("\n")}` : ""; })()}
Notre offre : ${ws.profile?.offre ?? ""}
Angle : ${t?.angle ?? ""} (bénéficiaires : ${t?.pour_qui ?? ""})

${known ? "" : `Règles : ne donne une URL que si tu l'as trouvée dans les résultats (format linkedin.com/in/…) et si la personne travaille bien dans cet établissement ou son organisme. Sinon laisse "url" vide.`}
- "note" : note d'invitation de 200 caractères maximum, espaces compris (limite des comptes LinkedIn gratuits). Structure : une référence précise à la personne ou à son entreprise (le fait observé ci-dessous, sinon son métier) + une ligne sur qui nous sommes + aucune demande. Elle ne vend rien : elle rend l'acceptation évidente.
- "message" : premier message après acceptation, 2 à 4 phrases, vouvoiement. Il reprend la référence de la note (continuité), donne d'abord quelque chose d'utile (un chiffre, une info, une idée concrète tirée des faits ci-dessous), puis UNE petite demande (« Un échange de 15 minutes vous serait utile ? »). Pas de lien d'agenda, pas de présentation de l'offre en détail. N'invente aucun fait, aucun contact commun, aucune lecture.
Interdits : « J'espère que vous allez bien », « Je me permets », « Je reviens vers vous », tiret long, emojis.
Format : {"url": "", "personne": "", "fonction": "", "note": "", "message": ""}`,
    { fast: true, maxTokens: 6000, system: systemFor(ws), ...(known ? {} : { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }] }) });
  const url = known ? String(p.linkedin_url) : String(v.url ?? "").trim();
  const ok = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^\s/?#]+/i.test(url);
  const patch = {
    linkedin_url: ok ? url.replace(/[?#].*$/, "").slice(0, 200) : "",
    linkedin_person: known && p.linkedin_person ? p.linkedin_person : ok ? `${String(v.personne ?? "").slice(0, 60)}${v.fonction ? ` · ${String(v.fonction).slice(0, 60)}` : ""}` : "",
    // 200 caractères au plus (comptes gratuits), coupé proprement à la fin d'un mot
    linkedin_note: (() => { const n = humanize(String(v.note ?? "")); return n.length <= 200 ? n : n.slice(0, 200).replace(/\s+\S*$/, "").replace(/[,;:]$/, "") + "."; })(),
    linkedin_msg: humanize(String(v.message ?? "")).slice(0, 1200),
    // Prêt seulement si la note et le message sont écrits : jamais d'invitation vide
    linkedin_status: !ok ? "introuvable" : String(v.note ?? "").trim() && String(v.message ?? "").trim() ? "a_envoyer" : "",
  };
  await admin.from("prospects").update(patch).eq("id", p.id);
  return { id: p.id, ...patch };
}

// ---------------------------------------------------------------- Relances
// Sans réponse marquée, une relance est préparée à J+4 puis à J+9 ; elle arrive
// dans la file de validation (l'utilisateur confirme qu'il n'y a pas eu de réponse).
/** Délais des relances (jours après le premier e-mail), réglables par le client : 2 valeurs croissantes entre 2 et 60. */
export function followupDays(ws: { followup_days?: number[] | null }): number[] {
  const d = (ws.followup_days ?? []).map(Number);
  return d.length === 2 && d.every((x) => Number.isInteger(x) && x >= 2 && x <= 60) && d[0] < d[1] ? d : FOLLOW.map((f) => f.after);
}

export const FOLLOW = [
  // Première relance : une offre légère et concrète (échelle d'offre). Écrite par l'IA quand c'est possible, sinon ce modèle.
  { after: 5, subject: (s: string) => `Re : ${s.replace(/^re\s*:\s*/i, "")}`, body: (hello: string) => `${hello}\n\nSi c'est utile, je peux vous envoyer un exemple concret de ce que nous faisons pour des entreprises comme la vôtre, en une page. Voulez-vous que je vous l'envoie ?` },
  { after: 12, subject: (s: string) => `Re : ${s.replace(/^re\s*:\s*/i, "")}`, body: (hello: string) => `${hello}\n\nJe n'insiste pas : si ce n'est pas le moment, aucun souci. Et si quelqu'un d'autre s'occupe de ce sujet chez vous, me diriez-vous qui contacter ?` },
];

/** La séquence de l'espace : étapes après le premier e-mail (jours comptés depuis ce premier e-mail). Par défaut,
 *  deux relances par e-mail aux délais réglés. Une réponse arrête tout (le prospect quitte le statut « envoyé »). */
export type Etape = { apres: number; canal: "email" | "linkedin" | "appel"; texte?: string; si?: "toujours" | "linkedin_connu" | "telephone_connu" };
export function sequence(ws: Workspace): Etape[] {
  const e = ((ws as { sequence?: { etapes?: Etape[] } }).sequence?.etapes ?? []).filter((x) => x && ["email", "linkedin", "appel"].includes(x.canal) && Number.isInteger(x.apres) && x.apres >= 1 && x.apres <= 90);
  if (e.length) return e.slice(0, 6);
  return followupDays(ws).map((d) => ({ apres: d, canal: "email" as const, texte: "", si: "toujours" as const }));
}
/** Remplace {prenom}, {nom}, {entreprise}, {ville} ; une variable inconnue disparaît proprement. */
export function remplir(t: string, p: { contact_name?: string | null; name?: string | null; city?: string | null }) {
  const parts = String(p.contact_name ?? "").trim().split(/\s+/).filter(Boolean);
  const v: Record<string, string> = { prenom: parts[0] ?? "", nom: parts.slice(1).join(" "), entreprise: String(p.name ?? ""), ville: String(p.city ?? "") };
  return t.replace(/ ?\{(prenom|nom|entreprise|ville)\}/gi, (m, k) => (v[k.toLowerCase()] ? `${m.startsWith(" ") ? " " : ""}${v[k.toLowerCase()]}` : "")).replace(/ +,/g, ",");
}

export async function followups(ws: Workspace) {
  const etapes = sequence(ws);
  const { data: sent } = await admin.from("messages").select("id, prospect_id, step, subject, body, sent_at, campaign_id, variant, prospects!inner(status, name, city, contact_name, phone, linkedin_url, seq_etape, next_action_at)")
    .eq("workspace_id", ws.id).eq("status", "envoye").eq("prospects.status", "envoye").order("sent_at", { ascending: false }).limit(500);
  type L = { step: number; subject: string; body: string; sent_at: string; first: string; firstBody: string; campaign_id: string | null; variant: string; p: Record<string, unknown> };
  const last = new Map<string, L>();
  for (const m of [...(sent ?? [])].reverse()) {
    const cur = last.get(m.prospect_id);
    const base = { step: m.step, subject: m.subject, body: m.body, sent_at: m.sent_at, campaign_id: m.campaign_id ?? null, variant: m.variant ?? "", p: m.prospects as unknown as Record<string, unknown> };
    if (!cur) last.set(m.prospect_id, { ...base, first: m.subject, firstBody: m.body });
    else if (m.step > cur.step) last.set(m.prospect_id, { ...base, first: cur.first, firstBody: cur.firstBody });
  }
  const { data: noFollow } = await admin.from("campaigns").select("id").eq("workspace_id", ws.id).or("followups.eq.false,status.neq.active");
  const skipCamp = new Set((noFollow ?? []).map((x) => x.id));
  const { data: pending } = await admin.from("messages").select("prospect_id").eq("workspace_id", ws.id).eq("status", "brouillon");
  const busy = new Set((pending ?? []).map((x) => x.prospect_id));
  // Relance déjà tentée (échec, ou envoi interrompu au statut inconnu) : jamais recréée, pour ne pas risquer un double envoi
  const { data: failed } = await admin.from("messages").select("prospect_id, step").eq("workspace_id", ws.id).eq("status", "echec");
  const tried = new Set((failed ?? []).map((x) => `${x.prospect_id}:${x.step}`));
  const firstSent = new Map<string, string>();
  for (const m of sent ?? []) if (m.step === 0) firstSent.set(m.prospect_id, m.sent_at);
  const today = new Date().toISOString().slice(0, 10);
  const lastEmail = etapes.map((e) => e.canal).lastIndexOf("email");
  let created = 0, taches = 0;
  for (const [pid, m] of last) {
    const k = Number.isInteger(m.p.seq_etape) ? Number(m.p.seq_etape) : m.step;
    if (busy.has(pid) || k >= etapes.length || (m.campaign_id && skipCamp.has(m.campaign_id))) continue;
    const e = etapes[k];
    const start = new Date(firstSent.get(pid) ?? m.sent_at).getTime();
    if (Date.now() - start < e.apres * 86400_000) continue;
    const avance = async () => { await admin.from("prospects").update({ seq_etape: k + 1 }).eq("id", pid); };
    // Condition non remplie : étape sautée
    if ((e.si === "linkedin_connu" && !m.p.linkedin_url) || (e.si === "telephone_connu" && !m.p.phone)) { await avance(); continue; }
    if (e.canal === "email") {
      if (tried.has(`${pid}:${k + 1}`)) { await avance(); continue; }
      const hello = (m.firstBody.split("\n")[0] || "Bonjour,").slice(0, 80);
      let body: string;
      if (e.texte?.trim()) { const t = remplir(e.texte.trim(), m.p as never); body = /^(bonjour|madame|monsieur|cher|chère|hello)/i.test(t) ? t : `${hello}\n\n${t}`; }
      else if (k === lastEmail && k > 0) body = FOLLOW[1].body(hello);
      else if (!etapes.slice(0, k).some((x) => x.canal === "email")) body = await offerFollowup(ws, m.firstBody, hello).catch(() => FOLLOW[0].body(hello));
      else body = FOLLOW[0].body(hello);
      const { error } = await admin.from("messages").insert({ workspace_id: ws.id, prospect_id: pid, step: k + 1, subject: `Re : ${m.first.replace(/^re\s*:\s*/i, "")}`, body, status: "brouillon", campaign_id: m.campaign_id, variant: m.variant });
      if (!error) { created++; await avance(); }
    } else {
      // LinkedIn ou appel : une tâche du jour sur la fiche (elle apparaît dans « Ton matin »)
      const qui = String(m.p.contact_name || m.p.name || "");
      const defaut = e.canal === "appel" ? `Appeler ${qui}${m.p.phone ? ` (${m.p.phone})` : ""}` : `LinkedIn : inviter ${qui} et lui écrire`;
      await admin.from("prospects").update({ seq_etape: k + 1, next_action: (e.texte?.trim() ? remplir(e.texte.trim(), m.p as never) : defaut).slice(0, 300), next_action_at: today }).eq("id", pid);
      taches++;
    }
  }
  const suivants = await nextContacts(ws, last, etapes.length).catch(() => 0);
  return { created, taches, suivants };
}

/** Première relance avec une offre légère tirée de ce que vend le client (« Voulez-vous que je vous envoie… ? »). */
export async function offerFollowup(ws: Workspace, first: string, hello: string) {
  const out = await ask(`Écris la première relance d'un e-mail de prospection resté sans réponse. Une seule phrase, après la formule d'appel : la proposition elle-même, sans rappeler le premier message (jamais « je reviens », « je me permets », « suite à mon message »).
Premier e-mail envoyé :
${first.slice(0, 1200)}

Ce que nous vendons : ${ws.profile?.offre ?? ""}
Consigne : propose UNE chose concrète, légère et sans engagement, que nous pouvons vraiment fournir vu notre offre (un exemple, un mini-diagnostic, une liste, un chiffre utile), sous la forme « Voulez-vous que je vous envoie … ? ». Ne répète pas le premier e-mail. Pas de rendez-vous. N'invente aucun chiffre ni aucun client.
Réponds uniquement par le texte de la relance, sans formule d'appel ni signature.`, { fast: true, maxTokens: 300, system: systemFor(ws) + PLAYBOOK_ECRITURE });
  const t = humanize(out.replace(/^bonjour[^\n]*\n+/i, "")).trim();
  if (t.length < 20 || t.length > 500) throw new Error("relance inutilisable");
  return `${hello}\n\n${t}`;
}

/** Plusieurs contacts par entreprise (adapté de Harvey) : la séquence est finie sans réponse depuis 10 jours
 *  → un autre décideur vérifié de la même entreprise devient un nouveau prospect, à valider. Jamais deux personnes en même temps. */
async function nextContacts(ws: Workspace, last: Map<string, { step: number; sent_at: string; p?: Record<string, unknown> }>, nEtapes: number) {
  const done = [...last.entries()].filter(([, m]) => (Number.isInteger(m.p?.seq_etape) ? Number(m.p!.seq_etape) : m.step) >= nEtapes && Date.now() - new Date(m.sent_at).getTime() > 10 * 864e5).map(([pid]) => pid).slice(0, 20);
  if (!done.length) return 0;
  const { data: ps } = await admin.from("prospects").select("*").in("id", done).eq("status", "envoye");
  let n = 0;
  for (const p of ps ?? []) {
    if ((p.insight as { suite_contact?: string } | null)?.suite_contact) continue;
    const { data: cs } = await admin.from("contacts").select("id, name, role, email, linkedin_url").eq("prospect_id", p.id).eq("email_status", "verifie").neq("email", "").limit(5);
    const c = (cs ?? []).find((x) => x.email.toLowerCase() !== String(p.email ?? "").toLowerCase());
    if (!c) continue;
    const { data: dup } = await admin.from("prospects").select("id").eq("workspace_id", ws.id).ilike("email", c.email).limit(1);
    await admin.from("prospects").update({ insight: { ...((p.insight as Record<string, unknown>) ?? {}), suite_contact: c.id } }).eq("id", p.id);
    if (dup?.length) continue;
    const { error } = await admin.from("prospects").insert({
      workspace_id: ws.id, target: p.target, name: p.name, org: p.org, siren: p.siren, siret: p.siret, activity: p.activity, address: p.address, postal_code: p.postal_code, city: p.city,
      website: p.website, signals: p.signals, score: p.score, contact_name: c.name, contact_role: c.role, email: c.email, email_source: "contact vérifié", linkedin_url: c.linkedin_url ?? "",
      status: "pret", channel: "email", source: "deuxieme_contact", notes: `Deuxième interlocuteur : ${p.contact_name || "le premier contact"} n'a pas répondu après les relances.`,
    });
    if (!error) { n++; await log(ws.id, "prospect", `${p.name} : deuxième interlocuteur (${c.name}) préparé, le premier n'a pas répondu`); }
  }
  return n;
}

/** E-mails restés « envoi en cours » plus de 15 min (coupure entre l'envoi et l'enregistrement) :
 *  statut inconnu, donc jamais renvoyés automatiquement. Ils passent en échec avec une consigne de vérification. */
export async function reconcileStuck() {
  const limit = new Date(Date.now() - 15 * 60000).toISOString();
  const { data } = await admin.from("messages").update({ status: "echec", error: "Envoi interrompu, statut inconnu : vérifie ta boîte d'envoi avant de renvoyer (aucun renvoi automatique)." })
    .eq("status", "envoi").lt("claimed_at", limit).select("id, workspace_id");
  for (const m of data ?? []) await log(m.workspace_id, "envoi", "Un envoi interrompu est à vérifier (aucun renvoi automatique)");
  return (data ?? []).length;
}
