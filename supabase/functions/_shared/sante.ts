// Santé de l'envoi : est-ce que les e-mails du client arrivent en boîte de réception ?
// Contrôles gratuits, sans IA : enregistrements DNS du domaine d'envoi (SPF, DKIM, DMARC), domaine principal ou séparé,
// adresse personnelle (Gmail, Outlook…), taux de rebond des 30 derniers jours, vérification des adresses active.
// Le résultat est gardé sur l'espace (sante_envoi). Sans SPF ni DKIM, les envois de prospection sont plafonnés à 5 par jour.
import { admin, env, type Workspace } from "./core.ts";

const PERSO = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|aol|orange|wanadoo|free|sfr|laposte|neuf|bbox|gmx|proton|protonmail)\.[a-z.]+$/i;
const SELECTEURS = ["google", "selector1", "selector2", "default", "k1", "k2", "resend", "s1", "s2", "mail", "dkim", "zoho", "mxvault", "sig1", "smtp", "ovh", "ionos"];

async function txt(name: string): Promise<string[]> {
  try {
    const r = await (await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`, { signal: AbortSignal.timeout(5000) })).json();
    return ((r.Answer ?? []) as { data: string }[]).map((a) => String(a.data).replace(/"\s*"/g, "").replace(/^"|"$/g, ""));
  } catch { return []; }
}
async function cname(name: string): Promise<boolean> {
  try { const r = await (await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=CNAME`, { signal: AbortSignal.timeout(5000) })).json(); return (r.Answer ?? []).length > 0; } catch { return false; }
}
const hote = (u?: string | null) => { try { return new URL(/^https?:/.test(String(u)) ? String(u) : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };

export type Domaine = { domaine: string; adresses: string[]; perso: boolean; principal: boolean; spf: boolean; dkim: boolean | null; dmarc: boolean; dmarc_politique: string };

export async function controleDomaine(domaine: string, site: string): Promise<Omit<Domaine, "adresses">> {
  const perso = PERSO.test(domaine);
  if (perso) return { domaine, perso, principal: false, spf: true, dkim: true, dmarc: true, dmarc_politique: "" };
  const [racine, dm] = await Promise.all([txt(domaine), txt(`_dmarc.${domaine}`)]);
  const spf = racine.some((x) => /^v=spf1\b/i.test(x));
  const d = dm.find((x) => /^v=DMARC1/i.test(x)) ?? "";
  // DKIM : le sélecteur n'est pas public ; on essaie les plus courants. Introuvable ne veut pas dire absent (null).
  let dkim: boolean | null = null;
  for (let i = 0; i < SELECTEURS.length && !dkim; i += 6) {
    const lot = await Promise.all(SELECTEURS.slice(i, i + 6).map(async (s) => {
      const n = `${s}._domainkey.${domaine}`;
      return (await txt(n)).some((x) => /v=DKIM1|k=rsa|p=/i.test(x)) || await cname(n);
    }));
    if (lot.some(Boolean)) dkim = true;
  }
  return { domaine, perso, principal: !!site && (site === domaine || site.endsWith(`.${domaine}`)), spf, dkim, dmarc: !!d, dmarc_politique: (d.match(/p=(\w+)/i)?.[1] ?? "").toLowerCase() };
}

export async function santeEnvoi(ws: Workspace, sauver = true) {
  // Adresses qui envoient : boîtes connectées (principale et en plus) et domaine d'envoi vérifié
  const adresses = new Set<string>();
  if (ws.integrations?.mailbox?.ok && ws.integrations.mailbox.email) adresses.add(String(ws.integrations.mailbox.email).toLowerCase());
  const { data: autres } = await admin.from("mailboxes").select("email, actif, integration").eq("workspace_id", ws.id);
  for (const b of (autres ?? []) as { email: string; actif: boolean; integration?: { ok?: boolean } }[]) if (b.actif && b.integration?.ok) adresses.add(b.email.toLowerCase());
  if (ws.domain_status === "verified" && ws.sender_email) adresses.add(String(ws.sender_email).toLowerCase());
  const parDomaine = new Map<string, string[]>();
  for (const a of adresses) { const d = a.split("@")[1]; if (d) parDomaine.set(d, [...(parDomaine.get(d) ?? []), a]); }
  const site = hote(ws.website);
  const domaines: Domaine[] = await Promise.all([...parDomaine].map(async ([d, a]) => ({ ...(await controleDomaine(d, site)), adresses: a })));

  // Rebonds des 30 derniers jours
  const depuis = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ count: envoyes }, { count: rebonds }] = await Promise.all([
    admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", depuis),
    admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("bounced", true).gte("sent_at", depuis),
  ]);
  const taux = envoyes ? Math.round(((rebonds ?? 0) / envoyes) * 1000) / 10 : 0;

  // Ce qu'il faut corriger, du plus grave au moins grave, en mots simples
  const conseils: { gravite: "bloquant" | "important" | "conseil"; texte: string }[] = [];
  if (!domaines.length) conseils.push({ gravite: "bloquant", texte: "Aucune boîte d'envoi connectée : connecte ta boîte mail pour que tes messages partent de ton adresse." });
  for (const d of domaines) {
    if (d.perso) { conseils.push({ gravite: "important", texte: `${d.adresses[0]} est une adresse personnelle : les messageries s'en méfient pour la prospection. Utilise une adresse à ton nom de domaine (prenom@tonentreprise.fr).` }); continue; }
    if (!d.spf) conseils.push({ gravite: "bloquant", texte: `${d.domaine} n'a pas d'enregistrement SPF : sans lui, tes e-mails partent souvent en spam. Ajoute-le chez ton hébergeur de domaine (Google Workspace : « v=spf1 include:_spf.google.com ~all » ; Microsoft 365 : « v=spf1 include:spf.protection.outlook.com -all »).` });
    if (d.dkim === null) conseils.push({ gravite: "important", texte: `Signature DKIM introuvable sur ${d.domaine} : active-la dans l'administration de ta messagerie (Google Workspace : Applications → Gmail → Authentifier les e-mails ; Microsoft 365 : Defender → DKIM).` });
    if (!d.dmarc) conseils.push({ gravite: "important", texte: `${d.domaine} n'a pas de DMARC : Gmail et Yahoo l'exigent désormais. Ajoute un enregistrement TXT « _dmarc » avec la valeur « v=DMARC1; p=none; » chez ton hébergeur de domaine.` });
    if (d.principal) conseils.push({ gravite: "conseil", texte: `Tu prospectes depuis ton domaine principal (${d.domaine}). Pour protéger les e-mails de ton entreprise, le mieux est un domaine à part, proche du tien (par exemple ${d.domaine.replace(/\.(\w+)$/, "-contact.$1")}), avec sa propre boîte : en cas de souci, ta messagerie habituelle n'est jamais touchée.` });
  }
  if ((envoyes ?? 0) >= 20 && taux >= 3) conseils.push({ gravite: "bloquant", texte: `${taux} % de tes e-mails reviennent en erreur ce mois-ci (au-delà de 3 %, les messageries te classent en spam). Bingoo! ralentit et vérifie chaque adresse.` });
  if (!env("MILLIONVERIFIER_API_KEY")) conseils.push({ gravite: "conseil", texte: "Chaque adresse est contrôlée gratuitement avant l'envoi (forme, domaine qui reçoit du courrier, anciens rebonds)." });

  // Plafond de sécurité : sans SPF ni DKIM sur un domaine pro, 5 envois de prospection par jour au plus
  const fragile = domaines.some((d) => !d.perso && !d.spf && !d.dkim) || ((envoyes ?? 0) >= 20 && taux >= 5);
  const note = conseils.some((c) => c.gravite === "bloquant") ? "risque" : conseils.some((c) => c.gravite === "important") ? "moyen" : "bon";
  const out = { note, domaines, rebonds: { envoyes: envoyes ?? 0, rebonds: rebonds ?? 0, taux }, verification: env("MILLIONVERIFIER_API_KEY") ? "complete" : "gratuite", limite: fragile ? 5 : null, conseils, at: new Date().toISOString() };
  if (sauver) await admin.from("workspaces").update({ sante_envoi: out }).eq("id", ws.id);
  return out;
}

/** Plafond imposé par la santé de l'envoi (null = pas de plafond en plus du préchauffage). */
export const limiteSante = (ws: Workspace) => {
  const s = (ws as Workspace & { sante_envoi?: { limite?: number | null } }).sante_envoi;
  return typeof s?.limite === "number" ? s.limite : null;
};
