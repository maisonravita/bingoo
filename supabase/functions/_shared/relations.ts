// Relations existantes hors de Bingoo! : avant un premier message, on regarde si l'entreprise a écrit au client
// ces 12 derniers mois (sa boîte mail connectée) ou si elle est déjà dans son CRM (HubSpot, Pipedrive).
// Tout est en lecture seule, borné dans le temps : si la vérification n'aboutit pas, l'envoi n'est pas bloqué.
import { admin, type Prospect, type Workspace } from "./core.ts";
import { domaineDe } from "./deja.ts";

const DELAI = 8000;
const avecDelai = <T>(p: Promise<T>): Promise<T | null> => Promise.race([p.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), DELAI))]);

/** L'entreprise a-t-elle écrit au client ces 12 derniers mois ? Renvoie une description, ou null. */
async function dansLaBoite(ws: Workspace, p: Prospect): Promise<string | null> {
  const box = ws.integrations?.mailbox as { ok?: boolean; provider?: string; via?: string } | undefined;
  if (!box?.ok) return null;
  const dom = domaineDe(p.email);
  const cible = dom || String(p.email ?? "").toLowerCase();
  if (!cible) return null;
  const since = new Date(Date.now() - 365 * 864e5);
  if (box.via === "oauth" && box.provider === "google") {
    const { googleAccess } = await import("./oauth.ts");
    const { token, read } = await googleAccess(ws);
    if (!read) return null;
    const q = `from:${cible} newer_than:1y`;
    const r = await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } })).json().catch(() => ({}));
    return (r.messages ?? []).length ? `${cible} t'a déjà écrit cette année (Gmail)` : null;
  }
  if (box.via === "oauth" && box.provider === "microsoft") {
    const { microsoftAccess } = await import("./oauth.ts");
    const { token } = await microsoftAccess(ws) as { token: string };
    const r = await (await fetch(`https://graph.microsoft.com/v1.0/me/messages?$top=1&$select=id,receivedDateTime&$search=${encodeURIComponent(`"from:${cible}"`)}`, { headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: "eventual" } })).json().catch(() => ({}));
    const v = (r.value ?? []) as { receivedDateTime?: string }[];
    return v.some((m) => m.receivedDateTime && new Date(m.receivedDateTime) > since) ? `${cible} t'a déjà écrit cette année (Outlook)` : null;
  }
  const { IMAP_HOSTS } = await import("./inbox.ts");
  if (!box.provider || !IMAP_HOSTS[box.provider]) return null;
  const s = (await (await import("./boites.ts")).secretsOf(ws)).smtp as { user?: string; pass?: string } | undefined;
  if (!s?.user || !s.pass) return null;
  const { open } = await import("./growth.ts");
  const { ImapFlow } = await import("npm:imapflow@1.0.164");
  const client = new ImapFlow({ host: IMAP_HOSTS[box.provider], port: 993, secure: true, auth: { user: s.user, pass: await open(s.pass) }, logger: false, connectionTimeout: 6000, greetingTimeout: 4000, socketTimeout: 8000 });
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = (await client.search({ from: cible, since }, { uid: true })) || [];
      return uids.length ? `${cible} t'a déjà écrit cette année` : null;
    } finally { lock.release(); }
  } finally { await client.logout().catch(() => null); }
}

/** L'entreprise ou la personne est-elle déjà dans le CRM du client (fiches créées par Bingoo! exclues) ? */
async function dansLeCrm(ws: Workspace, p: Prospect): Promise<string | null> {
  if (!ws.integrations?.hubspot?.ok && !ws.integrations?.pipedrive?.ok) return null;
  const { crmAuth } = await import("./crm-oauth.ts");
  const { hub, pipe } = await import("./growth.ts");
  const auth = await crmAuth(ws);
  const dom = domaineDe(p.email) || String(p.website ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  // Identifiants CRM des fiches poussées par Bingoo! : ce ne sont pas des relations du client
  const { data: nos } = await admin.from("prospects").select("crm_ids").eq("workspace_id", ws.id).not("crm_ids", "is", null).limit(3000);
  const nosIds = new Set((nos ?? []).flatMap((x) => Object.values((x.crm_ids ?? {}) as Record<string, string>).map(String)));
  if (auth.hubspot) {
    const filtres = [
      ...(p.email ? [{ objet: "contacts", f: { propertyName: "email", operator: "EQ", value: p.email.toLowerCase() } }] : []),
      ...(dom ? [{ objet: "companies", f: { propertyName: "domain", operator: "EQ", value: dom } }] : []),
    ];
    for (const { objet, f } of filtres) {
      const r = await hub(auth.hubspot.token, `/crm/v3/objects/${objet}/search`, "POST", { filterGroups: [{ filters: [f] }], limit: 3, properties: ["name", "email", "lifecyclestage"] });
      const res = ((r.data?.results ?? []) as { id: string; properties?: Record<string, string> }[]).filter((x) => !nosIds.has(String(x.id)));
      if (res.length) {
        const stade = res[0].properties?.lifecyclestage;
        return `déjà dans ton HubSpot${stade ? ` (${stade === "customer" ? "client" : stade})` : ""}`;
      }
    }
  }
  if (auth.pipedrive) {
    const termes = [p.email ? { t: p.email, path: "/persons/search?fields=email&exact_match=true" } : null, p.name ? { t: p.name, path: "/organizations/search?fields=name&exact_match=true" } : null].filter(Boolean) as { t: string; path: string }[];
    for (const { t, path } of termes) {
      const r = await pipe(auth.pipedrive as never, `${path}&term=${encodeURIComponent(t)}&limit=3`);
      const items = ((r.data?.data?.items ?? []) as { item: { id: number } }[]).filter((x) => !nosIds.has(String(x.item?.id)));
      if (items.length) return "déjà dans ton Pipedrive";
    }
  }
  return null;
}

/** Relation existante hors Bingoo! (boîte mail ou CRM), ou null. Jamais bloquant en cas d'erreur ou de lenteur. */
export async function relationExistante(ws: Workspace, p: Prospect): Promise<string | null> {
  const [boite, crm] = await Promise.all([avecDelai(dansLaBoite(ws, p)), avecDelai(dansLeCrm(ws, p))]);
  return crm ?? boite ?? null;
}
