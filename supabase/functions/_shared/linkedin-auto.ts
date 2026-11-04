// Pilote LinkedIn : file d'actions jouées par l'extension Bingoo! dans le navigateur du client (sa propre session LinkedIn).
// Prudence d'abord : montée progressive, quotas bas, heures de bureau, pauses aléatoires, arrêt net au moindre avertissement.
import { HttpError } from "./http.ts";
import { admin, log, type Workspace } from "./core.ts";
import { parisParts } from "./time.ts";

export type LiAuto = { enabled?: boolean; accepted_at?: string; started_at?: string; paused_reason?: string | null; paused_at?: string | null };
type Ws = Workspace & { linkedin_auto?: LiAuto | null };

export const LI_LIMITS = { startPerDay: 5, stepPerDay: 3, maxPerDay: 20, maxPerWeek: 100, messagesPerDay: 25, relanceAfterDays: 6 };

/** Relance courte et humaine, une seule fois, s'il n'y a pas eu de réponse. */
export function relanceText(person: string | null | undefined) {
  const first = String(person ?? "").trim().split(/\s+/)[0] ?? "";
  return `${first ? `Bonjour ${first}, ` : "Bonjour, "}petite relance sur mon message de la semaine dernière : est-ce que le sujet vous parle, ou je vous laisse tranquille ?`;
}

/** Invitations autorisées aujourd'hui : 5 le premier jour, +3 par jour, 20 au plus (montée progressive). */
export function invitesToday(startedAt: string | undefined, now = new Date()) {
  const days = startedAt ? Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 864e5)) : 0;
  return Math.min(LI_LIMITS.maxPerDay, LI_LIMITS.startPerDay + LI_LIMITS.stepPerDay * days);
}
/** Heures de bureau à Paris : lundi au vendredi, 9 h – 18 h 30. */
export function officeHours(now = new Date()) {
  const p = parisParts(now);
  const mins = p.h * 60 + p.min;
  return p.wd <= 5 && mins >= 9 * 60 && mins <= 18 * 60 + 30;
}
const rnd = (a: number, b: number) => Math.round(a + Math.random() * (b - a));
const parisDayStart = (now = new Date()) => { const p = parisParts(now); return new Date(now.getTime() - (p.h * 60 + p.min) * 60000).toISOString(); };

async function counts(wsId: string) {
  const day = parisDayStart(), week = new Date(Date.now() - 7 * 864e5).toISOString();
  const q = (kind: string, since: string) => admin.from("linkedin_actions").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).eq("kind", kind).eq("status", "fait").gte("done_at", since);
  const [a, b, c, d] = await Promise.all([q("invitation", day), q("invitation", week), q("message", day), q("relance", day)]);
  return { invitesDay: a.count ?? 0, invitesWeek: b.count ?? 0, messagesDay: (c.count ?? 0) + (d.count ?? 0) };
}

/** Met en file une invitation pour chaque prospect prêt (profil trouvé, note et message rédigés). */
async function enqueue(ws: Ws) {
  const { data } = await admin.from("prospects").select("id").eq("workspace_id", ws.id).eq("linkedin_status", "a_envoyer").neq("linkedin_url", "").limit(200);
  const rows = (data ?? []).map((p: { id: string }) => ({ workspace_id: ws.id, prospect_id: p.id, kind: "invitation" }));
  if (rows.length) await admin.from("linkedin_actions").upsert(rows, { onConflict: "prospect_id,kind", ignoreDuplicates: true });
}

export async function liStatus(ws: Ws) {
  const auto = ws.linkedin_auto ?? {};
  const c = await counts(ws.id);
  const { count: queued } = await admin.from("linkedin_actions").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "a_faire");
  return { ...auto, limite_jour: invitesToday(auto.started_at), limite_semaine: LI_LIMITS.maxPerWeek, ...c, en_file: queued ?? 0, heures_bureau: officeHours() };
}

/** Réglages du pilote, depuis l'application (membre de l'espace). Activer exige d'avoir accepté le risque. */
export async function liSettings(ws: Ws, b: { enabled?: unknown; accept?: unknown }) {
  const auto: LiAuto = { ...(ws.linkedin_auto ?? {}) };
  if (b.accept === true && !auto.accepted_at) auto.accepted_at = new Date().toISOString();
  if (b.enabled === true) {
    if (!auto.accepted_at) throw new HttpError(400, "Accepte d'abord les conditions du pilote LinkedIn");
    auto.enabled = true; auto.paused_reason = null; auto.paused_at = null;
    if (!auto.started_at) auto.started_at = new Date().toISOString();
  }
  if (b.enabled === false) auto.enabled = false;
  await admin.from("workspaces").update({ linkedin_auto: auto }).eq("id", ws.id);
  if (b.enabled === true) { await enqueue({ ...ws, linkedin_auto: auto }); await log(ws.id, "linkedin", "Pilote LinkedIn activé"); }
  if (b.enabled === false) await log(ws.id, "linkedin", "Pilote LinkedIn arrêté");
  return await liStatus({ ...ws, linkedin_auto: auto });
}

/** Prochaine action pour l'extension, ou le temps d'attente avant de redemander. */
export async function liNext(ws: Ws) {
  const auto = ws.linkedin_auto ?? {};
  if (!auto.enabled) return { attendre: 900, raison: "Pilote LinkedIn désactivé dans Bingoo!" };
  if (auto.paused_reason) return { attendre: 1800, raison: `En pause : ${auto.paused_reason}` };
  if (!officeHours()) return { attendre: 1800, raison: "En dehors des heures de bureau" };
  await enqueue(ws);
  // Une action restée « en cours » plus de 15 minutes (onglet fermé, ordinateur en veille) revient dans la file
  await admin.from("linkedin_actions").update({ status: "a_faire", taken_at: null }).eq("workspace_id", ws.id).eq("status", "en_cours").lt("taken_at", new Date(Date.now() - 15 * 60000).toISOString());
  const c = await counts(ws.id);
  const kinds = ["verifier"];
  if (c.messagesDay < LI_LIMITS.messagesPerDay) kinds.unshift("message", "relance");
  if (c.invitesDay < invitesToday(auto.started_at) && c.invitesWeek < LI_LIMITS.maxPerWeek) kinds.push("invitation");
  const { data: a } = await admin.from("linkedin_actions").select("id, kind, prospect_id").eq("workspace_id", ws.id).eq("status", "a_faire").lte("due_at", new Date().toISOString())
    .in("kind", kinds).order("due_at", { ascending: true }).limit(1).maybeSingle();
  if (!a) return { attendre: 900, raison: c.invitesDay >= invitesToday(auto.started_at) ? "Quota d'invitations du jour atteint" : "Rien à faire pour l'instant" };
  const { data: p } = await admin.from("prospects").select("linkedin_url, linkedin_person, linkedin_note, linkedin_msg, name").eq("id", a.prospect_id).single();
  if (!p?.linkedin_url) { await admin.from("linkedin_actions").update({ status: "annule", result: "profil absent" }).eq("id", a.id); return { attendre: 30, raison: "Profil manquant, action annulée" }; }
  await admin.from("linkedin_actions").update({ status: "en_cours", taken_at: new Date().toISOString() }).eq("id", a.id);
  return {
    action: { id: a.id, type: a.kind, profil: p.linkedin_url, personne: p.linkedin_person, entreprise: p.name, note: a.kind === "invitation" ? String(p.linkedin_note ?? "").slice(0, 300) : "", message: a.kind === "message" ? p.linkedin_msg : a.kind === "relance" ? relanceText(p.linkedin_person) : "" },
    // Pause humaine après l'action : 1 à 4 minutes
    attendre: rnd(60, 240),
  };
}

const RESULTS = ["ok", "deja_invite", "deja_connecte", "connecte", "en_attente", "repondu", "introuvable", "limite", "avertissement", "erreur"] as const;

/** Compte rendu de l'extension après une action. Un avertissement ou une limite LinkedIn met tout le pilote en pause. */
export async function liReport(ws: Ws, b: { id?: unknown; resultat?: unknown; detail?: unknown }) {
  const id = String(b.id ?? ""), res = String(b.resultat ?? "") as typeof RESULTS[number], detail = String(b.detail ?? "").slice(0, 300);
  if (!RESULTS.includes(res)) throw new HttpError(400, "Résultat inconnu");
  const { data: a } = await admin.from("linkedin_actions").select("id, kind, prospect_id, created_at").eq("id", id).eq("workspace_id", ws.id).maybeSingle();
  if (!a) throw new HttpError(404, "Action introuvable");
  const now = new Date().toISOString();
  const done = (status = "fait") => admin.from("linkedin_actions").update({ status, done_at: now, result: `${res}${detail ? ` : ${detail}` : ""}` }).eq("id", a.id);
  const prospect = (s: string) => admin.from("prospects").update({ linkedin_status: s }).eq("id", a.prospect_id);
  const queue = (kind: string, hours: number) => admin.from("linkedin_actions").upsert({ workspace_id: ws.id, prospect_id: a.prospect_id, kind, status: "a_faire", due_at: new Date(Date.now() + hours * 3600_000).toISOString(), taken_at: null, done_at: null, result: "" }, { onConflict: "prospect_id,kind" });

  if (res === "limite" || res === "avertissement") {
    await admin.from("linkedin_actions").update({ status: "a_faire", taken_at: null }).eq("id", a.id);
    const auto = { ...(ws.linkedin_auto ?? {}), paused_reason: res === "limite" ? "LinkedIn a signalé une limite d'invitations" : "LinkedIn a affiché un avertissement", paused_at: now };
    await admin.from("workspaces").update({ linkedin_auto: auto }).eq("id", ws.id);
    await log(ws.id, "linkedin_alerte", `Pilote LinkedIn mis en pause : ${auto.paused_reason}. Relance-le dans quelques jours depuis la page LinkedIn.`);
    return { pause: true };
  }
  if (res === "erreur") {
    await admin.from("linkedin_actions").update({ status: "a_faire", taken_at: null, due_at: new Date(Date.now() + 2 * 3600_000).toISOString(), result: `erreur : ${detail}` }).eq("id", a.id);
    return { ok: true };
  }
  if (res === "introuvable") { await done("echec"); await prospect("introuvable"); return { ok: true }; }

  if (a.kind === "invitation") {
    if (res === "deja_connecte") { await done(); await prospect("connecte"); await queue("message", rnd(1, 3)); }
    else { await done(); await prospect("invite"); await queue("verifier", 24); }
    if (res === "ok") await log(ws.id, "linkedin", "Invitation LinkedIn envoyée");
  } else if (a.kind === "verifier") {
    if (res === "connecte" || res === "deja_connecte") { await done(); await prospect("connecte"); await queue("message", rnd(1, 3)); }
    else if (Date.now() - new Date(a.created_at).getTime() > 21 * 864e5) { await done("annule"); }
    else { await admin.from("linkedin_actions").update({ status: "a_faire", taken_at: null, due_at: new Date(Date.now() + 24 * 3600_000).toISOString() }).eq("id", a.id); }
  } else if (a.kind === "message") {
    if (res !== "ok") { await admin.from("linkedin_actions").update({ status: "a_faire", taken_at: null, due_at: new Date(Date.now() + 24 * 3600_000).toISOString(), result: res }).eq("id", a.id); return { ok: true }; }
    await done(); await prospect("message_envoye");
    await queue("relance", LI_LIMITS.relanceAfterDays * 24 + rnd(0, 6));
    await log(ws.id, "linkedin", "Premier message LinkedIn envoyé après acceptation");
  } else if (a.kind === "relance") {
    if (res === "repondu") {
      await done("annule");
      await admin.from("prospects").update({ status: "repondu" }).eq("id", a.prospect_id).in("status", ["nouveau", "pret", "sans_email", "a_valider", "envoye"]);
      await log(ws.id, "linkedin", "Un prospect a répondu sur LinkedIn : pas de relance");
    } else if (res === "ok") { await done(); await log(ws.id, "linkedin", "Relance LinkedIn envoyée"); }
    else if (res === "en_attente") { await done("annule"); }
    else { await admin.from("linkedin_actions").update({ status: "a_faire", taken_at: null, due_at: new Date(Date.now() + 24 * 3600_000).toISOString(), result: res }).eq("id", a.id); }
  }
  return { ok: true };
}
