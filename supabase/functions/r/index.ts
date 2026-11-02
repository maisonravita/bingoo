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
  async "partners-refresh"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "radar_scan", 4);
    const { partnersRefresh } = await import("../_shared/radar-extra.ts");
    return await partnersRefresh(ws);
  },
  async "partner-add"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { data: p } = await admin.from("radar_partners").select("*").eq("id", String(b.id ?? "")).eq("workspace_id", ws.id).single();
    if (!p) throw new HttpError(404, "Partenaire introuvable");
    if (p.prospect_id) return { prospect_id: p.prospect_id, existing: true };
    const { data: ex } = await admin.from("prospects").select("id").eq("workspace_id", ws.id).eq("siren", p.siren).limit(1).maybeSingle();
    let pid = ex?.id as string | undefined;
    if (!pid) {
      const [prenomNom, role] = String(p.contact ?? "").split(/\s*\(/);
      const { data: np, error } = await admin.from("prospects").insert({ workspace_id: ws.id, target: "", name: p.name, siren: p.siren, activity: `Partenaire : ${p.type}`, city: p.city, postal_code: p.dept, contact_name: prenomNom || "", contact_role: (role ?? "").replace(/\)$/, ""),
        notes: `Partenaire apporteur d'affaires (${p.type}). Angle : ${p.message ?? ""}`, signals: [{ type: "partenaire", label: `Partenaire potentiel : ${p.pourquoi ?? p.type}` }] }).select("id").single();
      if (error) throw new HttpError(500, error.message);
      pid = np.id;
    }
    await admin.from("radar_partners").update({ status: "ajoute", prospect_id: pid }).eq("id", p.id);
    return { prospect_id: pid, existing: !!ex };
  },
  // Radar adapté au métier : outils concurrents, obligations, état de la lecture des sites
  async "saas-info"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { bizType, rivalTools, obligationsFor, OBLIGATIONS, BIZ_LABEL } = await import("../_shared/radar-saas.ts");
    const { FP } = await import("../_shared/tech-fp.ts");
    const type = await bizType(ws);
    const [rivaux, obl, scans] = await Promise.all([rivalTools(ws), obligationsFor(ws), admin.from("company_scan").select("ats, jobs_n, scanned_at").eq("workspace_id", ws.id).limit(5000)]);
    const rows = (scans.data ?? []) as { ats: string | null; jobs_n: number | null; scanned_at: string | null }[];
    return { type, type_label: BIZ_LABEL[type], outils_rivaux: rivaux, outils: FP.map((f) => f.name),
      obligations: obl.map((o) => ({ ...OBLIGATIONS.find((x) => x.id === o.id), angle: o.angle })).filter((o) => o.titre), obligations_all: OBLIGATIONS.map((o) => ({ id: o.id, titre: o.titre })),
      sites: rows.filter((r) => r.scanned_at).length, carrieres: rows.filter((r) => r.ats).length, offres: rows.reduce((n, r) => n + (r.jobs_n ?? 0), 0) };
  },
  async "saas-set"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { OBLIGATIONS } = await import("../_shared/radar-saas.ts");
    const { FP } = await import("../_shared/tech-fp.ts");
    const { data } = await admin.from("workspaces").select("radar_cfg").eq("id", ws.id).single();
    const cfg = { ...((data?.radar_cfg as Record<string, unknown>) ?? {}) };
    if (Array.isArray(b.outils_rivaux)) cfg.outils_rivaux = (b.outils_rivaux as string[]).filter((x) => FP.some((f) => f.name === x)).slice(0, 15);
    if (Array.isArray(b.obligations)) {
      const cur = (cfg.obligations ?? []) as { id: string; angle: string }[];
      cfg.obligations = (b.obligations as string[]).filter((id) => OBLIGATIONS.some((o) => o.id === id)).slice(0, 6).map((id) => cur.find((c) => c.id === id) ?? { id, angle: "" });
      delete cfg.oblig_at; // nouvelle recherche au prochain passage
    }
    await admin.from("workspaces").update({ radar_cfg: cfg }).eq("id", ws.id);
    return { ok: true };
  },
  async "radar-calendar"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { buyingCalendar } = await import("../_shared/radar-extra.ts");
    return await buyingCalendar(ws, b.force === true);
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
    const dg = async (v: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 8);
    const forme = { identifiant_commence_par_PAR: id.startsWith("PAR_"), longueur_identifiant: id.length, longueur_cle: sec.length, cle_commence_par_PAR: sec.startsWith("PAR_"),
      empreinte_cle: await dg(env("FT_CLIENT_SECRET")), empreinte_id: await dg(env("FT_CLIENT_ID")) };
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", "69871493-9885-465b-a597-f560e8656cd8").single();
    const { lbbCompanies } = await import("../_shared/radar-plus.ts");
    const off = await ftOffers(ws, ["agent de propreté"], ["92"]).then((o) => ({ ok: true, n: o.length, ex: o.slice(0, 3).map((x) => `${x.company} · ${x.summary}`) }), (e) => ({ ok: false, erreur: (e as Error).message }));
    const lbb = await lbbCompanies({ ...ws, targets: [{ id: "t", label: "test", naf: ["81.21Z"], actif: true }] }, ["92"], true).then((o) => ({ ok: true, n: o.length, ex: o.slice(0, 3).map((x) => `${x.company} · ${x.summary}`) }), (e) => ({ ok: false, erreur: (e as Error).message }));
    return { secrets: true, forme, offres_emploi: off, la_bonne_boite: lbb };
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
  // Test plateforme : partenaires + calendrier d'achat d'un espace précis
  async "extra-test"(req, b) {
    await cron(req);
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    setAi({ ws: ws.id });
    const { partnersRefresh, buyingCalendar } = await import("../_shared/radar-extra.ts");
    return { partenaires: await partnersRefresh(ws).catch((e) => ({ erreur: (e as Error).message })), calendrier: await buyingCalendar(ws, true).catch((e) => ({ erreur: (e as Error).message })) };
  },
  // Test plateforme : date d'arrivée d'un outil sur un site (archives du web)
  async "abo-test"(req, b) {
    await cron(req);
    const { adoptedAt } = await import("../_shared/radar-saas.ts");
    return { adopte: await adoptedAt(String(b.url ?? ""), String(b.tool ?? "")) };
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
