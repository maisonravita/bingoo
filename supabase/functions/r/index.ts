// Fonction « r » : Kairo Radar, Espion et Studio (modules de croissance), séparée pour des mises à jour légères.
import { HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { admin, quota, requireMember, setAi } from "../_shared/core.ts";
import { radarCron, radarGetConfig, radarSetConfig, radarToProspect, scanRadar } from "../_shared/radar.ts";
import { resolveCompetitor, spyCron, spyDigest, spyDiscover, spyFollow, spyNeeds, spySocial } from "../_shared/spy.ts";
import { studioGenerate } from "../_shared/studio.ts";
import { growthReco } from "../_shared/reco.ts";

async function secret(name: string) {
  const { data } = await admin.from("app_secrets").select("value").eq("name", name).single();
  return data?.value ?? "";
}
const cron = async (req: Request) => { if ((req.headers.get("x-cron-key") ?? "") !== await secret("cron_key")) throw new HttpError(401, "Clé invalide"); };

// deno-lint-ignore no-explicit-any
const routes: Record<string, (req: Request, b: any) => Promise<unknown>> = {
  async "radar-scan"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "radar_scan", 4);
    return await scanRadar(ws, { web: b.web === true ? true : undefined });
  },
  async "radar-config"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return b.set ? await radarSetConfig(ws, b) : await radarGetConfig(ws);
  },
  async "tender-analyse"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { tenderAnalysis } = await import("../_shared/radar-plus.ts");
    return await tenderAnalysis(ws, String(b.id ?? ""));
  },
  async "radar-crm"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const r = await radarToProspect(ws, String(b.id ?? ""));
    const { pushOneToCrm } = await import("../_shared/growth.ts");
    await pushOneToCrm(ws, r.prospect_id);
    return { ok: true, prospect_id: r.prospect_id };
  },
  async "watch-add"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { watchAdd } = await import("../_shared/radar-plus.ts");
    return await watchAdd(ws, b.items);
  },
  async "radar-add"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await radarToProspect(ws, String(b.id ?? ""));
  },
  async "spy-resolve"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await resolveCompetitor(ws, String(b.query ?? ""));
  },
  async "spy-social"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "espion", 20);
    return await spySocial(ws, String(b.competitor_id ?? ""));
  },
  async "studio-generate"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "studio", 40);
    return await studioGenerate(ws, b);
  },
  async "growth-reco"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "reco", 30);
    return await growthReco(ws, String(b.page ?? ""), b.stats);
  },
  async "radar-cron"(req) { await cron(req); return await radarCron(); },
  // Diagnostic France Travail (clé de tâche) : présence des secrets et connexion, sans jamais renvoyer leur valeur
  async "ft-check"(req) {
    await cron(req);
    const { ftReady, ftOffers } = await import("../_shared/radar-plus.ts");
    if (!ftReady()) return { secrets: false };
    const { env } = await import("../_shared/core.ts");
    const id = env("FT_CLIENT_ID").trim(), sec = env("FT_CLIENT_SECRET").trim();
    const forme = { identifiant_commence_par_PAR: id.startsWith("PAR_"), longueur_identifiant: id.length, longueur_cle: sec.length, cle_commence_par_PAR: sec.startsWith("PAR_") };
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", "69871493-9885-465b-a597-f560e8656cd8").single();
    try { const o = await ftOffers(ws, ["agent de propreté"], ["92"]); return { secrets: true, forme, connexion: true, offres: o.length, exemple: o.slice(0, 3).map((x) => `${x.company} · ${x.summary}`) }; }
    catch (e) { return { secrets: true, forme, connexion: false, erreur: (e as Error).message }; }
  },
  // Test de la plateforme (clé de tâche) : analyse d'un appel d'offres d'un espace
  async "tender-test"(req, b) {
    await cron(req);
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    setAi({ ws: ws.id });
    const { tenderAnalysis } = await import("../_shared/radar-plus.ts");
    return await tenderAnalysis(ws, String(b.id ?? ""));
  },
  async "market-cron"(req) { await cron(req); const { marketCron } = await import("../_shared/market.ts"); return await marketCron(); },
  async "market-refresh"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "radar_scan", 4);
    const { marketRefresh } = await import("../_shared/market.ts");
    return await marketRefresh(ws);
  },
  // Analyse d'un espace précis par la plateforme (tests, pilote) : sans recherche web payante
  async "radar-run"(req, b) {
    await cron(req);
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    setAi({ ws: ws.id });
    return await scanRadar(ws, { web: b.full === true ? undefined : false, top: b.top === true });
  },
  async "spy-cron"(req) { await cron(req); return await spyCron(); },
  async "spy-digest"(req) { await cron(req); return await spyDigest(); },
  async "spy-needs"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "espion", 20);
    return await spyNeeds(ws);
  },
  async "spy-discover"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "espion", 20);
    return await spyDiscover(ws);
  },
  async "spy-follow"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await spyFollow(ws, String(b.competitor_id ?? ""), b.follow === true);
  },
};

Deno.serve(wrap(async (req) => {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const name = parts[parts.indexOf("r") + 1] ?? "";
  const h = routes[name];
  if (!h) throw new HttpError(404, "Action inconnue");
  if (req.method !== "POST") throw new HttpError(405, "POST attendu");
  return json(await h(req, await readJson(req)));
}));
