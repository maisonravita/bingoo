// Radar : trouver LA bonne personne pour une opportunité, avec son e-mail, le téléphone et son profil LinkedIn public.
// 1. La fonction à viser dépend du signal (acheteur public pour un contrat, responsable concerné pour un recrutement, interlocuteur de la cible sinon).
// 2. Le registre, le site de l'entreprise (téléphone, e-mail publié) puis le chercheur de décideurs (pages publiques, profils LinkedIn trouvés par recherche web).
// 3. E-mails nominatifs : uniquement publiés tels quels, ou vérifiés par un fournisseur (cascade) ; jamais devinés.
import { HttpError } from "./http.ts";
import { admin, type Workspace } from "./core.ts";
import { findContacts, providers } from "./contacts.ts";

const PUBLIC = ["renouvellement", "budget"];

/** Fonctions à viser pour ce type de signal. */
export function rolesFor(kind: string, interlocuteur: string, raw: Record<string, unknown> = {}) {
  const base = interlocuteur || "dirigeant";
  if (PUBLIC.includes(kind)) return "responsable de la commande publique, acheteur, directeur des services techniques, directeur général des services";
  if (kind === "recrutement") {
    const poste = String((raw.offres as { title?: string }[] | undefined)?.[0]?.title ?? "");
    return /(commercial|sales|business|account|sdr|bdr)/i.test(poste) ? `directeur commercial, head of sales, ${base}` : /(rh|people|talent|recrut)/i.test(poste) ? `DRH, responsable RH, ${base}` : base;
  }
  if (kind === "etablissement" || kind === "demenagement") return `directeur de site, responsable des services généraux, ${base}`;
  if (kind === "dirigeant") return `nouveau dirigeant, ${base}`;
  return base;
}

/** Acheteur public : le contact « commande publique » publié dans ses derniers avis officiels (BOAMP), avec e-mail et téléphone. */
async function publicBuyerContact(buyer: string) {
  const words = buyer.replace(/\(.*?\)/g, " ").replace(/["\\]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !/^(commune|ville|mairie|communaute|agglomeration|departement|region|syndicat|centre|etablissement)$/i.test(w.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))).slice(0, 3);
  if (!words.length) return null;
  const u = new URL("https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records");
  u.searchParams.set("where", words.map((w) => `search(nomacheteur, "${w}")`).join(" and "));
  u.searchParams.set("order_by", "dateparution desc"); u.searchParams.set("limit", "10"); u.searchParams.set("select", "idweb,nomacheteur,dateparution");
  const d = await fetch(u, { signal: AbortSignal.timeout(15000) }).then((r) => r.ok ? r.json() : null).catch(() => null);
  const { boampAvis } = await import("./radar-plus.ts");
  // Même type d'acheteur : une commune n'est pas sa communauté d'agglomération (services achats différents)
  const kindOf = (n: string) => { const x = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); return /communaute|agglomeration|metropole|intercommunal/.test(x) ? "epci" : /\b(commune|ville|mairie)\b/.test(x) ? "commune" : /departement|departemental/.test(x) ? "dept" : /\bregion/.test(x) ? "region" : ""; };
  const want = kindOf(buyer);
  for (const r of ((d?.results ?? []) as { idweb: string; nomacheteur: string; dateparution: string }[]).filter((x) => !want || !kindOf(x.nomacheteur) || kindOf(x.nomacheteur) === want).slice(0, 5)) {
    const a = await boampAvis(r.idweb).catch(() => null);
    const c = a?.contact;
    if (c && (c.email || c.tel)) return { nom: c.nom || "Service de la commande publique", email: (c.email ?? "").toLowerCase(), tel: c.tel ?? "", source: `Avis officiel BOAMP du ${new Date(r.dateparution).toLocaleDateString("fr-FR")}`, url: `https://www.boamp.fr/pages/avis/?q=idweb:${r.idweb}` };
  }
  return null;
}

/** Cherche les contacts d'une opportunité et les rattache à sa fiche. */
export async function oppContacts(ws: Workspace, oppId: string, cached = false) {
  const { data: o } = await admin.from("radar_opps").select("*").eq("id", oppId).eq("workspace_id", ws.id).single();
  if (!o) throw new HttpError(404, "Opportunité introuvable");
  if (o.kind === "appel_offres") return { contacts: [], note: "Pour un appel d'offres, le contact officiel est dans l'avis (acheteur public).", providers: providers() };
  // Déjà cherché : on renvoie le résultat gardé (une seule recherche payante par opportunité)
  if (cached && o.raw?.contacts_at && o.prospect_id) {
    const { data: rows } = await admin.from("contacts").select("*").eq("prospect_id", o.prospect_id).order("created_at");
    return { prospect_id: o.prospect_id, contacts: rows ?? [], cached: true, providers: providers() };
  }
  const { radarToProspect } = await import("./radar.ts");
  const { prospect_id } = await radarToProspect(ws, o.id);
  const { data: p } = await admin.from("prospects").select("*").eq("id", prospect_id).single();
  if (!p) throw new HttpError(404, "Entreprise introuvable");
  const t = (ws.targets ?? []).find((x) => x.id === p.target) ?? (ws.targets ?? [])[0];
  const roles = rolesFor(o.kind, t?.interlocuteur ?? "", o.raw ?? {});
  // Téléphone et e-mail publiés sur le site (gratuit)
  let phone = p.phone || "";
  if (p.website) {
    const { siteContacts } = await import("./deep.ts");
    const sc = await siteContacts(p.website).catch(() => null);
    if (!phone && sc?.phones?.[0]) { phone = sc.phones[0]; await admin.from("prospects").update({ phone }).eq("id", p.id); }
  }
  // Acheteur public : son service achats, publié dans ses avis officiels
  if (PUBLIC.includes(o.kind)) {
    const c = await publicBuyerContact(o.company).catch(() => null);
    if (c) {
      await admin.from("contacts").upsert({ workspace_id: ws.id, prospect_id: p.id, name: c.nom, role: `Commande publique · ${o.company}`, linkedin_url: "", source: c.url, ...(c.email ? { email: c.email, email_status: "publie", email_source: c.source } : {}) }, { onConflict: "prospect_id,name" });
      if (c.tel && !phone) { phone = c.tel; await admin.from("prospects").update({ phone }).eq("id", p.id); }
      if (c.email && !p.email) await admin.from("prospects").update({ email: c.email, email_source: c.source }).eq("id", p.id);
    }
  }
  // Décideurs par fonction (pages publiques, profils LinkedIn publics) + recherche d'e-mails vérifiés
  const r = await findContacts(ws, p.id, roles);
  const rows = ((r.contacts ?? []) as { name: string; role: string; email: string; email_status: string; linkedin_url: string; source?: string }[])
    .sort((a, b) => Number(!!b.email) - Number(!!a.email) || Number(!!b.linkedin_url) - Number(!!a.linkedin_url));
  const best = rows.find((c) => c.email) ?? rows.find((c) => c.linkedin_url) ?? rows[0];
  const raw = { ...(o.raw ?? {}), contacts_at: new Date().toISOString(), ...(best ? { contact: { nom: best.name, role: best.role, ...(best.email ? { email: best.email } : {}), ...(phone ? { tel: phone } : {}), ...(best.linkedin_url ? { linkedin: best.linkedin_url } : {}), source: best.source || "recherche publique" } } : {}) };
  await admin.from("radar_opps").update({ raw, prospect_id: p.id }).eq("id", o.id);
  return { prospect_id: p.id, contacts: rows, phone, roles, launched: r.launched, providers: providers() };
}
