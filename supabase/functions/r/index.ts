// Fonction « r » : Kairo Radar, Espion et Studio (modules de croissance), séparée pour des mises à jour légères.
import { HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { admin, quota, requireMember } from "../_shared/core.ts";
import { radarCron, radarGetConfig, radarSetConfig, radarToProspect, scanRadar } from "../_shared/radar.ts";
import { resolveCompetitor, spySocial } from "../_shared/spy.ts";
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
};

Deno.serve(wrap(async (req) => {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const name = parts[parts.indexOf("r") + 1] ?? "";
  const h = routes[name];
  if (!h) throw new HttpError(404, "Action inconnue");
  if (req.method !== "POST") throw new HttpError(405, "POST attendu");
  return json(await h(req, await readJson(req)));
}));
