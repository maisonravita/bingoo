// Mission pilotée : étapes lancées depuis l'écran Mission et tâche planifiée (jours ouvrés).
import { HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { admin, env, log, planOk, quota, requireMember, setAi, type Prospect, type Target } from "../_shared/core.ts";
import { draft, enrich, followups, mxOk, reconcileStuck, sendOne } from "../_shared/agents.ts";
import { canSend } from "../_shared/mail.ts";
import { warmup } from "../_shared/growth.ts";
import { radarToProspect } from "../_shared/radar.ts";
import { prepareOpp } from "../_shared/radar-plus.ts";
import { autopilot } from "../_shared/autopilot.ts";
import { siteContacts } from "../_shared/deep.ts";
import { siteSignals } from "../_shared/sitesignals.ts";
import { missionPilotCron, missionStep, type Mission } from "../_shared/mission.ts";

async function secret(name: string) {
  const { data } = await admin.from("app_secrets").select("value").eq("name", name).single();
  // Fermé par défaut : sans secret configuré, aucune requête ne passe (jamais "" === "")
  return String(data?.value ?? "") || `absent-${crypto.randomUUID()}`;
}

const routes: Record<string, (req: Request, b: Record<string, unknown>) => Promise<unknown>> = {
  // « Ton équipe cette nuit » : une ville construite par un client (OpenStreetMap), vérifiée puis gardée pour tous
  async "qg-ville"(req, b) {
    await requireMember(req, b.workspace_id);
    const key = String(b.key ?? "");
    if (!/^v1_-?\d{1,3}\.\d{2}_-?\d{1,3}\.\d{2}_\d{3,4}$/.test(key)) throw new HttpError(400, "Clé de ville invalide");
    const gz = Uint8Array.from(atob(String(b.gz ?? "")), (c) => c.charCodeAt(0));
    if (gz.length < 100 || gz.length > 12_000_000) throw new HttpError(400, "Ville trop grande");
    const path = `${key}.json.gz`;
    const { data: had } = await admin.storage.from("qg-villes").list("", { search: path, limit: 1 });
    if (had?.some((f) => f.name === path)) return { ok: true, deja: true };
    const text = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    const v = JSON.parse(text);
    const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);
    const okB = Array.isArray(v?.batiments) && v.batiments.length <= 200_000 && v.batiments.every((x: { id?: unknown; h?: unknown; rings?: unknown }) =>
      typeof x?.id === "string" && num(x.h) && Array.isArray(x.rings) && (x.rings as unknown[]).every((r) => Array.isArray(r) && (r as unknown[]).length <= 4000 && (r as unknown[]).every(num)));
    const okA = Array.isArray(v?.arbres) && v.arbres.length <= 200_000 && v.arbres.every((t: unknown) => Array.isArray(t) && t.length === 2 && t.every(num));
    if (!okB || !okA) throw new HttpError(400, "Ville illisible");
    const { error } = await admin.storage.from("qg-villes").upload(path, gz, { contentType: "application/gzip", upsert: false });
    if (error && !/exists/i.test(error.message)) throw new HttpError(500, error.message);
    return { ok: true };
  },
  async step(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { data: m } = await admin.from("missions").select("*").eq("id", String(b.mission_id ?? "")).eq("workspace_id", ws.id).single();
    if (!m) throw new HttpError(404, "Mission introuvable");
    return await missionStep(ws, m as Mission);
  },
  // Enquête (lecture gratuite du site, puis recherche web) : mêmes réponses que l'ancienne route « enrich »
  async enrich(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const n = await quota(ws.id, "enquete", 40, Math.min(Math.max(Number(b.count) || 3, 1), 4));
    let q = admin.from("prospects").select("*").eq("workspace_id", ws.id).is("enriched_at", null).in("status", ["nouveau"]);
    if (Array.isArray(b.ids) && b.ids.length) q = q.in("id", (b.ids as string[]).slice(0, 4));
    const { data } = await q.order("created_at", { ascending: true }).limit(60);
    const order = new Map(((ws.targets ?? []) as Target[]).map((t, i) => [t.id, i]));
    const batch = ((data ?? []) as Prospect[]).sort((a, c) => (order.get(a.target) ?? 9) - (order.get(c.target) ?? 9)).slice(0, n);
    if (!batch.length) return { done: 0, found: 0, remaining: 0 };
    const res = await Promise.allSettled(batch.map((p) => enrich(p, ((ws.targets ?? []) as Target[]).find((x) => x.id === p.target)?.interlocuteur ?? "")));
    const okN = res.filter((r) => r.status === "fulfilled" && r.value.email).length;
    for (let i = 0; i < batch.length; i++) {
      const r = res[i];
      const v = r.status === "fulfilled" ? r.value as { email: string; via?: string } : null;
      await log(ws.id, "enquete", `${batch[i].name} : ${v?.email ? (v.via === "site" ? "e-mail trouvé sur son site" : "e-mail trouvé") : "rien trouvé"}`);
    }
    if (res.every((r) => r.status === "rejected")) throw (res[0] as PromiseRejectedResult).reason;
    const { count } = await admin.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).is("enriched_at", null);
    return { done: batch.length, found: okN, remaining: count ?? 0 };
  },
  // Radar → contact prêt : fiche, coordonnées et e-mail rédigé à partir du signal (brouillon dans « À valider », jamais envoyé ici)
  async prepare(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await prepareOpp(ws, String(b.id ?? ""));
  },
  // Préparer un prospect déjà en base : enquête si besoin, puis brouillon (jamais d'envoi)
  async "prospect-prepare"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const load = async () => (await admin.from("prospects").select("*").eq("id", String(b.id ?? "")).eq("workspace_id", ws.id).single()).data as Prospect | null;
    let p = await load();
    if (!p) throw new HttpError(404, "Prospect introuvable");
    if (!p.enriched_at && !p.email) {
      await quota(ws.id, "enquete", 40);
      const e = await enrich(p, ((ws.targets ?? []) as Target[]).find((x) => x.id === p!.target)?.interlocuteur ?? "");
      await log(ws.id, "enquete", `${p.name} : ${e.email ? "e-mail trouvé" : "rien trouvé"} (assistant)`);
      p = (await load())!;
    }
    const last = async () => (await admin.from("messages").select("id, subject, body, status").eq("prospect_id", p!.id).eq("step", 0).order("created_at", { ascending: false }).limit(1)).data?.[0] ?? null;
    let msg = await last();
    if (!msg && p.email && ws.sender_name) {
      await quota(ws.id, "redaction", 80);
      await draft(ws, p);
      await log(ws.id, "redaction", `E-mail rédigé pour ${p.name} (assistant)`);
      msg = await last();
    }
    return { prospect: { id: p.id, name: p.name, email: p.email, phone: p.phone, contact_name: p.contact_name }, message: msg, reason: !p.email ? "no_email" : !ws.sender_name ? "no_sender" : null };
  },
  // Envoi d'un e-mail validé : contrôle du domaine de l'adresse, puis limites du jour
  async send(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    canSend(ws);
    const { data: msg } = await admin.from("messages").select("id, prospect_id, prospects(email, name)").eq("id", String(b.message_id ?? "")).eq("workspace_id", ws.id).single();
    if (!msg) throw new HttpError(404, "Message introuvable");
    const pr = (msg as unknown as { prospects: { email: string; name: string } | null }).prospects;
    if (pr?.email && !(await mxOk(pr.email))) {
      await admin.from("messages").update({ status: "ignore", error: "Le domaine de l'adresse ne reçoit pas de courrier" }).eq("id", msg.id);
      await admin.from("prospects").update({ email: "", status: "sans_email", channel: "", enrich_note: `Adresse ${pr.email} écartée : son domaine ne reçoit pas de courrier` }).eq("id", msg.prospect_id);
      await log(ws.id, "envoi", `${pr.name} : adresse invalide écartée avant l'envoi`);
      return { id: msg.id, skipped: "adresse invalide : son domaine ne reçoit pas de courrier. Le prospect repart en enquête." };
    }
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const { count } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", since.toISOString());
    const cap = warmup(ws).cap;
    if ((count ?? 0) >= cap) throw new HttpError(429, cap < ws.daily_limit
      ? `Préchauffage en cours : ${cap} envois maximum aujourd'hui. La limite monte chaque semaine pour protéger ta réputation d'expéditeur.`
      : `Limite de ${cap} envois par jour atteinte : la suite partira demain (ça protège ton domaine)`);
    const r = await sendOne(ws, msg.id);
    if ((r as { sent?: boolean }).sent) await log(ws.id, "envoi", "E-mail envoyé");
    return { ...r, sent_today: (count ?? 0) + ((r as { sent?: boolean }).sent ? 1 : 0), limit: cap };
  },
  // Contrôle quotidien de la plateforme : incidents envoyés par e-mail si une adresse d'alerte est configurée
  async health(req) {
    if ((req.headers.get("x-cron-key") ?? "") !== (await secret("cron_key"))) throw new HttpError(401, "Clé invalide");
    await reconcileStuck();
    const { data: incidents } = await admin.rpc("platform_incidents");
    const list = (incidents ?? []) as string[];
    const to = await secret("alert_email");
    if (!list.length || !to) return { incidents: list.length, emailed: false };
    const key = env("RESEND_API_KEY");
    const from = `Alertes <alertes@${env("PLATFORM_REPLY_DOMAIN", "maisonravita.fr")}>`;
    const text = `${list.length} point${list.length > 1 ? "s" : ""} à vérifier :\n\n${list.map((x) => `- ${x}`).join("\n")}\n\nDétails dans le tableau de bord administrateur.`;
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [to], subject: `Alerte plateforme : ${list.length} incident${list.length > 1 ? "s" : ""}`, text }) });
    return { incidents: list.length, emailed: r.ok };
  },
  // Pilote automatique de l'espace (remplace k/autopilot) : envois, relances, réserve de brouillons, rappels
  async autopilot(req) {
    if ((req.headers.get("x-cron-key") ?? "") !== (await secret("cron_key"))) throw new HttpError(401, "Clé invalide");
    const out: Record<string, unknown> = { envois_interrompus: await reconcileStuck() };
    const { data: list } = await admin.from("workspaces").select("*").eq("autonomy", "auto").eq("onboarded", true);
    for (const ws of (list ?? []).filter((w) => planOk(w))) {
      setAi({ ws: ws.id });
      try { out[ws.id] = await autopilot(ws, ""); } catch (e) { out[ws.id] = { error: (e as Error).message }; }
    }
    // Mode « à valider » : les relances J+5 / J+12 sont préparées aussi, en brouillon (elles ne partent qu'après validation)
    const { data: manual } = await admin.from("workspaces").select("*").neq("autonomy", "auto").eq("onboarded", true);
    for (const ws of (manual ?? []).filter((w) => planOk(w))) {
      setAi({ ws: ws.id });
      try { const r = await followups(ws); if (r.created) out[`relances_${ws.id}`] = r.created; } catch (e) { out[`relances_${ws.id}`] = { error: (e as Error).message }; }
    }
    return out;
  },
  // Diagnostic (clé de tâche) : ce que Bingoo lit sur un site
  async probe(req, b) {
    if ((req.headers.get("x-cron-key") ?? "") !== (await secret("cron_key"))) throw new HttpError(401, "Clé invalide");
    const sc = await siteContacts(String(b.url ?? ""));
    return { emails: sc.emails, phones: sc.phones, form: sc.form, signals: await siteSignals(sc.origin, sc.home) };
  },
  async cron(req) {
    if ((req.headers.get("x-cron-key") ?? "") !== (await secret("cron_key"))) throw new HttpError(401, "Clé invalide");
    return await missionPilotCron();
  },
};

Deno.serve(wrap(async (req) => {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const h = routes[parts[parts.indexOf("m") + 1] ?? ""];
  if (!h) throw new HttpError(404, "Action inconnue");
  if (req.method !== "POST") throw new HttpError(405, "POST attendu");
  return json(await h(req, await readJson(req)));
}));
