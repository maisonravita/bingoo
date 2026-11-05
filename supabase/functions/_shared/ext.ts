// Extension Chrome : fiche Bingoo! de l'entreprise dont le client visite le site (signaux Radar, outils, contacts), ajout aux prospects.
import { HttpError } from "./http.ts";
import { admin, type Workspace } from "./core.ts";

// Domaine enregistrable : « gouv.fr », « co.uk »… comptent comme un seul suffixe (sinon tous les sites publics se confondraient)
const SUFFIX2 = /\.(gouv|asso|nom|presse|tm|com|net|org|ac|co|ltd|plc|me|sch|gov|edu|or|ne|go|in|qc|ab)\.[a-z]{2}$/i;
const base = (h: string) => { const x = h.toLowerCase().replace(/^www\./, "").split("."); return x.slice(SUFFIX2.test(h) ? -3 : -2).join("."); };
const esc = (v: string) => v.replace(/[%_\\]/g, "\\$&");
const cap = (s: string) => String(s ?? "").toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
const LABEL: Record<string, string> = { appel_offres: "Appel d'offres", renouvellement: "Contrat public à renouveler", dirigeant: "Nouveau dirigeant", demenagement: "Déménagement", creation: "Création", etablissement: "Nouvel établissement", recrutement: "Recrutement", croissance: "Croissance", levee: "Levée de fonds", client_concurrent: "Cliente d'un concurrent", abonnement: "Abonnement concurrent à renouveler", outil: "Changement d'outils", obligation: "Obligation réglementaire", visite: "A visité ton site", essai: "Équipe à l'essai", demande: "Cherche une solution", avis: "Mécontente d'un concurrent", champion: "Ancien utilisateur", site: "Site modifié", besoin: "Besoin exprimé", aide: "Aide publique", permis: "Permis de construire", budget: "Projet voté", salon: "Salon", difficulte: "Difficultés financières" };

/** Fiche de l'entreprise d'un site : ce que Bingoo! sait déjà, sinon le registre officiel et les outils du site. */
export async function extLookup(ws: Workspace, url: string) {
  let host = "";
  try { host = new URL(url).hostname; } catch { throw new HttpError(400, "Adresse invalide"); }
  if (!/\./.test(host) || /^(localhost|127\.)/.test(host)) throw new HttpError(400, "Ouvre le site d'une entreprise");
  if (/(^|\.)linkedin\.com$/i.test(host)) return { unsupported: true, linkedin: true, message: "Ouvre le profil d'une personne pour l'ajouter à tes prospects LinkedIn." };
  if (/(^|\.)(linkedin\.com|google\.[a-z.]+|facebook\.com|instagram\.com|youtube\.com|x\.com|twitter\.com)$/i.test(host)) return { unsupported: true, message: "Bingoo! lit les sites d'entreprises. LinkedIn et les réseaux sociaux ne sont pas lus automatiquement." };
  const dom = base(host);
  const [{ data: comps }, { data: ps }, { data: scan }] = await Promise.all([
    admin.from("competitors").select("id, name, url").eq("workspace_id", ws.id).neq("status", "ecarte").ilike("url", `%${esc(dom)}%`).limit(1),
    admin.from("prospects").select("id, name, siren, city, status, contact_name, contact_role, email, phone, website, score").eq("workspace_id", ws.id).ilike("website", `%${esc(dom)}%`).limit(1),
    admin.from("company_scan").select("name, siren, tech, ats, jobs_n").eq("workspace_id", ws.id).ilike("url", `%${esc(dom)}%`).limit(1),
  ]);
  if (comps?.[0]) return { competitor: { id: comps[0].id, name: comps[0].name }, message: "C'est un de tes concurrents : son dossier complet est dans Concurrents." };
  const p = ps?.[0] ?? null;
  // Outils et nom de l'entreprise lus sur le site
  const { fetchHtml } = await import("./analyze.ts");
  const { toolsIn } = await import("./tech-fp.ts");
  const html = await fetchHtml(`https://${host}`).catch(() => "");
  const tools = (scan?.[0]?.tech as string[] | undefined)?.length ? scan![0].tech as string[] : toolsIn(html);
  const siteName = (html.match(/property=["']og:site_name["'][^>]*content=["']([^"']{2,60})/i)?.[1] ?? html.match(/<title[^>]*>([^<]{2,80})/i)?.[1] ?? dom.split(".")[0]).split(/\s[|–—-]\s/)[0].replace(/&amp;/g, "&").trim();
  // Registre officiel : SIREN, ville, dirigeant
  let reg: { siren: string; nom: string; ville: string; naf: string; dirigeant: string | null; role: string | null } | null = null;
  const siren = p?.siren ?? scan?.[0]?.siren ?? null;
  const { lookup } = await import("./radar-signals.ts");
  if (siren) { const c = await lookup(siren).catch(() => null); if (c) reg = { siren, nom: c.nom, ville: c.ville ?? "", naf: c.naf ?? "", dirigeant: c.dirigeant ?? null, role: c.role ?? null }; }
  else {
    const u = new URL("https://recherche-entreprises.api.gouv.fr/search");
    u.searchParams.set("q", siteName); u.searchParams.set("per_page", "3"); u.searchParams.set("etat_administratif", "A");
    const d = await fetch(u, { signal: AbortSignal.timeout(10000) }).then((r) => r.ok ? r.json() : null).catch(() => null);
    // deno-lint-ignore no-explicit-any
    const h = ((d?.results ?? []) as any[]).find((x) => String(x.nom_complet ?? "").toLowerCase().includes(siteName.toLowerCase().split(/\s/)[0])) ?? null;
    if (h) {
      // deno-lint-ignore no-explicit-any
      const b = (h.dirigeants ?? []).find((x: any) => x.type_dirigeant === "personne physique" && x.nom && !/commissaire/i.test(x.qualite ?? ""));
      reg = { siren: h.siren, nom: cap(h.nom_complet), ville: cap(h.siege?.libelle_commune ?? ""), naf: h.activite_principale ?? "", dirigeant: b ? cap(`${String(b.prenoms ?? "").split(" ")[0]} ${b.nom}`) : null, role: b ? cap(b.qualite ?? "Dirigeant") : null };
    }
  }
  // Signaux Radar sur cette entreprise
  const sir = p?.siren ?? reg?.siren ?? null;
  const name = p?.name ?? reg?.nom ?? siteName;
  let q = admin.from("radar_opps").select("kind, title, summary, why, score, deadline, created_at").eq("workspace_id", ws.id).in("status", ["nouveau", "suivi", "ajoute"]).order("score", { ascending: false }).limit(5);
  // Sans SIREN : correspondance sur le nom complet (jamais sur un premier mot du type « Le » ou « Groupe »)
  q = sir ? q.eq("siren", sir) : q.ilike("company", esc(name.trim()));
  const { data: opps } = await q;
  const { data: contacts } = p ? await admin.from("contacts").select("name, role, email, email_status, linkedin_url").eq("prospect_id", p.id).limit(4) : { data: [] };
  const { data: cfg } = await admin.from("workspaces").select("radar_cfg").eq("id", ws.id).single();
  const rivals = ((cfg?.radar_cfg as { outils_rivaux?: string[] } | null)?.outils_rivaux ?? []);
  return {
    company: { name, siren: sir, city: p?.city ?? reg?.ville ?? "", naf: reg?.naf ?? "", site: host },
    prospect: p ? { id: p.id, status: p.status, email: p.email, phone: p.phone } : null,
    signals: ((opps ?? []) as { kind: string; title: string; summary: string; why: string; score: number; deadline: string | null }[]).map((o) => ({ label: LABEL[o.kind] ?? o.kind, title: o.title, why: o.why || o.summary, score: o.score, deadline: o.deadline })),
    tools, rival_tools: tools.filter((t) => rivals.includes(t)),
    contacts: (contacts ?? []).length ? contacts : reg?.dirigeant ? [{ name: reg.dirigeant, role: reg.role, email: "", email_status: "", linkedin_url: "" }] : [],
    hiring: scan?.[0]?.jobs_n ?? null,
  };
}

/** Ajoute l'entreprise du site visité aux prospects (registre officiel quand on la trouve). */
export async function extAdd(ws: Workspace, url: string) {
  const f = await extLookup(ws, url);
  if ("unsupported" in f || "competitor" in f) throw new HttpError(400, String((f as { message?: string }).message ?? "Impossible d'ajouter cette page"));
  if (f.prospect) return { prospect_id: f.prospect.id, existing: true };
  const c0 = (f.contacts as { name: string; role: string | null }[])[0];
  const { data, error } = await admin.from("prospects").insert({
    workspace_id: ws.id, target: "", name: f.company.name, siren: f.company.siren, city: f.company.city, website: `https://${f.company.site}`,
    contact_name: c0?.name ?? "", contact_role: c0?.role ?? "", source: "extension", notes: "Ajouté depuis l'extension Chrome Bingoo!",
  }).select("id").single();
  if (error) throw new HttpError(500, error.message);
  await admin.from("activity").insert({ workspace_id: ws.id, kind: "prospect", summary: `${f.company.name} ajouté depuis l'extension Chrome` });
  return { prospect_id: data.id, existing: false };
}

/** Ajoute la personne d'un profil LinkedIn ouvert dans le navigateur : prospect + note d'invitation et premier message préparés. */
export async function extAddLinkedin(ws: Workspace, b: { url?: unknown; personne?: unknown; titre?: unknown }) {
  // Profil classique (linkedin.com/in/…) ou fiche Sales Navigator (linkedin.com/sales/lead/…)
  const raw = String(b.url ?? "");
  const sales = raw.match(/^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/sales\/(?:lead|people)\/([^/?#,]{6,120})/i);
  const m = sales ?? raw.match(/^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/([^/?#]{2,100})/i);
  if (!m) throw new HttpError(400, "Ouvre le profil LinkedIn d'une personne (adresse en linkedin.com/in/…)");
  const url = sales ? `https://www.linkedin.com/sales/lead/${m[2]}` : `https://www.linkedin.com/in/${m[2]}`;
  const person = String(b.personne ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const title = String(b.titre ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  if (person.length < 3) throw new HttpError(400, "Nom introuvable sur ce profil, recharge la page LinkedIn");
  const { data: dup } = await admin.from("prospects").select("id, linkedin_status").eq("workspace_id", ws.id).ilike("linkedin_url", `%/${sales ? "sales/lead" : "in"}/${esc(m[2])}%`).limit(1);
  if (dup?.[0]) return { prospect_id: dup[0].id, existing: true };
  // Entreprise tirée du titre : « Directrice achats chez Acme », « CEO at Acme », « Fondateur | Acme »
  const company = (title.match(/\b(?:chez|at|@)\s+([^|,·•]{2,60})/i)?.[1] ?? title.split(/\s[|·•]\s/)[1] ?? "").trim();
  const role = title.split(/\s(?:chez|at|@)\s|\s[|·•]\s/i)[0].trim().slice(0, 80);
  const { data, error } = await admin.from("prospects").insert({
    workspace_id: ws.id, target: "", name: company || person, contact_name: person, contact_role: role,
    linkedin_url: url, linkedin_person: `${person}${role ? ` · ${role}` : ""}`, source: "extension", notes: "Ajouté depuis un profil LinkedIn (extension Chrome Bingoo!)",
  }).select("*").single();
  if (error) throw new HttpError(500, error.message);
  await admin.from("activity").insert({ workspace_id: ws.id, kind: "prospect", summary: `${person} ajouté depuis LinkedIn` });
  // Note et message écrits tout de suite (profil déjà connu : pas de recherche web), en brouillon : le client relit et valide
  const { linkedin } = await import("./agents.ts");
  const r = await linkedin(ws, data).catch(() => null);
  if (r?.linkedin_status === "a_envoyer") await admin.from("prospects").update({ linkedin_status: "" }).eq("id", data.id);
  return { prospect_id: data.id, existing: false, pret: !!(r?.linkedin_note && r?.linkedin_msg), personne: person, note: r?.linkedin_note ?? "", message: r?.linkedin_msg ?? "" };
}

const LI_LABEL: Record<string, string> = { "": "Ajouté, invitation à valider", a_envoyer: "Invitation prête", envoye: "Invitation envoyée", invite: "Invitation envoyée", connecte: "Connecté", message_envoye: "Message envoyé", introuvable: "Profil introuvable" };

/** Où en est la personne de ce profil LinkedIn : déjà prospect ? invitée ? a répondu ? */
export async function extLinkedinStatus(ws: Workspace, b: { url?: unknown }) {
  const m = String(b.url ?? "").match(/linkedin\.com\/(in|sales\/lead|sales\/people)\/([^/?#,]{2,120})/i);
  if (!m) return { prospect: null };
  const key = m[1] === "in" ? `/in/${m[2]}` : `/sales/lead/${m[2]}`;
  const { data: p } = await admin.from("prospects").select("id, name, status, linkedin_status, linkedin_note, linkedin_msg, created_at").eq("workspace_id", ws.id).ilike("linkedin_url", `%${esc(key)}%`).limit(1).maybeSingle();
  if (!p) return { prospect: null };
  const { data: acts } = await admin.from("linkedin_actions").select("kind, status, done_at").eq("prospect_id", p.id).eq("status", "fait").order("done_at", { ascending: false });
  const at = (k: string) => (acts ?? []).find((a) => a.kind === k)?.done_at ?? null;
  const fr = (d: string | null) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }) : "";
  let statut = LI_LABEL[p.linkedin_status ?? ""] ?? "Dans tes prospects";
  if (p.linkedin_status === "invite" && at("invitation")) statut = `Invité le ${fr(at("invitation"))}`;
  if (p.linkedin_status === "message_envoye" && at("message")) statut = `Message envoyé le ${fr(at("message"))}`;
  if (at("relance")) statut = `Relancé le ${fr(at("relance"))}`;
  if (["repondu", "rdv", "client"].includes(p.status)) statut = p.status === "rdv" ? "Rendez-vous pris" : p.status === "client" ? "Client" : "A répondu";
  return { prospect: { id: p.id, name: p.name, statut, brouillon: !p.linkedin_status && !!p.linkedin_note, note: p.linkedin_note, message: p.linkedin_msg, depuis: fr(p.created_at) } };
}

/** Le client valide (et a pu corriger) la note et le message : l'invitation entre dans la file du pilote. */
export async function extLinkedinValidate(ws: Workspace, b: { items?: unknown }) {
  const { humanize } = await import("./playbooks.ts");
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 10) as { prospect_id?: string; note?: string; message?: string }[];
  let ok = 0;
  for (const it of items) {
    const note = humanize(String(it.note ?? "")).slice(0, 200), message = humanize(String(it.message ?? "")).slice(0, 1200);
    if (!it.prospect_id || !note || !message) continue;
    const { data } = await admin.from("prospects").update({ linkedin_note: note, linkedin_msg: message, linkedin_status: "a_envoyer" })
      .eq("id", String(it.prospect_id)).eq("workspace_id", ws.id).in("linkedin_status", ["", "a_envoyer"]).select("id");
    ok += (data ?? []).length;
  }
  return { valides: ok };
}

/** Ajout groupé depuis une page de résultats de recherche LinkedIn : 10 profils au plus, chacun en brouillon. */
export async function extAddLinkedinMany(ws: Workspace, b: { items?: unknown }) {
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 10) as { url?: string; personne?: string; titre?: string }[];
  const out: unknown[] = [];
  for (let i = 0; i < items.length; i += 4) {
    out.push(...await Promise.all(items.slice(i, i + 4).map((it) => extAddLinkedin(ws, it).catch((e) => ({ erreur: String((e as Error).message), personne: it.personne })))));
  }
  return { resultats: out };
}


/** Badge de l'extension (si le client l'a activé) : nombre de signaux connus pour le domaine, sans IA ni lecture du site. */
export async function extSignalCount(ws: Workspace, url: string) {
  let host = ""; try { host = new URL(url).hostname; } catch { return { n: 0 }; }
  const dom = base(host);
  if (!dom.includes(".") || /(^|\.)(linkedin|google|facebook|instagram|youtube|x|twitter)\./i.test(`.${dom}`)) return { n: 0 };
  const [{ data: comp }, { data: p }] = await Promise.all([
    admin.from("competitors").select("id").eq("workspace_id", ws.id).ilike("url", `%${esc(dom)}%`).limit(1),
    admin.from("prospects").select("siren, name, status").eq("workspace_id", ws.id).ilike("website", `%${esc(dom)}%`).limit(1).maybeSingle(),
  ]);
  if (comp?.[0]) return { n: 0, concurrent: true };
  if (!p?.siren) return { n: 0, prospect: !!p };
  const { count } = await admin.from("radar_opps").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("siren", p.siren).in("status", ["nouveau", "suivi", "ajoute"]);
  return { n: count ?? 0, prospect: true };
}

/** Bingoo! dans Gmail : la fiche du prospect qui t'écrit (ou à qui tu écris). Rien n'est renvoyé si l'adresse n'est pas un prospect. */
export async function extLookupEmail(ws: Workspace, email: string) {
  const e = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { prospect: null };
  const { data: p } = await admin.from("prospects").select("id, name, city, status, contact_name, contact_role, signals, next_action, next_action_at, linkedin_status").eq("workspace_id", ws.id).ilike("email", esc(e)).limit(1).maybeSingle();
  if (!p) return { prospect: null };
  const [{ data: last }, { data: rep }] = await Promise.all([
    admin.from("messages").select("subject, sent_at").eq("prospect_id", p.id).eq("status", "envoye").order("sent_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("replies").select("class, summary, created_at").eq("prospect_id", p.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const sig = ((p.signals ?? []) as { label?: string; type?: string }[]).find((x) => x.label && !["taille", "reseau"].includes(x.type ?? ""));
  const STATUT: Record<string, string> = { nouveau: "Nouveau", sans_email: "Sans e-mail", pret: "Prêt", a_valider: "Message à valider", envoye: "Contacté", repondu: "A répondu", rdv: "Rendez-vous", client: "Client", refus: "Pas intéressé", ignore: "Écarté" };
  return { prospect: { id: p.id, name: p.name, city: p.city, contact: [p.contact_name, p.contact_role].filter(Boolean).join(", "), statut: STATUT[p.status] ?? p.status,
    signal: sig?.label ? String(sig.label).replace(/\s*(?:publi[ée]e? )?(?:au|dans le) (?:BODACC|registre[^,.;]*)/gi, "") : "",
    dernier_envoi: last ? { objet: last.subject, le: last.sent_at } : null, derniere_reponse: rep ? { resume: rep.summary, le: rep.created_at } : null,
    prochaine: p.next_action ? { quoi: p.next_action, le: p.next_action_at } : null } };
}
