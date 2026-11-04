// Fonction « x » : accès externe à Bingoo! avec une clé personnelle (Réglages → Extension et assistants IA).
// - /x/lookup, /x/add : extension Chrome (fiche de l'entreprise du site visité, ajout aux prospects) ;
// - /x/mcp : serveur MCP (lecture seule) pour brancher Claude, ChatGPT ou tout assistant compatible sur les données Bingoo!.
import { cors, HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { admin, type Workspace } from "../_shared/core.ts";
import { requireKey } from "../_shared/apikeys.ts";
import { extAdd, extLookup } from "../_shared/ext.ts";

const LABEL: Record<string, string> = { appel_offres: "appel d'offres", renouvellement: "contrat public à renouveler", dirigeant: "nouveau dirigeant", demenagement: "déménagement", creation: "création", etablissement: "nouvel établissement", recrutement: "recrutement", croissance: "croissance", levee: "levée de fonds", client_concurrent: "cliente d'un concurrent", abonnement: "abonnement concurrent à renouveler", outil: "changement d'outils", obligation: "obligation réglementaire", visite: "visite de ton site", essai: "équipe à l'essai", demande: "demande de recommandation", avis: "mécontente d'un concurrent", champion: "ancien utilisateur" };

// ---------------------------------------------------------------- Outils MCP (lecture seule)
const TOOLS = [
  { name: "opportunites", description: "Les meilleures opportunités commerciales détectées par le Radar Bingoo! (entreprises qui ont une raison d'acheter maintenant), avec la raison, le score et le contact.", inputSchema: { type: "object", properties: { limite: { type: "number", description: "Nombre d'opportunités (défaut 10, max 50)" }, type: { type: "string", description: "Filtrer par type de signal (ex. renouvellement, recrutement, dirigeant)" } } } },
  { name: "entreprise", description: "Tout ce que Bingoo! sait d'une entreprise : prospect, signaux Radar, contacts.", inputSchema: { type: "object", properties: { nom: { type: "string", description: "Nom de l'entreprise" } }, required: ["nom"] } },
  { name: "concurrents", description: "Les concurrents suivis par Espion : résumé, niveau de menace, faiblesses, dernières actualités.", inputSchema: { type: "object", properties: {} } },
  { name: "prospects", description: "Les prospects de l'espace, filtrables par statut.", inputSchema: { type: "object", properties: { statut: { type: "string", description: "nouveau, pret, envoye, repondu, rdv, client, refus…" }, limite: { type: "number" } } } },
  { name: "resultats", description: "Ce que le Radar a rapporté : signaux, prospects, contactés, réponses, rendez-vous, devis signés, chiffre d'affaires.", inputSchema: { type: "object", properties: { jours: { type: "number", description: "Période en jours (défaut 30)" } } } },
];

// deno-lint-ignore no-explicit-any
async function callTool(ws: Workspace, name: string, a: any) {
  if (name === "opportunites") {
    let q = admin.from("radar_opps").select("company, kind, title, summary, why, score, deadline, city, raw").eq("workspace_id", ws.id).in("status", ["nouveau", "suivi"]).order("score", { ascending: false }).limit(Math.min(50, Number(a?.limite) || 10));
    if (a?.type) q = q.eq("kind", String(a.type));
    const { data } = await q;
    return (data ?? []).map((o) => ({ entreprise: o.company, signal: LABEL[o.kind] ?? o.kind, score: o.score, quoi: o.summary || o.title, pourquoi_maintenant: o.why, avant_le: o.deadline, ville: o.city, contact: (o.raw as { contact?: unknown } | null)?.contact ?? null }));
  }
  if (name === "entreprise") {
    const n = String(a?.nom ?? "").trim();
    if (n.length < 2) throw new HttpError(400, "Nom manquant");
    const [{ data: ps }, { data: os }] = await Promise.all([
      admin.from("prospects").select("id, name, siren, city, status, contact_name, contact_role, email, phone, website, notes").eq("workspace_id", ws.id).ilike("name", `%${n}%`).limit(3),
      admin.from("radar_opps").select("company, kind, summary, why, score, deadline").eq("workspace_id", ws.id).ilike("company", `%${n}%`).order("score", { ascending: false }).limit(8),
    ]);
    const ids = (ps ?? []).map((p) => p.id);
    const { data: cs } = ids.length ? await admin.from("contacts").select("prospect_id, name, role, email, email_status, linkedin_url").in("prospect_id", ids) : { data: [] };
    return { prospects: (ps ?? []).map((p) => ({ ...p, contacts: (cs ?? []).filter((c) => c.prospect_id === p.id) })), signaux: (os ?? []).map((o) => ({ entreprise: o.company, signal: LABEL[o.kind] ?? o.kind, score: o.score, quoi: o.summary, pourquoi: o.why, avant_le: o.deadline })) };
  }
  if (name === "concurrents") {
    const { data } = await admin.from("competitors").select("name, url, summary, checked_at").eq("workspace_id", ws.id).neq("status", "ecarte").limit(30);
    const t = (x: unknown) => typeof x === "string" ? x : (x as { texte?: string } | null)?.texte ?? "";
    return (data ?? []).map((c) => { const s = (c.summary ?? {}) as Record<string, unknown>; return { nom: c.name, site: c.url, resume: t(s.resume), menace: (s.menace as { niveau?: unknown } | undefined)?.niveau ?? null, faiblesses: ((s.faiblesses as unknown[]) ?? []).slice(0, 5).map(t), actualites: ((s.actualites as { titre?: unknown; date?: string }[]) ?? []).slice(0, 3).map((x) => `${x.date ?? ""} ${t(x.titre)}`.trim()), analyse_du: c.checked_at }; });
  }
  if (name === "prospects") {
    let q = admin.from("prospects").select("name, city, status, contact_name, contact_role, email, website, score, updated_at").eq("workspace_id", ws.id).order("updated_at", { ascending: false }).limit(Math.min(100, Number(a?.limite) || 20));
    if (a?.statut) q = q.eq("status", String(a.statut));
    const { data } = await q;
    return data ?? [];
  }
  if (name === "resultats") {
    const { data } = await admin.rpc("radar_roi", { p_ws: ws.id, p_since: new Date(Date.now() - (Number(a?.jours) || 30) * 864e5).toISOString() });
    return data ?? {};
  }
  throw new HttpError(404, `Outil inconnu : ${name}`);
}

// deno-lint-ignore no-explicit-any
async function mcp(req: Request, msg: any): Promise<Response> {
  const ws = await requireKey(req);
  const reply = (result: unknown) => json({ jsonrpc: "2.0", id: msg.id, result });
  if (msg.id === undefined || msg.id === null) return new Response(null, { status: 202, headers: cors }); // notification
  switch (msg.method) {
    case "initialize":
      return reply({ protocolVersion: msg.params?.protocolVersion ?? "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "bingoo", title: "Bingoo!", version: "1.0.0" },
        instructions: `Données commerciales de l'espace « ${ws.name} » dans Bingoo! (lecture seule) : opportunités du Radar, entreprises, concurrents (Espion), prospects, résultats. Réponds en français.` });
    case "ping": return reply({});
    case "tools/list": return reply({ tools: TOOLS });
    case "tools/call": {
      try {
        const out = await callTool(ws, String(msg.params?.name ?? ""), msg.params?.arguments ?? {});
        return reply({ content: [{ type: "text", text: JSON.stringify(out, null, 1).slice(0, 60000) }] });
      } catch (e) {
        return reply({ content: [{ type: "text", text: (e as Error).message }], isError: true });
      }
    }
    default: return json({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Méthode non prise en charge" } });
  }
}

Deno.serve(wrap(async (req) => {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const name = parts[parts.indexOf("x") + 1] ?? "";
  if (name === "mcp") {
    if (req.method === "GET") return new Response("Serveur MCP Bingoo! : utilise POST (JSON-RPC).", { status: 405, headers: { ...cors, Allow: "POST" } });
    const body = await readJson(req);
    if (Array.isArray(body)) { const out = []; for (const m of body) { const r = await mcp(req, m); if (r.status === 200) out.push(await r.json()); } return out.length ? json(out) : new Response(null, { status: 202, headers: cors }); }
    return await mcp(req, body);
  }
  if (req.method !== "POST") throw new HttpError(405, "POST attendu");
  const b = await readJson(req);
  const ws = await requireKey(req);
  if (name === "lookup") return json(await extLookup(ws, String(b.url ?? "")));
  if (name === "add") return json(await extAdd(ws, String(b.url ?? "")));
  if (name === "whoami") return json({ espace: ws.name });
  // Pilote LinkedIn (extension) : prochaine action, compte rendu, état
  if (name.startsWith("li-")) {
    const li = await import("../_shared/linkedin-auto.ts");
    if (name === "li-next") return json(await li.liNext(ws));
    if (name === "li-report") return json(await li.liReport(ws, b));
    if (name === "li-status") return json(await li.liStatus(ws));
  }
  throw new HttpError(404, "Action inconnue");
}));
