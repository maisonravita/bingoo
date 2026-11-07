// Pilote automatique d'un espace (appelé par la tâche planifiée m/autopilot)
import { admin, log, repliesTracked, sendReady, type Prospect, type Workspace } from "./core.ts";
import { warmup } from "./growth.ts";
import { bounceGuard, draft, enrich, followups, sendOne } from "./agents.ts";
import { deepEnrich, dropcontactPending } from "./deep.ts";
import { searchTarget } from "./search.ts";
// ================================================================ Pilote automatique (appelé par la tâche planifiée)
/** Recherche des contacts (e-mail, téléphone, décideur) des meilleurs prospects, sans rien envoyer : pour tous les espaces,
 *  y compris ceux qui valident chaque message. Les plus prometteurs d'abord (score), dans l'enveloppe IA du mois de l'espace. */
export async function rechercheContacts(ws: Workspace, report: Record<string, number>, o: { reserve: number; parJour: number; parPassage: number; origine: string }) {
  const { count: ready } = await admin.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "pret");
  if ((ready ?? 0) >= o.reserve) return;
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count: done } = await admin.from("activity").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("kind", "enquete").gte("created_at", since.toISOString());
  if ((done ?? 0) >= o.parJour) return;
  // Les mieux notés d'abord, corrigés par ce que tes résultats ont appris (entreprises qui ressemblent à celles qui ont dit oui)
  const { data: pool } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("status", "nouveau").is("enriched_at", null).is("mission_id", null)
    .order("score", { ascending: false, nullsFirst: false }).limit(300);
  const { appris, bonus } = await import("./appris.ts");
  const a = await appris(ws).catch(() => null);
  const { declencheur } = await import("./agents.ts");
  const todo = (pool ?? []).map((p) => ({ p, k: (Number(p.score) || 50) * bonus(p, ws, a) * (declencheur(p as Prospect) ? 3 : 1) })).sort((x, y) => y.k - x.k).map((x) => x.p)
    .slice(0, Math.min(o.parPassage, o.parJour - (done ?? 0)));
  for (const p of todo ?? []) {
    const t = (ws.targets ?? []).find((x) => x.id === p.target);
    try { const r = await enrich(p as Prospect, t?.interlocuteur ?? ""); report.enquetes = (report.enquetes ?? 0) + 1; await log(ws.id, "enquete", `${p.name} : ${r.email ? "e-mail trouvé" : "rien trouvé"} (${o.origine})`); }
    catch (e) { console.error(e); if (/enveloppe|pause|plafond/i.test((e as Error).message)) return; }
  }
}

export async function autopilot(ws: Workspace, base: string) {
  const report: Record<string, number> = {};
  const hourParis = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const dow = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(new Date());
  if (["Sat", "Sun"].includes(dow) || hourParis < 8 || hourParis >= 18) return { skipped: "hors horaires" };

  // Missions : leurs prospects sont pilotés par le moteur de mission ; ceux d'une mission en pause ne bougent plus
  const { data: paused } = await admin.from("missions").select("id").eq("workspace_id", ws.id).neq("status", "active");
  const pausedIds = new Set((paused ?? []).map((m) => m.id));

  // 1. Relances préparées (seulement si les réponses sont suivies, sinon on risquerait de relancer quelqu'un qui a répondu)
  if (repliesTracked(ws)) report.relances = (await followups(ws)).created;

  // 2. Envois (premiers messages + relances), étalés : 3 par passage
  // Santé de l'envoi (DNS du domaine, rebonds) revue une fois par jour : elle fixe le plafond de sécurité
  const sa = (ws as Workspace & { sante_envoi?: { at?: string } }).sante_envoi;
  if (!sa?.at || Date.now() - Date.parse(sa.at) > 20 * 36e5) {
    const s = await (await import("./sante.ts")).santeEnvoi(ws).catch(() => null);
    if (s) (ws as Workspace & { sante_envoi?: unknown }).sante_envoi = s;
  }
  const guard = await bounceGuard(ws);
  if (!guard.ok) report.envois_suspendus_rebonds = guard.bounced;
  const pret = sendReady(ws) || (!!ws.postal_address && (await (await import("./boites.ts")).boites(ws)).length > 0);
  if (pret && guard.ok) {
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const { count } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", since.toISOString());
    let left = Math.min(3, warmup(ws).cap * await (await import("./boites.ts")).nbBoites(ws) - (count ?? 0));
    if (left > 0) {
      // Un message dont un fait n'a pas de source attend la validation humaine : jamais d'envoi automatique
      let q = admin.from("messages").select("id, step, prospects(mission_id)").eq("workspace_id", ws.id).eq("status", "brouillon").eq("check_note", "");
      if (!repliesTracked(ws)) q = q.eq("step", 0);
      const { data: all } = await q.order("step", { ascending: false }).order("created_at").limit(left + 20);
      const todo = (all ?? []).filter((m) => !pausedIds.has((m.prospects as { mission_id?: string } | null)?.mission_id ?? "")).slice(0, left);
      for (const m of todo) {
        let r: unknown;
        try { r = await sendOne(ws, m.id); } catch (e) { console.error("envoi", (e as Error).message); if ((e as { status?: number }).status === 429) break; continue; }
        if ((r as { sent?: boolean }).sent) { report.envoyes = (report.envoyes ?? 0) + 1; await log(ws.id, "envoi", "E-mail envoyé (pilote automatique)"); }
        left--;
      }
    }
  }


  // 3. Rédaction : une petite réserve de 5 messages forts (déclencheur obligatoire, adresses nominatives d'abord)
  const { count: drafts } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "brouillon").eq("step", 0);
  if ((drafts ?? 0) < 5 && ws.sender_name) {
    const { aEcrire } = await import("./agents.ts");
    const ready = await aEcrire(ws.id, Math.min(3, 5 - (drafts ?? 0)), (q) => q.is("mission_id", null));
    for (const p of ready ?? []) { try { await draft(ws, p as Prospect); report.rediges = (report.rediges ?? 0) + 1; await log(ws.id, "redaction", "E-mail rédigé (pilote automatique)"); } catch (e) { console.error(e); } }
  }

  // 4. Enquête : garder une réserve de 15 prospects joignables
  await rechercheContacts(ws, report, { reserve: 15, parJour: 30, parPassage: 3, origine: "pilote automatique" });

  // 4 bis. Détective : résultats Dropcontact en attente, puis 1 enquête approfondie par passage
  try {
    report.dropcontact = await dropcontactPending(ws);
    const since = new Date(); since.setUTCHours(0, 0, 0, 0);
    const { count: deep } = await admin.from("activity").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("kind", "enquete_plus").gte("created_at", since.toISOString());
    if ((deep ?? 0) < 20) {
      const { data: hard } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("status", "sans_email").lt("enrich_level", 2).is("mission_id", null).order("score", { ascending: false, nullsFirst: false }).limit(1);
      for (const p of hard ?? []) {
        const t = (ws.targets ?? []).find((x) => x.id === p.target);
        const r = await deepEnrich(ws, p as Prospect, t?.interlocuteur ?? "", false);
        report.approfondies = (report.approfondies ?? 0) + 1;
        await log(ws.id, "enquete_plus", `${p.name} : ${r.email ? "e-mail trouvé" : `canal ${r.channel || "aucun"}`} (pilote automatique)`);
      }
    }
  } catch (e) { console.error("détective", e); }

  // 5. Nouveaux prospects quand le stock baisse
  const { count: stock } = await admin.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "nouveau");
  if ((stock ?? 0) < 30 && hourParis === 8) {
    const targets = ws.targets ?? [];
    for (const t of targets.filter((x) => x.actif !== false && x.next_page !== null).slice(0, 2)) {
      const r = await searchTarget(ws.id, t, ws.zone ?? [], 1);
      t.next_page = r.nextPage;
      report.trouves = (report.trouves ?? 0) + r.inserted;
    }
    await admin.from("workspaces").update({ targets }).eq("id", ws.id);
  }
  void base;
  return report;
}
