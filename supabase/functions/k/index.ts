// Point d'entrée unique : https://<ref>.supabase.co/functions/v1/k/<action>
import { HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { admin, log, PACKS, planOk, quota, requireMember, setAi, type Prospect, type Target } from "../_shared/core.ts";
import { analyze, normalizeUrl, readSite } from "../_shared/analyze.ts";
import { countTarget, searchTarget } from "../_shared/search.ts";
import { canSend } from "../_shared/mail.ts";
import { checkDomain, draft, enrich, followups, linkedin, sendOne, setDomain } from "../_shared/agents.ts";
import { autopilot, baseOf, book, bookingInfo, brief, callScript, checkCompetitor, suggestCompetitors, socialAudit, checkReplyDomain, handleReply, insight, publicQuote, quoteTotals, sendQuote, sendReply, setReplyDomain, signQuote } from "../_shared/pro.ts";
import { freeSlots } from "../_shared/time.ts";
import { assertKind, credits, deepEnrich, dropcontactPending, letter } from "../_shared/deep.ts";
import { analyzeCampaign, competitorAds, createCampaign, suggestVariants } from "../_shared/campaigns.ts";
import { meetingFollowup, meetingReminders, quoteReminders, sendMeetingFollowup } from "../_shared/convert.ts";
import { calendarFeed, checkout, connectCrm, distribute, invite, join, MAILBOXES, plans, portal, recharge, removeMailbox, revokeInvite, saveMailbox, setMember, stripeWebhook, syncCrm, warmup } from "../_shared/growth.ts";

type Body = Record<string, unknown> & { workspace_id?: string };

const LIMITS = { analyse: 6, recherche: 60, enquete: 40, redaction: 80, linkedin: 30, analyse_prospect: 40, brief: 20, script: 40, veille: 20, reponse: 60, social: 6, enquete_plus: 30, lettre: 40, campagne: 40 };

async function secret(name: string) {
  const { data } = await admin.from("app_secrets").select("value").eq("name", name).single();
  // Fermé par défaut : sans secret configuré, aucune requête ne passe (jamais "" === "")
  return String(data?.value ?? "") || `absent-${crypto.randomUUID()}`;
}
const prospectOf = async (wsId: string, id: unknown) => {
  const { data } = await admin.from("prospects").select("*").eq("id", String(id)).eq("workspace_id", wsId).single();
  if (!data) throw new HttpError(404, "Prospect introuvable");
  return data as Prospect;
};

const routes: Record<string, (req: Request, b: Body) => Promise<unknown>> = {
  // 1. Comprendre l'entreprise à partir de son site
  async analyze(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "analyse", LIMITS.analyse);
    // Deux questions facultatives de l'inscription : un client déjà signé (pour viser juste) et les concurrents (jamais prospectés)
    const clientEx = String(b.client_exemple ?? "").trim().slice(0, 300);
    const concurrents = String(b.concurrents ?? "").split(/[,;\n]+/).map((x) => x.trim()).filter((x) => x.length >= 2).slice(0, 15);
    const description = [String(b.description ?? "").slice(0, 3000), clientEx ? `Exemple de client déjà signé : ${clientEx}. Vise d'abord ce type d'entreprise et ses semblables.` : "", concurrents.length ? `Concurrents (à ne jamais viser) : ${concurrents.join(", ")}.` : ""].filter(Boolean).join("\n");
    let website = "";
    let content = "";
    if (b.website) {
      website = normalizeUrl(String(b.website));
      content = await readSite(website).catch((e) => { if (!description) throw e; return ""; });
    }
    if (!content && !description) throw new HttpError(400, "Donne l'adresse de ton site ou décris ton activité");
    const r = await analyze(content, description);
    const cfg = ((ws as unknown as { radar_cfg?: Record<string, unknown> }).radar_cfg ?? {}) as { outils_rivaux?: string[] };
    await admin.from("workspaces").update({
      website, profile: { ...r.profile, ...(clientEx ? { client_exemple: clientEx } : {}) }, targets: r.targets, zone: r.zone,
      name: ws.name || r.profile.nom || "",
      ...(concurrents.length ? { radar_cfg: { ...cfg, outils_rivaux: [...new Set([...(cfg.outils_rivaux ?? []), ...concurrents])] } } : {}),
    }).eq("id", ws.id);
    await log(ws.id, "analyse", `Analyse de ${website || "la description"} : ${r.targets.length} cibles définies`);
    return r;
  },

  // Recompter une cible modifiée
  async count(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const targets = (ws.targets ?? []) as Target[];
    for (const t of targets) t.total = await countTarget(t, ws.zone ?? []).catch(() => t.total);
    await admin.from("workspaces").update({ targets }).eq("id", ws.id);
    return { targets };
  },

  // 2. Trouver des établissements (registre officiel)
  async search(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const targets = (ws.targets ?? []) as Target[];
    const chosen = targets.filter((t) => t.actif !== false && (!b.target_id || t.id === b.target_id));
    if (!chosen.length) throw new HttpError(400, "Aucune cible active");
    const pages = Math.min(Math.max(Number(b.pages) || 2, 1), 4);
    let inserted = 0, found = 0;
    for (const t of chosen) {
      if (t.next_page === null) continue;
      await quota(ws.id, "recherche", LIMITS.recherche);
      const r = await searchTarget(ws.id, t, ws.zone ?? [], pages);
      t.next_page = r.nextPage;
      inserted += r.inserted; found += r.found;
      await log(ws.id, "recherche", `${t.label} : ${r.inserted} nouveaux établissements`);
    }
    await admin.from("workspaces").update({ targets }).eq("id", ws.id);
    return { inserted, found };
  },

  // 3. Trouver les e-mails (recherche web), par lots
  async enrich(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const n = await quota(ws.id, "enquete", LIMITS.enquete, Math.min(Math.max(Number(b.count) || 3, 1), 4));
    let q = admin.from("prospects").select("*").eq("workspace_id", ws.id).is("enriched_at", null).in("status", ["nouveau"]);
    if (Array.isArray(b.ids) && b.ids.length) q = q.in("id", (b.ids as string[]).slice(0, 4));
    // Les cibles les plus prometteuses d'abord (ordre des cibles)
    const { data } = await q.order("created_at", { ascending: true }).limit(60);
    const order = new Map(((ws.targets ?? []) as Target[]).map((t, i) => [t.id, i]));
    const batch = ((data ?? []) as Prospect[]).sort((a, c) => (order.get(a.target) ?? 9) - (order.get(c.target) ?? 9)).slice(0, n);
    if (!batch.length) return { done: 0, found: 0, remaining: 0 };
    const res = await Promise.allSettled(batch.map((p) => {
      const t = ((ws.targets ?? []) as Target[]).find((x) => x.id === p.target);
      return enrich(p, t?.interlocuteur ?? "");
    }));
    const okN = res.filter((r) => r.status === "fulfilled" && r.value.email).length;
    const failed = res.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    for (let i = 0; i < batch.length; i++) await log(ws.id, "enquete", `${batch[i].name} : ${res[i].status === "fulfilled" && (res[i] as PromiseFulfilledResult<{ email: string }>).value.email ? "e-mail trouvé" : "rien trouvé"}`);
    if (failed.length === batch.length) throw failed[0].reason;
    const { count } = await admin.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).is("enriched_at", null);
    return { done: batch.length, found: okN, remaining: count ?? 0 };
  },

  // 4. Rédiger les premiers e-mails, par lots
  async draft(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    if (!ws.sender_name) throw new HttpError(400, "Indique d'abord le nom de l'expéditeur dans Réglages");
    const n = await quota(ws.id, "redaction", LIMITS.redaction, Math.min(Math.max(Number(b.count) || 5, 1), 6));
    // Seulement les prospects avec un déclencheur (fait concret et récent), adresses nominatives d'abord
    const { aEcrire } = await import("../_shared/agents.ts");
    const batch = await aEcrire(ws.id, n);
    if (!batch.length) return { done: 0, remaining: 0, attente: "Aucun prospect avec un fait récent à citer : Bingoo! attend un signal avant d'écrire." };
    const res = await Promise.allSettled(batch.map((p) => draft(ws, p)));
    const ok = res.filter((r) => r.status === "fulfilled").length;
    if (!ok) throw (res[0] as PromiseRejectedResult).reason;
    for (let i = 0; i < ok; i++) await log(ws.id, "redaction", "E-mail rédigé");
    return { done: ok, remaining: (await aEcrire(ws.id, 200)).length };
  },

  // Régénérer un brouillon
  async redraft(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "redaction", LIMITS.redaction);
    const { data: m } = await admin.from("messages").select("id, prospect_id, status").eq("id", String(b.message_id)).eq("workspace_id", ws.id).single();
    if (!m || m.status !== "brouillon") throw new HttpError(400, "Brouillon introuvable");
    const { data: p } = await admin.from("prospects").select("*").eq("id", m.prospect_id).single();
    // L'ancien brouillon est mis de côté, et rétabli si la réécriture échoue (rien n'est perdu)
    await admin.from("messages").update({ status: "ignore", error: "Réécriture en cours" }).eq("id", m.id);
    let r: { id: string };
    try { r = await draft(ws, p as Prospect); }
    catch (e) { await admin.from("messages").update({ status: "brouillon", error: "" }).eq("id", m.id); throw e; }
    await admin.from("messages").delete().eq("id", m.id);
    await log(ws.id, "redaction", "E-mail réécrit");
    const { data: fresh } = await admin.from("messages").select("*").eq("id", r.id).single();
    return fresh;
  },

  // LinkedIn assisté : décideur + invitation + message, pour un lot de prospects
  async linkedin(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const n = await quota(ws.id, "linkedin", LIMITS.linkedin, Math.min(Math.max(Number(b.count) || 3, 1), 4));
    let q = admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("linkedin_status", "").not("status", "in", "(refus,ignore,client)");
    if (Array.isArray(b.ids) && b.ids.length) q = q.in("id", (b.ids as string[]).slice(0, 4));
    else q = q.in("status", ["sans_email", "envoye", "pret", "a_valider"]);
    const { data } = await q.order("updated_at", { ascending: false }).limit(n);
    const batch = (data ?? []) as Prospect[];
    if (!batch.length) return { done: 0, found: 0 };
    const res = await Promise.allSettled(batch.map((p) => linkedin(ws, p, { hold: b.hold === true })));
    const ok = res.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ linkedin_status: string }>[];
    if (!ok.length) throw (res[0] as PromiseRejectedResult).reason;
    for (const _ of ok) await log(ws.id, "linkedin", "Profil LinkedIn recherché");
    return { done: ok.length, found: ok.filter((r) => r.value.linkedin_status === "a_envoyer" || (b.hold === true && r.value.linkedin_status === "")).length, results: ok.map((r) => r.value) };
  },

  // Relances à préparer (appelé à l'ouverture de « Ta journée »)
  async followups(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await followups(ws);
  },

  // ---------------- V2 : réponses
  async "li-settings"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { liSettings, liStatus } = await import("../_shared/linkedin-auto.ts");
    return b.set ? await liSettings(ws, b) : await liStatus(ws);
  },
  async "reply-paste"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "reponse", LIMITS.reponse);
    const text = String(b.text ?? "").slice(0, 8000);
    if (text.trim().length < 2) throw new HttpError(400, "Colle le texte de la réponse");
    const p = b.prospect_id ? await prospectOf(ws.id, b.prospect_id) : null;
    return await handleReply(ws, p, { fromEmail: String(b.from_email ?? p?.email ?? ""), subject: String(b.subject ?? ""), text }, baseOf(ws));
  },
  async "reply-send"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await sendReply(ws, String(b.reply_id), String(b.subject ?? ""), String(b.body ?? ""));
    return { ok: true };
  },
  async "reply-domain"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await setReplyDomain(ws);
  },
  async "reply-domain-check"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await checkReplyDomain(ws);
  },

  // ---------------- V2 : rendez-vous et analyses
  async slots(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return { slots: (await freeSlots(ws, 14)).slice(0, 60).map((d) => d.toISOString()) };
  },
  async brief(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "brief", LIMITS.brief);
    await log(ws.id, "brief", "Fiche de rendez-vous préparée");
    return await brief(ws, String(b.meeting_id));
  },
  // Compte stratégique : interlocuteurs, angle par personne, plan sur 6 semaines
  async "plan-compte"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "analyse_prospect", LIMITS.analyse_prospect);
    setAi({ ws: ws.id, live: true });
    const { planCompte } = await import("../_shared/compte.ts");
    const plan = await planCompte(ws, await prospectOf(ws.id, String(b.prospect_id ?? "")));
    await log(ws.id, "analyse_prospect", "Plan de compte préparé");
    return plan;
  },
  async insight(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const ids = (Array.isArray(b.ids) ? b.ids : [b.prospect_id]).filter(Boolean).slice(0, 3);
    const n = await quota(ws.id, "analyse_prospect", LIMITS.analyse_prospect, ids.length || 1);
    const out = [];
    for (const id of ids.slice(0, n)) {
      out.push(await insight(ws, await prospectOf(ws.id, id)));
      await log(ws.id, "analyse_prospect", "Prospect analysé");
    }
    return { results: out };
  },
  async "call-script"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "script", LIMITS.script);
    await log(ws.id, "script", "Script d'appel préparé");
    return await callScript(ws, await prospectOf(ws.id, b.prospect_id));
  },

  // ---------------- V3 : devis, veille
  async "quote-send"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await sendQuote(ws, String(b.quote_id), baseOf(ws));
    return { ok: true };
  },
  async "quote-totals"(_req, b) {
    return quoteTotals({ lines: (b.lines as { qty: number; price: number }[]) ?? [], vat_rate: Number(b.vat_rate ?? 20) });
  },
  async "competitor-check"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "veille", LIMITS.veille);
    return await checkCompetitor(ws, String(b.competitor_id), !!b.force);
  },
  async "campaign-suggest"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "campagne", LIMITS.campagne);
    return await suggestVariants(ws, String(b.target_id ?? ""), String(b.goal ?? "rdv"));
  },
  async "campaign-create"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await createCampaign(ws, b);
  },
  async "campaign-analyze"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "campagne", LIMITS.campagne);
    await log(ws.id, "campagne", "Campagne analysée");
    return await analyzeCampaign(ws, String(b.campaign_id ?? ""));
  },
  async "competitor-ads"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "veille", LIMITS.veille);
    return await competitorAds(ws, String(b.competitor_id ?? ""));
  },
  async "enrich-deep"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await dropcontactPending(ws).catch((e) => console.error(e));
    const n = await quota(ws.id, "enquete_plus", LIMITS.enquete_plus, 1);
    let q = admin.from("prospects").select("*").eq("workspace_id", ws.id).lt("enrich_level", 2).in("status", ["sans_email", "nouveau"]);
    if (Array.isArray(b.ids) && b.ids.length) q = admin.from("prospects").select("*").eq("workspace_id", ws.id).in("id", b.ids.slice(0, 1));
    else q = q.eq("status", "sans_email").order("score", { ascending: false, nullsFirst: false });
    const { data } = await q.limit(n);
    const out = [];
    for (const p of data ?? []) {
      const t = (ws.targets ?? []).find((x) => x.id === p.target);
      const r = await deepEnrich(ws, p as Prospect, t?.interlocuteur ?? "");
      await log(ws.id, "enquete_plus", `${p.name} : ${r.email ? "e-mail trouvé" : `canal ${r.channel || "aucun"}`}`);
      out.push(r);
    }
    const { count } = await admin.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "sans_email").lt("enrich_level", 2);
    return { results: out, found: out.filter((r) => r.email).length, remaining: count ?? 0 };
  },
  async letter(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "lettre", LIMITS.lettre);
    await log(ws.id, "lettre", b.kind === "courrier" ? "Lettre préparée" : "Message de formulaire préparé");
    return await letter(ws, await prospectOf(ws.id, b.prospect_id), assertKind(b.kind));
  },
  async credits(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await credits(ws);
  },
  async "social-audit"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "social", LIMITS.social);
    const given = (b.socials && typeof b.socials === "object" ? b.socials : {}) as Record<string, string>;
    return await socialAudit(ws, given);
  },
  async "competitor-suggest"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "veille", LIMITS.veille);
    await log(ws.id, "veille", "Recherche de concurrents");
    return { suggestions: await suggestCompetitors(ws) };
  },

  // ---------------- Pages publiques (sans connexion)
  async "public-booking"(_req, b) {
    const { ws, p } = await bookingInfo(String(b.slug ?? ""), b.t ? String(b.t) : null);
    const slots = await freeSlots(ws, 21);
    return {
      company: ws.profile?.nom || ws.name, person: ws.sender_name, duration: ws.meeting_minutes, location: ws.meeting_location,
      slots: slots.slice(0, 150).map((d) => d.toISOString()),
      prefill: p ? { name: p.contact_name, email: p.email, company: p.name, phone: p.phone } : null,
    };
  },
  async "public-book"(req, b) {
    // Anti-abus : 3 réservations par visiteur et 25 par espace et par jour (faux rendez-vous, e-mails envoyés au nom du client)
    const { freeLimit } = await import("../_shared/free-tools.ts");
    await freeLimit(req, `rdv:${String(b.slug ?? "").slice(0, 60)}`, 3, 25, { visitor: "Tu as déjà réservé plusieurs créneaux aujourd'hui. Réponds à l'e-mail reçu si tu dois changer d'horaire.", total: "Les réservations en ligne sont momentanément fermées pour cet agenda. Réessaie demain ou réponds à l'e-mail reçu." });
    return await book(String(b.slug ?? ""), b as Record<string, string>);
  },
  async "public-quote"(_req, b) {
    return await publicQuote(String(b.token ?? ""));
  },
  async "public-sign"(req, b) {
    const ip = req.headers.get("cf-connecting-ip")?.trim() ?? "";
    return await signQuote(String(b.token ?? ""), String(b.name ?? ""), b.accept !== false, ip);
  },

  // ---------------- Webhook des réponses et tâche planifiée (clé secrète)
  // Ancien point d'entrée du webhook : remplacé par n/inbound (signature vérifiée)
  async inbound() {
    throw new HttpError(410, "Point d'entrée remplacé par n/inbound");
  },
  async autopilot(req) {
    if ((req.headers.get("x-cron-key") ?? "") !== (await secret("cron_key"))) throw new HttpError(401, "Clé invalide");
    const { data: list } = await admin.from("workspaces").select("*").eq("autonomy", "auto").eq("onboarded", true);
    const out: Record<string, unknown> = {};
    for (const ws of (list ?? []).filter((w) => planOk(w))) {
      setAi({ ws: ws.id });
      try { out[ws.id] = await autopilot(ws, baseOf(ws)); } catch (e) { out[ws.id] = { error: (e as Error).message }; }
    }
    // Rappels de RDV pour tous les espaces ; relance des devis pour ceux en pilote automatique
    const { data: every } = await admin.from("workspaces").select("*").eq("onboarded", true);
    for (const ws of every ?? []) {
      setAi({ ws: ws.id });
      try {
        const r = await meetingReminders(ws);
        const d = ws.autonomy === "auto" && planOk(ws) ? await quoteReminders(ws, baseOf(ws)) : 0;
        if (r || d) out[`suivi_${ws.id}`] = { rappels: r, devis: d };
      } catch (e) { out[`suivi_${ws.id}`] = { error: (e as Error).message }; }
    }
    const { data: crm } = await admin.from("workspaces").select("*").or("integrations->hubspot->>ok.eq.true,integrations->pipedrive->>ok.eq.true");
    for (const ws of crm ?? []) {
      try { out[`crm_${ws.id}`] = await syncCrm(ws); } catch (e) { out[`crm_${ws.id}`] = { error: (e as Error).message }; }
    }
    return out;
  },

  // 5. Domaine d'envoi
  async domain(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await setDomain(ws, String(b.domain ?? ""));
  },
  async "domain-check"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await checkDomain(ws);
  },

  // Mode d'envoi (validation ou pilote automatique) : réservé au propriétaire et aux administrateurs de l'espace
  async autonomy(req, b) {
    const { ws, role } = await requireMember(req, b.workspace_id);
    if (!["owner", "admin"].includes(role)) throw new HttpError(403, "Seuls le propriétaire et les administrateurs peuvent changer le mode d'envoi");
    const mode = b.mode === "auto" ? "auto" : "valider";
    await admin.from("workspaces").update({ autonomy: mode }).eq("id", ws.id);
    await log(ws.id, "reglage", mode === "auto" ? "Pilote automatique activé" : "Envoi sur validation");
    return { autonomy: mode };
  },

  // 6. Envoyer un message validé
  async send(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await (await import("../_shared/boites.ts")).peutEnvoyer(ws);
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const { count } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", since.toISOString());
    const cap = warmup(ws).cap * await (await import("../_shared/boites.ts")).nbBoites(ws);
    if ((count ?? 0) >= cap) throw new HttpError(429, warmup(ws).cap < ws.daily_limit
      ? `Préchauffage en cours : ${cap} envois maximum aujourd'hui. La limite monte chaque semaine pour protéger ta réputation d'expéditeur.`
      : `Limite de ${cap} envois par jour atteinte : la suite partira demain (ça protège ton domaine)`);
    const r = await sendOne(ws, String(b.message_id));
    if ((r as { sent?: boolean }).sent) await log(ws.id, "envoi", "E-mail envoyé");
    return { ...r, sent_today: (count ?? 0) + ((r as { sent?: boolean }).sent ? 1 : 0), limit: cap };
  },

  // ---------------- Croissance
  async warmup(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const { count } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", since.toISOString());
    return { ...warmup(ws), sent_today: count ?? 0, limit: ws.daily_limit, started: ws.warmup_started };
  },
  // Santé de l'envoi : DNS du domaine (SPF, DKIM, DMARC), domaine séparé, rebonds. Gratuit, sans IA.
  async "sante-envoi"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await (await import("../_shared/sante.ts")).santeEnvoi(ws);
  },
  async "mailbox-options"() {
    return { providers: Object.entries(MAILBOXES).map(([key, v]) => ({ key, ...v })) };
  },
  async "mailbox-save"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "integration", 20);
    return await saveMailbox(ws, b);
  },
  // Plusieurs boîtes d'envoi : liste, « ajouter une autre » (la principale est rangée), retrait, pause
  async "boites"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return { boites: await (await import("../_shared/boites.ts")).liste(ws), cap: warmup(ws).cap };
  },
  async "boite-ajouter"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await (await import("../_shared/boites.ts")).ranger(ws);
  },
  async "boite-retirer"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await (await import("../_shared/boites.ts")).retirer(ws, String(b.id ?? ""));
  },
  async "boite-pause"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await admin.from("mailboxes").update({ actif: b.actif === true }).eq("id", String(b.id ?? "")).eq("workspace_id", ws.id);
    return { ok: true };
  },
  async "mailbox-remove"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await removeMailbox(ws);
  },
  async "team-invite"(req, b) {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    return await invite(ws, userId, b);
  },
  async "team-revoke"(req, b) {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    return await revokeInvite(ws, userId, String(b.invite_id ?? ""));
  },
  async "team-member"(req, b) {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    return await setMember(ws, userId, String(b.user_id ?? ""), String(b.action ?? ""));
  },
  async "team-distribute"(req, b) {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    return await distribute(ws, userId, b);
  },
  async "team-join"(req, b) {
    return await join(req, String(b.token ?? ""));
  },
  async "crm-connect"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "integration", 20);
    return await connectCrm(ws, b);
  },
  async "crm-sync"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await syncCrm(ws, 40);
  },
  async "meeting-followup"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "brief", LIMITS.brief);
    return await meetingFollowup(ws, String(b.meeting_id ?? ""), String(b.notes ?? ""));
  },
  async "meeting-followup-send"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    return await sendMeetingFollowup(ws, String(b.meeting_id ?? ""), String(b.subject ?? ""), String(b.body ?? ""));
  },
  async plans() {
    return { plans: plans(), packs: Object.entries(PACKS).filter(([, p]) => !p.prospects).map(([key, p]) => ({ key, label: p.label, price: p.price, work: p.work })), prospect_pack: { key: "p100", ...PACKS.p100 }, payments: !!Deno.env.get("STRIPE_SECRET_KEY") };
  },
  async quota(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { prospectQuota } = await import("../_shared/quota.ts");
    return await prospectQuota(ws);
  },
  // Garantie premier rendez-vous + mois offerts + lien de parrainage
  async garantie(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { garantie } = await import("../_shared/garantie.ts");
    const { count: filleuls } = await admin.from("workspaces").select("id", { count: "exact", head: true }).eq("referred_by", ws.id);
    return { garantie: await garantie(ws as never), perks: (ws as { perks?: unknown[] }).perks ?? [], code: (ws as { referral_code?: string }).referral_code ?? "", filleuls: filleuls ?? 0 };
  },
  async "billing-checkout"(req, b) {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    return await checkout(ws, userId, String(b.plan ?? ""), b.yearly === true);
  },
  async "billing-recharge"(req, b) {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    return await recharge(ws, userId, String(b.pack ?? ""));
  },
  async "billing-portal"(req, b) {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    return await portal(ws, userId);
  },
};

Deno.serve(wrap(async (req) => {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const name = parts[parts.indexOf("k") + 1] ?? "";
  if (name === "calendar" && req.method === "GET") {
    const ics = await calendarFeed(new URL(req.url).searchParams.get("t") ?? "");
    return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "max-age=900", "Access-Control-Allow-Origin": "*" } });
  }
  if (name === "stripe-webhook" && req.method === "POST") return json(await stripeWebhook(req));
  const h = routes[name];
  if (!h) throw new HttpError(404, "Action inconnue");
  if (req.method !== "POST") throw new HttpError(405, "POST attendu");
  return json(await h(req, await readJson<Body>(req)));
}));
