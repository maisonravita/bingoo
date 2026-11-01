// Assistant Bingoo : une demande en langage naturel, l'IA choisit et enchaîne les actions de l'app.
// Les actions passent par les routes existantes avec la session de l'utilisateur : mêmes contrôles d'accès,
// mêmes limites du jour. Aucun outil n'envoie d'e-mail : tout brouillon attend la validation humaine.
import { HttpError } from "./http.ts";
import { admin, env, log, type Workspace } from "./core.ts";

type Msg = { role: "user" | "assistant"; content: unknown };
type Ctx = { ws: Workspace; auth: string; steps: { tool: string; label: string }[]; links: { label: string; to: string }[] };

const FN = (path: string) => `${env("SUPABASE_URL")}/functions/v1/${path}`;

async function callFn(ctx: Ctx, path: string, body: Record<string, unknown> = {}) {
  const r = await fetch(FN(path), {
    method: "POST",
    headers: { Authorization: ctx.auth, apikey: env("SUPABASE_ANON_KEY"), "content-type": "application/json" },
    body: JSON.stringify({ workspace_id: ctx.ws.id, ...body }),
    signal: AbortSignal.timeout(110000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.error) return { erreur: String(data?.error ?? `erreur ${r.status}`) };
  return data;
}

const cut = (s: unknown, n = 160) => String(s ?? "").slice(0, n);
const link = (ctx: Ctx, label: string, to: string) => { if (!ctx.links.some((l) => l.to === to)) ctx.links.push({ label, to }); };

// ------------------------------------------------------------------ Outils
const TOOLS = [
  { name: "etat_espace", description: "Vue d'ensemble de l'espace : prospects par statut, e-mails à valider, réponses à traiter, missions, opportunités Radar, concurrents suivis. À appeler en premier si la demande est générale.", input_schema: { type: "object", properties: {} } },
  { name: "radar_opportunites", description: "Liste les opportunités détectées par le Radar (entreprises qui recrutent, grandissent, ou appels d'offres publics), les plus récentes d'abord.", input_schema: { type: "object", properties: { type: { type: "string", enum: ["recrutement", "croissance", "appel_offres", "tous"] }, departement: { type: "string", description: "Code à 2 chiffres, optionnel" }, nombre: { type: "integer", description: "1 à 20" } } } },
  { name: "radar_scanner", description: "Relance une détection Radar (appels d'offres + signaux web). Coûte un peu de budget IA : seulement si l'utilisateur demande de nouvelles opportunités ou si le Radar est vide.", input_schema: { type: "object", properties: { web: { type: "boolean", description: "true pour forcer la recherche web (plus lente)" } } } },
  { name: "preparer_opportunite", description: "Transforme une opportunité Radar en prospect : retrouve l'entreprise au registre, cherche le contact et rédige un e-mail personnalisé en brouillon (jamais envoyé). Une opportunité à la fois.", input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "missions_liste", description: "Liste les missions (objectif, statut, progression, journal récent).", input_schema: { type: "object", properties: {} } },
  { name: "mission_planifier", description: "Prépare le plan chiffré d'une nouvelle mission à partir d'un objectif écrit (ex. « 10 rendez-vous avec des cliniques à Lyon d'ici fin janvier »). Ne crée rien : renvoie le plan à présenter à l'utilisateur.", input_schema: { type: "object", properties: { objectif: { type: "string" } }, required: ["objectif"] } },
  { name: "mission_creer", description: "Crée et lance la mission à partir du plan renvoyé par mission_planifier. UNIQUEMENT après accord explicite de l'utilisateur sur ce plan.", input_schema: { type: "object", properties: { objective: { type: "string" }, goal_type: { type: "string", enum: ["rdv", "clients"] }, goal_count: { type: "integer" }, deadline: { type: "string" }, target_ids: { type: "array", items: { type: "string" } }, zone: { type: "array", items: { type: "string" } } }, required: ["objective", "goal_type", "goal_count", "target_ids"] } },
  { name: "mission_avancer", description: "Fait avancer une mission d'une étape maintenant (Radar, recherche, enquête ou rédaction selon ce qui manque). Jamais d'envoi.", input_schema: { type: "object", properties: { mission_id: { type: "string" } }, required: ["mission_id"] } },
  { name: "prospects_chercher", description: "Cherche dans les prospects de l'espace (nom, ville, activité, statut, signal).", input_schema: { type: "object", properties: { texte: { type: "string" }, statut: { type: "string", enum: ["nouveau", "pret", "sans_email", "a_valider", "envoye", "repondu", "rdv", "client", "refus"] }, signal: { type: "string", description: "type de signal, ex. recrutement, pub_google, concurrent, levee" }, nombre: { type: "integer" } } } },
  { name: "prospect_preparer", description: "Pour un prospect existant : cherche son e-mail si besoin, puis rédige l'e-mail personnalisé en brouillon (jamais envoyé).", input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "concurrents", description: "Concurrents suivis par Espion avec notre positionnement face à chacun.", input_schema: { type: "object", properties: {} } },
  { name: "reponses_a_traiter", description: "Réponses de prospects pas encore traitées (intéressés, questions, prix, rappels).", input_schema: { type: "object", properties: {} } },
];

const STATUS = ["nouveau", "pret", "sans_email", "a_valider", "envoye", "repondu", "rdv", "client", "refus"];

// deno-lint-ignore no-explicit-any
async function runTool(ctx: Ctx, name: string, i: any): Promise<unknown> {
  const ws = ctx.ws;
  switch (name) {
    case "etat_espace": {
      const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
      const byStatus: Record<string, number> = {};
      await Promise.all(STATUS.map(async (s) => { byStatus[s] = await count(admin.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", s)); }));
      const [aValider, reponses, radar, conc] = await Promise.all([
        count(admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "brouillon")),
        count(admin.from("replies").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("handled", false).in("class", ["interesse", "question", "prix", "rappel"])),
        count(admin.from("radar_opps").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "nouveau")),
        count(admin.from("competitors").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id)),
      ]);
      const { data: ms } = await admin.from("missions").select("id, objective, status, goal_type, goal_count, zone").eq("workspace_id", ws.id).neq("status", "terminee").limit(5);
      return {
        entreprise: ws.profile?.nom ?? ws.name, offre: cut(ws.profile?.offre, 200), zone: ws.zone,
        cibles: (ws.targets ?? []).map((t) => ({ id: t.id, label: t.label })),
        prospects_par_statut: byStatus, emails_a_valider: aValider, reponses_chaudes_a_traiter: reponses,
        radar_nouveaux: radar, concurrents_suivis: conc, missions: ms ?? [],
        envoi_possible: ws.domain_status === "verified" || !!ws.integrations?.mailbox?.ok, autonomie: ws.autonomy,
      };
    }
    case "radar_opportunites": {
      let q = admin.from("radar_opps").select("id, kind, company, summary, city, dept, url, deadline, created_at").eq("workspace_id", ws.id).eq("status", "nouveau");
      if (i.type && i.type !== "tous") q = q.eq("kind", i.type);
      if (i.departement) q = q.eq("dept", String(i.departement));
      const { data } = await q.order("created_at", { ascending: false }).limit(Math.min(Math.max(Number(i.nombre) || 8, 1), 20));
      link(ctx, "Ouvrir le Radar", "/radar");
      return { opportunites: (data ?? []).map((o) => ({ ...o, summary: cut(o.summary, 200) })) };
    }
    case "radar_scanner": {
      const r = await callFn(ctx, "r/radar-scan", i.web ? { web: true } : {});
      link(ctx, "Ouvrir le Radar", "/radar");
      return r;
    }
    case "preparer_opportunite": {
      const r = await callFn(ctx, "m/prepare", { id: String(i.id) });
      if (!r.erreur) link(ctx, "Valider les e-mails", "/valider");
      return r;
    }
    case "missions_liste": {
      const { data } = await admin.from("missions").select("id, objective, status, goal_type, goal_count, deadline, zone, radar_auto, max_budget, spent, stop_reason, journal").eq("workspace_id", ws.id).neq("status", "terminee").order("created_at", { ascending: false }).limit(5);
      link(ctx, "Ouvrir la Mission", "/mission");
      return { missions: (data ?? []).map((m) => ({ ...m, journal: (m.journal ?? []).slice(-4) })) };
    }
    case "mission_planifier": return await callFn(ctx, "i/mission-plan", { objective: String(i.objectif ?? "") });
    case "mission_creer": {
      const r = await callFn(ctx, "i/mission-create", i);
      if (!r.erreur) link(ctx, "Ouvrir la Mission", "/mission");
      return r;
    }
    case "mission_avancer": {
      const r = await callFn(ctx, "m/step", { mission_id: String(i.mission_id) });
      link(ctx, "Ouvrir la Mission", "/mission");
      return r;
    }
    case "prospects_chercher": {
      let q = admin.from("prospects").select("id, name, org, activity, city, status, email, contact_name, contact_role, signals, score").eq("workspace_id", ws.id);
      if (i.statut) q = q.eq("status", i.statut);
      if (i.texte) { const t = String(i.texte).replace(/[%,()]/g, " ").trim(); q = q.or(`name.ilike.%${t}%,org.ilike.%${t}%,city.ilike.%${t}%,activity.ilike.%${t}%`); }
      if (i.signal) q = q.contains("signals", [{ type: String(i.signal) }]);
      const { data } = await q.order("score", { ascending: false, nullsFirst: false }).limit(Math.min(Math.max(Number(i.nombre) || 10, 1), 25));
      link(ctx, "Ouvrir les prospects", "/prospects");
      return { prospects: (data ?? []).map((p) => ({ ...p, signals: (p.signals ?? []).slice(0, 4).map((s: { label: string }) => s.label) })) };
    }
    case "prospect_preparer": {
      let r = await callFn(ctx, "m/prospect-prepare", { id: String(i.id) });
      // Ancienne version de « m » : enquête seule, la rédaction se fait ensuite par la mission
      if (/Action inconnue/.test(String(r.erreur ?? ""))) r = { ...(await callFn(ctx, "m/enrich", { ids: [String(i.id)], count: 1 })), note: "enquête faite ; l'e-mail sera rédigé par la mission ou depuis la fiche du prospect" };
      if (!r.erreur) link(ctx, "Valider les e-mails", "/valider");
      return r;
    }
    case "concurrents": {
      const { data } = await admin.from("competitors").select("id, name, url, summary").eq("workspace_id", ws.id).limit(20);
      link(ctx, "Ouvrir Espion", "/espion");
      return { concurrents: (data ?? []).map((c) => ({ id: c.id, nom: c.summary?.nom || c.name || c.url, site: c.url, notre_position: cut(c.summary?.battlecard?.pitch, 400) || "pas encore analysé" })) };
    }
    case "reponses_a_traiter": {
      const { data } = await admin.from("replies").select("id, from_email, class, summary, created_at, prospects(name, city)").eq("workspace_id", ws.id).eq("handled", false).in("class", ["interesse", "question", "prix", "rappel", "objection"]).order("created_at", { ascending: false }).limit(10);
      link(ctx, "Ouvrir les réponses", "/reponses");
      return { reponses: data ?? [] };
    }
  }
  return { erreur: "outil inconnu" };
}

const LABELS: Record<string, string> = {
  etat_espace: "Lecture de ton espace", radar_opportunites: "Lecture du Radar", radar_scanner: "Nouvelle détection Radar",
  preparer_opportunite: "Préparation d'une opportunité", missions_liste: "Lecture des missions", mission_planifier: "Préparation du plan de mission",
  mission_creer: "Lancement de la mission", mission_avancer: "Avancée de la mission", prospects_chercher: "Recherche dans tes prospects",
  prospect_preparer: "Préparation d'un prospect", concurrents: "Lecture d'Espion", reponses_a_traiter: "Lecture des réponses",
};

function system(ws: Workspace) {
  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "Europe/Paris" }).format(new Date());
  return `Tu es l'assistant de Bingoo, l'équipe commerciale IA de ${ws.profile?.nom ?? ws.name} (${cut(ws.profile?.offre, 200)}). Nous sommes le ${today}.
Bingoo aide à savoir qui contacter, pourquoi et quand : Radar (détecter), Espion (comprendre les concurrents), Mission (prospecter), Réponses (convertir).
Tu agis avec les outils : enchaîne-les toi-même pour accomplir la demande, sans demander la permission pour lire ou préparer.
Règles :
- Tu ne peux PAS envoyer d'e-mail : tu prépares des brouillons, l'utilisateur les valide dans « À valider ». Dis-le quand tu as rédigé.
- Avant mission_creer, présente le plan (objectif, nombre, échéance, zone, cibles) et attends un oui explicite.
- N'invente aucun chiffre ni aucune entreprise : n'affirme que ce que les outils renvoient.
- Pour préparer plusieurs opportunités ou prospects, 5 au maximum par demande (chacun prend du temps et du budget).
- Si un outil renvoie une erreur (limite du jour, envoi non configuré…), explique-la simplement et propose la suite.
- Réponds en français, tutoiement, court et concret : ce que tu as fait, le résultat, la prochaine action. Pas de jargon technique, pas d'identifiants techniques.`;
}

// Réglage de réflexion accepté par le modèle : on le retient après le premier refus
let THINKING: Record<string, unknown> | null = { type: "disabled" };

async function claude(body: Record<string, unknown>) {
  const key = env("ANTHROPIC_API_KEY");
  if (!key) throw new HttpError(500, "Clé ANTHROPIC_API_KEY manquante");
  const post = async () => {
    const b = { ...body };
    if (THINKING) b.thinking = THINKING; else delete b.thinking;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(b),
    });
    return { r, data: await r.json().catch(() => ({})) };
  };
  let { r, data } = await post();
  // Selon le modèle, « disabled » est refusé avec des outils : on essaie « between_tools », puis sans réglage
  for (const next of [{ type: "between_tools" }, null]) {
    if (r.ok || r.status !== 400 || !/thinking/i.test(data?.error?.message ?? "")) break;
    THINKING = next;
    ({ r, data } = await post());
  }
  if (!r.ok) {
    const msg = data?.error?.message ?? `erreur ${r.status}`;
    if (/credit balance/i.test(msg)) throw new HttpError(402, "Crédit IA épuisé : recharge le compte Anthropic pour continuer");
    throw new HttpError(502, "IA : " + msg);
  }
  return data;
}

/** Un tour de conversation : historique texte côté client, boucle d'outils côté serveur. */
export async function assistantTurn(ws: Workspace, auth: string, history: { role: string; text: string }[]) {
  const ctx: Ctx = { ws, auth, steps: [], links: [] };
  const msgs: Msg[] = history.filter((m) => m.text?.trim()).slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.text).slice(0, 4000) }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") throw new HttpError(400, "Écris ta demande");
  const started = Date.now();
  let reply = "";
  for (let turn = 0; turn < 8; turn++) {
    const res = await claude({ model: env("ANTHROPIC_MODEL", "claude-sonnet-5-5"), max_tokens: 2000, system: system(ws), tools: TOOLS, messages: msgs });
    const content = (res.content ?? []) as { type: string; text?: string; id?: string; name?: string; input?: unknown }[];
    msgs.push({ role: "assistant", content });
    const uses = content.filter((c) => c.type === "tool_use");
    reply = content.filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
    if (!uses.length || res.stop_reason !== "tool_use") break;
    if (Date.now() - started > 120000) { reply ||= "Je m'arrête là pour cette fois (temps dépassé) : redemande-moi la suite."; break; }
    const results = [];
    for (const u of uses) {
      ctx.steps.push({ tool: u.name!, label: LABELS[u.name!] ?? u.name! });
      let out: unknown;
      try { out = await runTool(ctx, u.name!, u.input ?? {}); } catch (e) { out = { erreur: e instanceof Error ? e.message : String(e) }; }
      results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out).slice(0, 12000) });
    }
    msgs.push({ role: "user", content: results });
  }
  await log(ws.id, "assistant", `Assistant : ${cut(history[history.length - 1]?.text, 80)}`);
  return { reply: reply || "C'est fait.", steps: ctx.steps, links: ctx.links };
}
