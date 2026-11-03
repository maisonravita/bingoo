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

/** Cherche les contacts d'une opportunité et les rattache à sa fiche. */
export async function oppContacts(ws: Workspace, oppId: string) {
  const { data: o } = await admin.from("radar_opps").select("*").eq("id", oppId).eq("workspace_id", ws.id).single();
  if (!o) throw new HttpError(404, "Opportunité introuvable");
  if (o.kind === "appel_offres") return { contacts: [], note: "Pour un appel d'offres, le contact officiel est dans l'avis (acheteur public).", providers: providers() };
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
  // Décideurs par fonction (pages publiques, profils LinkedIn publics) + recherche d'e-mails vérifiés
  const r = await findContacts(ws, p.id, roles);
  const rows = (r.contacts ?? []) as { name: string; role: string; email: string; email_status: string; linkedin_url: string; source?: string }[];
  const best = rows.find((c) => c.email) ?? rows.find((c) => c.linkedin_url) ?? rows[0];
  const raw = { ...(o.raw ?? {}), contacts_at: new Date().toISOString(), ...(best ? { contact: { nom: best.name, role: best.role, ...(best.email ? { email: best.email } : {}), ...(phone ? { tel: phone } : {}), ...(best.linkedin_url ? { linkedin: best.linkedin_url } : {}), source: best.source || "recherche publique" } } : {}) };
  await admin.from("radar_opps").update({ raw, prospect_id: p.id }).eq("id", o.id);
  return { prospect_id: p.id, contacts: rows, phone, roles, launched: r.launched, providers: providers() };
}
