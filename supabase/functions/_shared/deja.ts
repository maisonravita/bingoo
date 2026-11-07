// Détecteur de « déjà contacté » : avant un premier message, on vérifie que l'entreprise n'est pas déjà en conversation,
// cliente, en refus, contactée récemment par une autre fiche, ou dans la liste « ne jamais contacter » du client
// (ses clients actuels, partenaires, concurrents). Un message en trop à un client existant coûte plus cher qu'un rendez-vous manqué.
import { admin, type Prospect, type Workspace } from "./core.ts";

const PERSO = /@(gmail|googlemail|yahoo|hotmail|outlook|live|msn|icloud|me|orange|wanadoo|free|sfr|neuf|laposte|bbox|aol|gmx|proton|protonmail)\./i;
const RECENT_J = 90;

export const domaineDe = (email?: string | null) => {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e.includes("@") || PERSO.test(e)) return "";
  return e.split("@")[1];
};
const siteDomaine = (w?: string | null) => String(w ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
const nomCle = (s?: string | null) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\b(sas|sasu|sarl|eurl|sa|sci|scop|selarl|et|cie|groupe|group|france)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** La liste « ne jamais contacter » du client : une entrée par ligne (domaine, SIREN, e-mail ou nom d'entreprise). */
export function exclusionsDe(ws: Workspace): string[] {
  const raw = ((ws.profile ?? {}) as Record<string, unknown>).exclusions;
  const list = Array.isArray(raw) ? raw : String(raw ?? "").split(/[\n,;]+/);
  return list.map((x) => String(x).trim().toLowerCase()).filter((x) => x.length >= 3).slice(0, 2000);
}

export type Deja = { raison: string; prospect_id?: string } | null;

/** Renvoie la raison de ne pas écrire à ce prospect, ou null si la voie est libre. */
export async function dejaContacte(ws: Workspace, p: Prospect): Promise<Deja> {
  const dom = domaineDe(p.email) || siteDomaine(p.website);
  const siren = String(p.siren ?? "").replace(/\D/g, "");
  const cle = nomCle(p.name);

  // 1) Liste « ne jamais contacter » (clients actuels, partenaires…)
  for (const x of exclusionsDe(ws)) {
    const xd = siteDomaine(x.includes("@") ? x.split("@")[1] : x);
    if ((siren && x.replace(/\D/g, "") === siren && x.replace(/\D/g, "").length === 9)
      || (p.email && x === p.email.toLowerCase())
      || (dom && xd && xd.includes(".") && (dom === xd || dom.endsWith(`.${xd}`)))
      || (cle.length >= 4 && nomCle(x) === cle)) {
      return { raison: `dans ta liste « ne jamais contacter » (${x})` };
    }
  }

  // 2) Une autre fiche de la même entreprise, dans le même espace
  const ors = [siren ? `siren.eq.${siren}` : "", dom ? `email.ilike.%@${dom}` : "", dom ? `website.ilike.%${dom}%` : ""].filter(Boolean);
  if (!ors.length) return null;
  const { data: autres } = await admin.from("prospects").select("id, name, contact_name, status")
    .eq("workspace_id", ws.id).neq("id", p.id).or(ors.join(",")).in("status", ["envoye", "repondu", "rdv", "client", "refus"]).limit(20);
  if (!autres?.length) return null;
  const qui = (a: { contact_name?: string | null; name?: string | null }) => a.contact_name || a.name || "quelqu'un";
  const fort = autres.find((a) => a.status === "client") ?? autres.find((a) => a.status === "rdv") ?? autres.find((a) => a.status === "repondu") ?? autres.find((a) => a.status === "refus");
  if (fort) {
    const r = { client: "déjà client", rdv: `rendez-vous en cours avec ${qui(fort)}`, repondu: `conversation en cours avec ${qui(fort)}`, refus: `${qui(fort)} a déjà dit non pour cette entreprise` }[fort.status as "client"];
    return { raison: r, prospect_id: fort.id };
  }
  // Contactée récemment par une autre fiche : on attend la fin de ce parcours
  const ids = autres.map((a) => a.id);
  const { data: recents } = await admin.from("messages").select("prospect_id, sent_at").in("prospect_id", ids).eq("status", "envoye")
    .gte("sent_at", new Date(Date.now() - RECENT_J * 864e5).toISOString()).order("sent_at", { ascending: false }).limit(1);
  if (recents?.length) {
    const a = autres.find((x) => x.id === recents[0].prospect_id)!;
    return { raison: `${qui(a)} (même entreprise) a reçu un message le ${new Date(recents[0].sent_at).toLocaleDateString("fr-FR")}`, prospect_id: a.id };
  }
  return null;
}
