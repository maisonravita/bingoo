// Fonction « r » : Kairo Radar, Espion et Studio (modules de croissance), séparée pour des mises à jour légères.
import { HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { admin, log, quota, requireMember, setAi } from "../_shared/core.ts";
import { radarCron, radarGetConfig, radarSetConfig, radarToProspect, scanRadar } from "../_shared/radar.ts";
import { resolveCompetitor, spyCron, spyDigest, spyDiscover, spyFollow, spyNeeds, spySocial } from "../_shared/spy.ts";
import { studioGenerate } from "../_shared/studio.ts";
import { growthReco } from "../_shared/reco.ts";

async function secret(name: string) {
  const { data } = await admin.from("app_secrets").select("value").eq("name", name).single();
  // Fermé par défaut : sans secret configuré, aucune requête ne passe (jamais "" === "")
  return String(data?.value ?? "") || `absent-${crypto.randomUUID()}`;
}
const cron = async (req: Request) => { if ((req.headers.get("x-cron-key") ?? "") !== await secret("cron_key")) throw new HttpError(401, "Clé invalide"); };

// deno-lint-ignore no-explicit-any
const routes: Record<string, (req: Request, b: any) => Promise<unknown>> = {
  async "radar-scan"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "radar_scan", 4);
    // web : true = recherche web forcée, false = sources officielles seulement (premier Radar après la mise en route), absent = selon le calendrier
    return await scanRadar(ws, { web: b.web === true ? true : b.web === false ? false : undefined });
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
  // Espion : page « Alternative à [concurrent] » pour le site du client
  async "alt-page"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    if (b.force === true) await quota(ws.id, "espion", 20);
    const { altPage } = await import("../_shared/altpage.ts");
    return await altPage(ws, String(b.competitor_id ?? ""), b.force === true);
  },
  // Radar : la bonne personne pour une opportunité (e-mail, téléphone, LinkedIn public)
  async "opp-contacts"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { oppContacts } = await import("../_shared/opp-contacts.ts");
    // Recherche automatique à l'ouverture d'une fiche : plafond propre (20 par jour, ajusté à la formule), jamais refaite
    if (b.auto === true) {
      const { data: o } = await admin.from("radar_opps").select("raw, prospect_id").eq("id", String(b.id ?? "")).eq("workspace_id", ws.id).maybeSingle();
      if (o?.raw?.contacts_at) return await oppContacts(ws, String(b.id ?? ""), true);
      await quota(ws.id, "contacts_auto", 20);
      await log(ws.id, "contacts_auto", "Recherche automatique du décideur");
    }
    await quota(ws.id, "contacts", 60);
    return await oppContacts(ws, String(b.id ?? ""));
  },
  // Outils gratuits (sans compte) : porte d'entrée de Bingoo!
  async "free-renewals"(req, b) {
    const { freeLimit, freeRenewals } = await import("../_shared/free-tools.ts");
    await freeLimit(req, "renewals", 8, 2000);
    return await freeRenewals(b);
  },
  async "free-signals"(req, b) {
    const { freeLimit, freeSignals } = await import("../_shared/free-tools.ts");
    await freeLimit(req, "signals", 10, 3000);
    return await freeSignals(b);
  },
  async "free-site"(req, b) {
    const { freeLimit, freeSite } = await import("../_shared/free-tools.ts");
    await freeLimit(req, "site", 3, 300, { visitor: "Tu as fait tes 3 essais du jour. Crée ton compte Bingoo! pour lancer le Radar sans limite." });
    return await freeSite(b);
  },
  async "free-competitor"(req, b) {
    const { freeLimit, freeCompetitor } = await import("../_shared/free-tools.ts");
    await freeLimit(req, "competitor", 3, 150);
    return await freeCompetitor(b);
  },
  // Espion : historique des pubs d'un concurrent, classées par performance
  async "ads-history"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { rankAds } = await import("../_shared/ads-history.ts");
    const { data } = await admin.from("competitor_ads").select("*").eq("workspace_id", ws.id).eq("competitor_id", String(b.competitor_id ?? "")).limit(500);
    const { env } = await import("../_shared/core.ts");
    return { ads: rankAds((data ?? []) as never[]), meta: !!env("META_ADS_TOKEN") };
  },
  // Espion : bibliothèque des e-mails des concurrents
  async "rival-emails"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { watchAddress } = await import("../_shared/rival-mail.ts");
    let q = admin.from("competitor_emails").select("id, competitor_id, from_email, from_name, subject, kind, offer, summary, confirm_url, received_at").eq("workspace_id", ws.id).order("received_at", { ascending: false }).limit(200);
    if (b.competitor_id) q = q.eq("competitor_id", String(b.competitor_id));
    const { data } = await q;
    return { address: watchAddress(ws), emails: data ?? [] };
  },
  // Clés d'accès personnelles (extension Chrome, assistants IA)
  async "apikey-create"(req, b) {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    const { keyCreate } = await import("../_shared/apikeys.ts");
    return await keyCreate(ws.id, userId, String(b.name ?? ""));
  },
  async "apikey-list"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { keyList } = await import("../_shared/apikeys.ts");
    return await keyList(ws.id);
  },
  async "apikey-revoke"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { keyRevoke } = await import("../_shared/apikeys.ts");
    return await keyRevoke(ws.id, String(b.id ?? ""));
  },
  // E-mail à la demande sur une fiche : site (gratuit) puis Dropcontact, compté seulement si trouvé
  async "find-email"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { data: p } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("id", String(b.id ?? "")).single();
    if (!p) throw new HttpError(404, "Fiche introuvable");
    const { findEmail, credits } = await import("../_shared/deep.ts");
    const r = await findEmail(ws, p);
    return { ...r, credits: await credits(ws) };
  },
  // Nuit : résultats Dropcontact en attente + nouvelles recherches vérifiées (espaces clients ; jamais les espaces fondateur)
  async "dc-cron"(req, b) {
    await cron(req);
    const { dropcontactNight } = await import("../_shared/deep.ts");
    const { planOk } = await import("../_shared/core.ts");
    const { data } = await admin.from("workspaces").select("*").eq("onboarded", true).neq("plan", "fondateur");
    const out: Record<string, unknown> = {};
    for (const ws of (data ?? []).filter((w) => planOk(w))) out[ws.name] = await dropcontactNight(ws, Math.min(Number(b.n ?? 10), 25)).catch((e) => ({ erreur: (e as Error).message }));
    return out;
  },
  // Filtre de cible : à la demande (bouton « Trier ma liste ») ou chaque demi-heure sur les nouvelles fiches des espaces clients
  async "fit-check"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    setAi({ ws: ws.id, live: true });
    const { fitCheck } = await import("../_shared/fit.ts");
    const r = await fitCheck(ws, { max: Math.min(Number(b.max ?? 100), 200) });
    return { ...r, done: r.relues, found: r.hors_cible };
  },
  async "fit-cron"(req, b) {
    await cron(req);
    const { fitCheck } = await import("../_shared/fit.ts");
    const { planOk } = await import("../_shared/core.ts");
    let q = admin.from("workspaces").select("*").eq("onboarded", true).neq("plan", "fondateur");
    if (b.workspace_id) q = admin.from("workspaces").select("*").eq("id", String(b.workspace_id));
    const { data } = await q;
    const out: Record<string, unknown> = {};
    for (const ws of (data ?? []).filter((w) => b.workspace_id || planOk(w))) { setAi({ ws: ws.id, live: !!b.workspace_id }); out[ws.name] = await fitCheck(ws, { max: Number(b.max ?? 60), dry: b.dry === true }).catch((e) => ({ erreur: (e as Error).message })); }
    return out;
  },
  async "fit-restore"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { fitRestore } = await import("../_shared/fit.ts");
    return await fitRestore(ws.id, String(b.id ?? ""));
  },
  // Le client écarte une fiche en disant pourquoi : le filtre de cible s'en sert pour les suivantes
  async refus(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const RAISONS = ["Pas ma cible", "Trop petite", "Trop grande", "Déjà client", "Concurrent", "Mauvaise zone"];
    const raison = RAISONS.includes(String(b.raison)) ? String(b.raison) : String(b.raison ?? "").trim().slice(0, 60) || "Pas ma cible";
    const { data: p } = await admin.from("prospects").update({ status: "ignore", fit: "non", fit_reason: `Écarté par toi : ${raison}` }).eq("workspace_id", ws.id).eq("id", String(b.id ?? "")).select("name").single();
    if (!p) throw new HttpError(404, "Fiche introuvable");
    await admin.from("messages").update({ status: "ignore" }).eq("prospect_id", String(b.id)).eq("status", "brouillon");
    await log(ws.id, "refus", `${p.name} écarté : ${raison}`).catch(() => {});
    return { ok: true };
  },
  // Bingoo! écrit comme toi : corrections des brouillons → règles de style
  async "style-learn"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    setAi({ ws: ws.id, live: true });
    const { styleLearn } = await import("../_shared/style.ts");
    return await styleLearn(ws, b.before, b.after);
  },
  async "style-set"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { styleSet } = await import("../_shared/style.ts");
    return await styleSet(ws, b.regles);
  },
  // Appel de démarrage offert (30 min) : le client propose ses créneaux, l'équipe Bingoo! (admins) reçoit la demande et répond directement
  async "onboarding-call"(req, b) {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    if (ws.onboarding_call_at) return { deja: true, at: ws.onboarding_call_at };
    const { data: u } = await admin.auth.admin.getUserById(userId);
    const email = u?.user?.email ?? "";
    const { data: adm } = await admin.from("admins").select("user_id");
    const tos = (await Promise.all((adm ?? []).map(async (a) => (await admin.auth.admin.getUserById(a.user_id)).data?.user?.email ?? ""))).filter(Boolean);
    const { sendSystem } = await import("../_shared/mail.ts");
    const dispo = String(b.dispo ?? "").trim().slice(0, 300), tel = String(b.tel ?? "").trim().slice(0, 30);
    const text = [`${ws.sender_name || email} demande son appel de démarrage (30 min).`, `\nEspace : ${ws.name ?? ""} (formule ${ws.plan ?? "essai"})`, `E-mail : ${email}`, tel ? `Téléphone : ${tel}` : "", dispo ? `Disponibilités : ${dispo}` : "Disponibilités : non précisées", `\nRéponds à cet e-mail pour fixer le créneau.`].filter(Boolean).join("\n");
    for (const to of tos) await sendSystem({ to, subject: `Appel de démarrage : ${ws.name ?? email}`, text, replyTo: email || undefined, fromName: "Bingoo! · démarrage" }).catch((e) => console.error("onboarding-call", e));
    const at = new Date().toISOString();
    await admin.from("workspaces").update({ onboarding_call_at: at }).eq("id", ws.id);
    await log(ws.id, "onboarding_call", `Appel de démarrage demandé${dispo ? ` (${dispo.slice(0, 80)})` : ""}`).catch(() => {});
    return { ok: true, at, prevenus: tos.length };
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
    const trace: string[] = [];
    return { adopte: await adoptedAt(String(b.url ?? ""), String(b.tool ?? ""), trace), trace };
  },
  // Test plateforme : entreprise propriétaire d'une adresse IP (ou des serveurs d'un domaine)
  async "ip-test"(req, b) {
    await cron(req);
    const { companyOfIp } = await import("../_shared/iporg.ts");
    const out: Record<string, unknown> = {};
    for (const x of ((b.items ?? []) as string[]).slice(0, 15)) {
      let ips = [x];
      if (!/^[0-9a-f:.]+$/i.test(x)) {
        const mx = await Deno.resolveDns(x, "MX").catch(() => []) as { exchange: string }[];
        ips = (await Promise.all(mx.slice(0, 2).map((m) => Deno.resolveDns(m.exchange.replace(/\.$/, ""), "A").catch(() => [] as string[])))).flat().slice(0, 2);
        out[`${x} (mx)`] = mx.slice(0, 2).map((m) => m.exchange);
      }
      for (const ip of ips) out[`${x} ${ip}`] = await companyOfIp(ip).catch((e) => `erreur ${(e as Error).message}`);
    }
    return out;
  },
  // Test plateforme : page « Alternative à » d'un concurrent d'un espace
  async "site-test"(req, b) {
    // Mesure du chercheur de site gratuit sur des prospects sans site (aucune IA, rien n'est enregistré)
    await cron(req);
    const { findSite } = await import("../_shared/deep.ts");
    const { data } = await admin.from("prospects").select("name, org, siret, postal_code, city").or("website.is.null,website.eq.").limit(Math.min(Number(b.n ?? 15), 30));
    const out = [];
    for (const p of data ?? []) out.push({ nom: p.name, site: await findSite(p).catch(() => "") });
    return { essais: out.length, trouves: out.filter((x) => x.site).length, detail: out };
  },
  async "free-enrich"(req, b) {
    // Passe gratuite (aucune IA) : site retrouvé par le nom, e-mail publié sur ce site. dry = mesure sans rien enregistrer.
    await cron(req);
    const { freeEnrich } = await import("../_shared/deep.ts");
    const dry = b.dry === true, n = Math.min(Number(b.n ?? 20), 40);
    // Une seule passe par prospect ; ceux passés avant l'ajout d'OpenStreetMap (« site introuvable par son nom ») sont repris une fois
    // Jamais deux fois le même prospect en 3 jours (avant : Overpass saturé → rien d'enregistré → les 15 mêmes repassaient toute la nuit)
    // Les fiches avec un décideur nommé passent d'abord : ce sont elles qui donnent des rendez-vous.
    const since = new Date(Date.now() - 3 * 864e5).toISOString();
    const base = () => {
      let q = admin.from("prospects").select("*").eq("email", "").in("status", ["nouveau", "sans_email"]).not("enrich_note", "like", "Recherche gratuite%lu,%").not("enrich_note", "like", "Recherche gratuite%(nom et OpenStreetMap)%").or(`free_tried_at.is.null,free_tried_at.lt.${since}`);
      if (b.workspace_id) q = q.eq("workspace_id", String(b.workspace_id));
      if (b.sans_site === true) q = q.or("website.is.null,website.eq.");
      return q;
    };
    const { data: d1 } = await base().not("contact_name", "is", null).neq("contact_name", "").order("free_tried_at", { ascending: true, nullsFirst: true }).order("score", { ascending: false, nullsFirst: false }).limit(n);
    let data = d1 ?? [];
    if (data.length < n) { const { data: d2 } = await base().or("contact_name.is.null,contact_name.eq.").order("free_tried_at", { ascending: true, nullsFirst: true }).order("score", { ascending: false, nullsFirst: false }).limit(n - data.length); data = data.concat(d2 ?? []); }
    const rows = data, out: { nom: string; site: string; nouveau_site: boolean; email: string }[] = [];
    const t0 = Date.now();
    for (let i = 0; i < rows.length && Date.now() - t0 < 90_000; i += 3) {
      const part = await Promise.all(rows.slice(i, i + 3).map(async (p) => {
        const r = await freeEnrich(p, !dry).catch(() => ({ site: "", foundSite: false, email: "" }));
        return { nom: p.name, site: r.site, nouveau_site: r.foundSite, email: r.email };
      }));
      out.push(...part);
    }
    return { essais: out.length, sites_trouves: out.filter((x) => x.nouveau_site).length, emails: out.filter((x) => x.email).length, detail: out };
  },
  async "draft-test"(req, b) {
    // Contrôle qualité : rédige le premier e-mail de quelques prospects sans rien enregistrer ni envoyer
    await cron(req);
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    setAi({ ws: ws.id, live: true });
    const { writeDraft, offerFollowup } = await import("../_shared/agents.ts");
    const ids = Array.isArray(b.ids) ? b.ids.map(String).slice(0, 8) : [];
    const { data: ps } = await admin.from("prospects").select("*").in("id", ids);
    const out = await Promise.all((ps ?? []).map(async (p) => { try { const d = await writeDraft(ws, p); const r1 = await offerFollowup(ws, d.body, (d.body.split("\n")[0] || "Bonjour,")).catch((e) => `(relance : ${e.message})`); return { prospect: p.name, objet: d.subject, corps: d.body, relance1: r1 }; } catch (e) { return { prospect: p.name, erreur: String((e as Error).message) }; } }));
    return { messages: out };
  },
  async "alt-test"(req, b) {
    await cron(req);
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    setAi({ ws: ws.id });
    const { altPage } = await import("../_shared/altpage.ts");
    const p = await altPage(ws, String(b.competitor_id ?? ""), true);
    return { ...p, html: `${String(p.html ?? "").length} caractères` };
  },
  // Test plateforme : contacts d'une opportunité
  async "opp-contacts-test"(req, b) {
    await cron(req);
    const { data: o } = await admin.from("radar_opps").select("workspace_id").eq("id", String(b.id ?? "")).single();
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", o?.workspace_id ?? "").single();
    if (!ws) throw new HttpError(404, "Opportunité introuvable");
    setAi({ ws: ws.id });
    const { oppContacts } = await import("../_shared/opp-contacts.ts");
    return await oppContacts(ws, String(b.id));
  },
  // Test plateforme : relevé des pubs d'un concurrent
  async "ads-test"(req, b) {
    await cron(req);
    const { data: c } = await admin.from("competitors").select("workspace_id").eq("id", String(b.competitor_id ?? "")).single();
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", c?.workspace_id ?? "").single();
    if (!ws) throw new HttpError(404, "Concurrent introuvable");
    setAi({ ws: ws.id, feature: "espion/publicites" });
    const { competitorAds } = await import("../_shared/campaigns.ts");
    const r = await competitorAds(ws, String(b.competitor_id));
    const { rankAds } = await import("../_shared/ads-history.ts");
    const { data } = await admin.from("competitor_ads").select("*").eq("competitor_id", String(b.competitor_id));
    return { pubs_relevees: ((r.ads as { pubs?: unknown[] }).pubs ?? []).length, historique: rankAds((data ?? []) as never[]).map((a) => ({ body: a.body.slice(0, 90), platform: a.platform, days: a.days, versions: a.versions, works: a.works, active: a.active })) };
  },
  // Test plateforme : arrivée simulée d'un e-mail de concurrent sur l'adresse de veille (aucun envoi)
  async "rival-mail-test"(req, b) {
    await cron(req);
    const { rivalMail } = await import("../_shared/rival-mail.ts");
    return await rivalMail(String(b.key ?? ""), { from: String(b.from ?? ""), subject: String(b.subject ?? "") }, async () => ({ text: String(b.text ?? ""), html: String(b.html ?? "") }));
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
