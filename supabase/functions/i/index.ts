// Fonction « i » : Bingoo! Intelligence (et bientôt Bingoo! Visibilité), séparée de « k » pour des mises à jour légères.
import { HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { admin, planOk, quota, requireMember, setAi } from "../_shared/core.ts";
import { intelligence, segmentStats } from "../_shared/intelligence.ts";
import { findContacts, importPerson, pollContacts, providers, useContact } from "../_shared/contacts.ts";
import { askJson } from "../_shared/core.ts";
import { createMission, missionSearch, missionView, planMission, snapshot, type Mission } from "../_shared/mission.ts";

async function secret(name: string) {
  const { data } = await admin.from("app_secrets").select("value").eq("name", name).single();
  // Fermé par défaut : sans secret configuré, aucune requête ne passe (jamais "" === "")
  return String(data?.value ?? "") || `absent-${crypto.randomUUID()}`;
}

// deno-lint-ignore no-explicit-any
const routes: Record<string, (req: Request, b: any) => Promise<unknown>> = {
  async intelligence(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "intelligence", 6);
    return await intelligence(ws);
  },
  async segments(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return { segments: await segmentStats(ws) };
  },
  // ---- Bingoo! Mission
  async "mission-plan"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "mission", 20);
    return await planMission(ws, String(b.objective ?? ""));
  },
  async "mission-create"(req, b) {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "mission", 20);
    return await createMission(ws, userId, b);
  },
  async missions(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { data } = await admin.from("missions").select("*").eq("workspace_id", ws.id).neq("status", "terminee").order("created_at", { ascending: false }).limit(5);
    const out = [];
    for (const m of (data ?? []) as Mission[]) out.push(await missionView(ws, m));
    return { missions: out };
  },
  async "mission-search"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { data: m } = await admin.from("missions").select("*").eq("id", String(b.mission_id ?? "")).eq("workspace_id", ws.id).single();
    if (!m) throw new HttpError(404, "Mission introuvable");
    return await missionSearch(ws, m as Mission, Math.min(Math.max(Number(b.count) || 50, 10), 100));
  },
  // ---- Chercheur de contacts
  async "contacts-find"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const ids = (Array.isArray(b.prospect_ids) ? b.prospect_ids : [b.prospect_id]).filter(Boolean).slice(0, 3).map(String);
    if (!ids.length) throw new HttpError(400, "Choisis au moins une entreprise");
    const n = await quota(ws.id, "contacts", 60, ids.length);
    const out = [];
    for (const id of ids.slice(0, n)) out.push(await findContacts(ws, id, String(b.roles ?? "")));
    return { results: out, providers: providers() };
  },
  async "contacts-poll"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return { found: await pollContacts(ws), providers: providers() };
  },
  async "contacts-use"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await useContact(ws, String(b.contact_id ?? ""));
  },
  async "contacts-import"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "contacts", 60);
    return await importPerson(ws, String(b.query ?? ""));
  },
  async "contacts-providers"(req, b) {
    await requireMember(req, b.workspace_id);
    return { providers: providers() };
  },
  // ---- Fiche « Ce que Bingoo! peut répondre » : brouillon à partir du site et des vraies questions
  async "knowledge-draft"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "intelligence", 6);
    const pr = ws.profile ?? {};
    const asked = [...(ws.intelligence?.faq ?? []).map((f: { question: string }) => f.question), ...(ws.intelligence?.objections ?? []).map((o: { objection: string }) => o.objection)].slice(0, 12);
    const { data: reps } = await admin.from("replies").select("body").eq("workspace_id", ws.id).in("class", ["question", "prix", "interesse", "objection"]).order("created_at", { ascending: false }).limit(20);
    const r = await askJson<{ fiche: string }>(`Prépare la fiche « Ce que Bingoo! peut répondre » de cette entreprise : les informations factuelles qu'un commercial doit connaître pour répondre aux prospects.
Entreprise : ${pr.nom ?? ws.name} — ${pr.resume ?? ""} — Offre : ${pr.offre ?? ""} — Preuves : ${(pr.preuves ?? []).join(" ; ") || "aucune"}
Catalogue : ${JSON.stringify(ws.catalog ?? []).slice(0, 1500)}
Questions et objections déjà reçues : ${asked.join(" | ") || "aucune"} ${(reps ?? []).map((x) => String(x.body).slice(0, 200)).join(" | ")}
Rubriques (adapte-les : un SaaS parle d'intégrations, sécurité/RGPD, mise en place, essai ; une entreprise de services parle de zone, délais, certifications, références) :
Offre et prix · Mise en place / délais · Intégrations ou moyens · Sécurité, RGPD, garanties · Références et preuves · Zone et conditions.
Règles : uniquement ce qui est dans les informations fournies. Tout ce que tu ne sais pas s'écrit [à compléter : …] pour que le dirigeant le remplisse. Format texte simple, une ligne par information, titres de rubrique en majuscules.
Format : {"fiche": "texte"}`, { fast: true, maxTokens: 3000 });
    return { draft: String(r.fiche ?? "").slice(0, 8000) };
  },
  // Mise à jour hebdomadaire (lundi matin) : un espace par passage, s'il a reçu au moins 3 nouvelles réponses
  async weekly(req) {
    if ((req.headers.get("x-cron-key") ?? "") !== (await secret("cron_key"))) throw new HttpError(401, "Clé invalide");
    const week = new Date(Date.now() - 6 * 864e5).toISOString();
    const { data: every } = await admin.from("workspaces").select("*").eq("onboarded", true).or(`intelligence_at.is.null,intelligence_at.lt.${week}`);
    for (const ws of (every ?? []).filter((w) => planOk(w))) {
      const { count } = await admin.from("replies").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).gte("created_at", ws.intelligence_at ?? "2000-01-01");
      if ((count ?? 0) < 3) continue;
      setAi({ ws: ws.id });
      await intelligence(ws);
      return { updated: ws.id };
    }
    return { updated: null };
  },
};

// Photo quotidienne de chaque mission active (courbe d'évolution)
routes["missions-cron"] = async (req) => {
  if ((req.headers.get("x-cron-key") ?? "") !== (await secret("cron_key"))) throw new HttpError(401, "Clé invalide");
  const { data } = await admin.from("missions").select("*").eq("status", "active").limit(500);
  for (const m of (data ?? []) as Mission[]) { try { await snapshot(m); } catch (e) { console.error("snapshot", e); } }
  return { missions: (data ?? []).length };
};

// Relève des résultats des fournisseurs d'e-mails (appelé par la tâche planifiée)
routes["contacts-cron"] = async (req) => {
  if ((req.headers.get("x-cron-key") ?? "") !== (await secret("cron_key"))) throw new HttpError(401, "Clé invalide");
  const { data } = await admin.from("contacts").select("workspace_id").eq("email_status", "en_cours").limit(500);
  const ids = [...new Set((data ?? []).map((x) => x.workspace_id))];
  let found = 0;
  for (const id of ids) { const { data: ws } = await admin.from("workspaces").select("*").eq("id", id).single(); if (ws) { setAi({ ws: ws.id }); found += await pollContacts(ws); } }
  return { workspaces: ids.length, found };
};

Deno.serve(wrap(async (req) => {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const name = parts[parts.indexOf("i") + 1] ?? "";
  const h = routes[name];
  if (!h) throw new HttpError(404, "Action inconnue");
  if (req.method !== "POST") throw new HttpError(405, "POST attendu");
  return json(await h(req, await readJson(req)));
}));
