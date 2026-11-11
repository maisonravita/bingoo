// Fonction « r » : Bingoo! Radar, Espion et Studio (modules de croissance), séparée pour des mises à jour légères.
import { HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { admin, log, quota, requireMember, setAi, type Prospect } from "../_shared/core.ts";
import { radarCron, radarGetConfig, radarSetConfig, radarToProspect, scanRadar } from "../_shared/radar.ts";
import { attreyForums, attreySearch } from "../_shared/attrey.ts";
import { attreyMultiScan } from "../_shared/attrey-multicanal.ts";
import { attreyAirbnbAudit } from "../_shared/attrey-airbnb-audit.ts";
import { attreyAirbnbIndexedSearch } from "../_shared/attrey-airbnb-discovery.ts";
import { classifyAttreyCandidates } from "../_shared/attrey-classify.ts";
import { resolveCompetitor, spyCron, spyDigest, spyDiscover, spyFollow, spyNeeds, spySocial } from "../_shared/spy.ts";
import { studioGenerate } from "../_shared/studio.ts";
import { growthReco } from "../_shared/reco.ts";

async function secret(name: string) {
  const { data } = await admin.from("app_secrets").select("value").eq("name", name).single();
  // Fermé par défaut : sans secret configuré, aucune requête ne passe (jamais "" === "")
  return String(data?.value ?? "") || `absent-${crypto.randomUUID()}`;
}
// Plafonds mensuels des SaaS construits, par formule (le coût de l'IA reste toujours sous le prix de l'abonnement)
const PLAFONDS: Record<string, { construire: number; modifier: number }> = { explorer_pro: { construire: 3, modifier: 30 }, business: { construire: 10, modifier: 100 } };
const plafondDe = (plan: string) => PLAFONDS[plan] ?? (plan === "explorer" ? { construire: 0, modifier: 0 } : PLAFONDS.business);
async function quotaMois(wsId: string, plan: string, kind: "construire" | "modifier") {
  const max = plafondDe(plan)[kind];
  const debut = new Date(); debut.setUTCDate(1); debut.setUTCHours(0, 0, 0, 0);
  const { count } = await admin.from("activity").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).eq("kind", kind === "construire" ? "construire" : "modifier_app").gte("created_at", debut.toISOString());
  if ((count ?? 0) >= max) throw new HttpError(402, kind === "construire" ? `Tu as utilisé tes ${max} constructions du mois : passe à la formule supérieure, ou attends le 1er du mois.` : `Tu as utilisé tes ${max} modifications du mois : passe à la formule supérieure, ou attends le 1er du mois.`);
  return { utilise: count ?? 0, max };
}
// Espace d'un membre connecté, ou n'importe quel espace avec la clé des tâches planifiées (tests et reprises)
const membreOuCron = async (req: Request, wsId: string) => {
  if (!req.headers.get("x-cron-key")) return await requireMember(req, wsId);
  await cron(req);
  const { data } = await admin.from("workspaces").select("*").eq("id", wsId).single();
  if (!data) throw new HttpError(404, "Espace introuvable");
  return { ws: data };
};
const cron = async (req: Request) => { if ((req.headers.get("x-cron-key") ?? "") !== await secret("cron_key")) throw new HttpError(401, "Clé invalide"); };

// deno-lint-ignore no-explicit-any
const routes: Record<string, (req: Request, b: any) => Promise<unknown>> = {
  async "radar-scan"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "radar_scan", 4);
    // web : true = recherche web forcée, false = sources officielles seulement (premier Radar après la mise en route), absent = selon le calendrier
    return await scanRadar(ws, { web: b.web === true ? true : b.web === false ? false : undefined });
  },
  // Explorer : ajouter un SaaS à la base et le lire tout de suite (membre connecté)
  async "saas-add"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "espion", 30);
    const { saasAdd, saasLire, domaineDe } = await import("../_shared/saas-base.ts");
    const d = domaineDe(String(b.url ?? ""));
    if (!d) throw new HttpError(400, "Adresse du site invalide (ex. monsaas.com)");
    await saasAdd([d], `ajout:${ws.id}`);
    const { data: s } = await admin.from("saas").select("id, statut").eq("domaine", d).single();
    const r = s.statut === "ok" ? { statut: "ok" } : await saasLire(s.id);
    return { id: s.id, domaine: d, statut: r?.statut ?? "erreur" };
  },
  async "saas-tendances"(req, b) { await requireMember(req, b.workspace_id); const { saasTendances } = await import("../_shared/saas-base.ts"); return await saasTendances(); },
  // Alerte du lundi (clé cron ; workspace_id pour envoyer à un seul espace, pour essai)
  async "saas-alertes"(req, b) { await cron(req); const { saasAlertes } = await import("../_shared/saas-base.ts"); return await saasAlertes(b.workspace_id ? String(b.workspace_id) : undefined); },
  // Explorer : démarrage d'un fondateur de SaaS. Son logiciel et ses concurrents directs entrent dans la base, sont lus,
  // et sont suivis (avec sa catégorie) : l'onglet « Mes suivis » et l'alerte du lundi sont prêts d'un coup.
  async "saas-demarrer"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "espion", 10);
    const { saasAdd, saasLire, domaineDe } = await import("../_shared/saas-base.ts");
    const { concurrentsDe } = await import("../_shared/marche-saas.ts");
    const d = domaineDe(String(b.url ?? ""));
    if (!d) throw new HttpError(400, "Adresse du site invalide (ex. monsaas.com)");
    await saasAdd([d], `demarrage:${ws.id}`);
    let { data: moi } = await admin.from("saas").select("*").eq("domaine", d).single();
    if (moi.statut !== "ok") { await saasLire(moi.id); ({ data: moi } = await admin.from("saas").select("*").eq("domaine", d).single()); }
    if (moi.statut !== "ok") throw new HttpError(422, moi.statut === "pas_saas" ? "Ce site ne ressemble pas à un logiciel en ligne." : "Ton site n'a pas pu être lu pour l'instant. Réessaie dans un moment.");
    const conc = await concurrentsDe(d, { nom: moi.nom, categorie: moi.categorie, offre: moi.description ?? "", cible: moi.cible ?? "" });
    await saasAdd(conc.map((c) => c.site), `demarrage:${ws.id}`);
    const doms = conc.map((c) => domaineDe(c.site)).filter(Boolean);
    const { data: rows } = await admin.from("saas").select("id, domaine, statut").in("domaine", doms.length ? doms : ["-"]);
    const aLire = (rows ?? []).filter((r) => r.statut === "a_lire");
    for (let i = 0; i < aLire.length; i += 3) await Promise.all(aLire.slice(i, i + 3).map((r) => saasLire(r.id).catch(() => null)));
    const { data: fin } = await admin.from("saas").select("id, domaine, nom, statut, categorie, prix_entree_eur").in("domaine", doms.length ? doms : ["-"]);
    const ok = (fin ?? []).filter((r) => r.statut === "ok");
    for (const r of ok) await admin.from("saas_suivis").insert({ workspace_id: ws.id, saas_id: r.id }).then(() => null, () => null);
    await admin.from("saas_suivis").insert({ workspace_id: ws.id, categorie: moi.categorie }).then(() => null, () => null);
    // Son propre SaaS aussi : l'alerte du lundi lui montre ce que voient ses concurrents
    await admin.from("saas_suivis").insert({ workspace_id: ws.id, saas_id: moi.id }).then(() => null, () => null);
    return { moi: { domaine: moi.domaine, nom: moi.nom, categorie: moi.categorie }, concurrents: ok.map((r) => ({ domaine: r.domaine, nom: r.nom, prix_entree_eur: r.prix_entree_eur })) };
  },
  async "saas-lancer"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    if (ws.plan === "explorer") throw new HttpError(402, "« Lancer le mien » est dans la formule Pro.");
    await quota(ws.id, "lancer", 10);
    // Une à deux minutes de travail : on répond tout de suite et on prépare le projet en tâche de fond (la page interroge la base)
    const { saasLancer, saasAdd, saasLire, domaineDe } = await import("../_shared/saas-base.ts");
    const domaine = domaineDe(String(b.domaine ?? ""));
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domaine)) throw new HttpError(400, "Adresse de site invalide");
    // Un SaaS absent de la base y est ajouté, puis lu avant de préparer le projet
    let { data: s } = await admin.from("saas").select("id, nom, statut").eq("domaine", domaine).maybeSingle();
    if (!s) { await saasAdd([`https://${domaine}`], "lancer"); ({ data: s } = await admin.from("saas").select("id, nom, statut").eq("domaine", domaine).maybeSingle()); }
    if (!s) throw new HttpError(400, "Ce site ne peut pas être ajouté");
    if (["pas_saas", "doublon", "retire"].includes(s.statut)) throw new HttpError(400, "Ce site n'est pas un logiciel SaaS lisible");
    const { data: row } = await admin.from("saas_projets").insert({ workspace_id: ws.id, saas_id: s.id, statut: "en_cours", data: { inspire: { nom: s.nom ?? domaine, domaine } } }).select("id").single();
    await log(ws.id, "lancer", `Projet de SaaS concurrent de ${s.nom ?? domaine}`);
    const sid = s.id, aLire = s.statut !== "ok";
    const travail = (async () => {
      if (aLire) {
        await saasLire(sid);
        const { data: lu } = await admin.from("saas").select("statut").eq("id", sid).single();
        if (lu?.statut !== "ok") throw new Error("Ce site n'a pas pu être lu comme un logiciel SaaS");
      }
      return saasLancer(ws.id, domaine, row!.id);
    })().catch(async (e) => {
      await admin.from("saas_projets").update({ statut: "erreur", erreur: String(e?.message ?? e).slice(0, 300) }).eq("id", row!.id);
    });
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(travail); else await travail;
    return { id: row!.id, statut: "en_cours" };
  },
  // Bingoo! construit le SaaS du projet : application en ligne (site, comptes, écrans), quelques minutes en tâche de fond
  // Valider avant de construire : une page publique de liste d'attente et de précommande, sans IA (tirée du projet)
  async "saas-validation"(req, b) {
    const { ws } = await membreOuCron(req, b.workspace_id);
    const { data: pr } = await admin.from("saas_projets").select("id, data, statut").eq("id", String(b.projet_id ?? "")).eq("workspace_id", ws.id).maybeSingle();
    if (!pr || pr.statut !== "pret") throw new HttpError(404, "Projet introuvable");
    const { data: ex } = await admin.from("saas_apps").select("id, slug, statut, validation, spec").eq("projet_id", pr.id).maybeSingle();
    const quoi = String(b.quoi ?? "creer");
    if (quoi === "creer") {
      if (ex?.validation?.actif) return { id: ex.id, slug: ex.slug };
      if (ex && (ex.spec as any)?.ecrans?.length) throw new HttpError(400, "Ton SaaS est déjà construit : il n'a plus besoin de page de précommande");
      const p = pr.data as any;
      const teinte = [...String(p.nom ?? "")].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
      const hsl = (h: number) => { const l = 0.36, s2 = 0.62, k = (n: number) => (n + h / 30) % 12, f = (n: number) => l - s2 * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return "#" + [0, 8, 4].map((n) => Math.round(f(n) * 255).toString(16).padStart(2, "0")).join(""); };
      // Page publique : jamais le nom du SaaS copié (concurrence loyale, et ce n'est pas un argument pour le client)
      const inspi = String(p.inspire?.nom ?? "").trim().toLowerCase();
      const propre = (t: unknown) => { const x = String(t ?? "").trim(); return x && (!inspi || !x.toLowerCase().includes(inspi)) ? x : ""; };
      const slogan = String(p.pitch ?? "").split(/\s(?:qui|grâce|pour que|afin|avec)\s|[.:,;]/)[0].trim().slice(0, 70);
      const spec = {
        nom: p.nom, pitch: propre(p.pitch), cible: p.cible, probleme: propre(p.probleme), couleur: hsl(teinte),
        slogan, cible_courte: String(p.cible ?? "").split(/[,.;]/)[0].slice(0, 60),
        atouts: [...(p.differences ?? []).map((x: any) => ({ titre: propre(x.angle ?? x.titre), texte: propre(x.pourquoi ?? x.texte) })), ...(p.equivalences ?? []).map((x: any) => ({ titre: propre(String(x.chez_toi ?? "").split(/[:,.]/)[0].slice(0, 40)), texte: propre(x.chez_toi) }))].filter((x: any) => x.titre && x.texte).slice(0, 6),
        formules: (p.formules ?? []).slice(0, 3), ecrans: [],
      };
      const validation = { actif: true, objectif: 10, remise: 30, cree_at: new Date().toISOString() };
      const { nouveauSlug } = await import("../_shared/app-build.ts");
      const row = ex
        ? (await admin.from("saas_apps").update({ spec, validation, statut: "validation", erreur: null, etape: null, maj: new Date().toISOString() }).eq("id", ex.id).select("id, slug").single()).data
        : (await admin.from("saas_apps").insert({ projet_id: pr.id, workspace_id: ws.id, slug: nouveauSlug(String(p.nom ?? "saas")), spec, validation, statut: "validation" }).select("id, slug").single()).data;
      await log(ws.id, "validation", `Page de précommande de ${p.nom}`);
      return row;
    }
    if (!ex) throw new HttpError(404, "Page de précommande introuvable");
    if (quoi === "reglages") {
      const v = { ...(ex.validation ?? {}) } as any;
      if (b.objectif !== undefined) v.objectif = Math.max(1, Math.min(1000, Math.round(Number(b.objectif) || 10)));
      if (b.remise !== undefined) v.remise = Math.max(0, Math.min(90, Math.round(Number(b.remise) || 0)));
      if (b.actif !== undefined) v.actif = !!b.actif;
      await admin.from("saas_apps").update({ validation: v }).eq("id", ex.id);
      return v;
    }
    throw new HttpError(400, "Action inconnue");
  },
  async "saas-construire"(req, b) {
    const { ws } = await membreOuCron(req, b.workspace_id);
    if (ws.plan === "explorer") throw new HttpError(402, "« Construire mon SaaS » est dans la formule Pro.");
    const { data: pr } = await admin.from("saas_projets").select("id, data, statut").eq("id", String(b.projet_id ?? "")).eq("workspace_id", ws.id).maybeSingle();
    if (!pr || pr.statut !== "pret") throw new HttpError(404, "Projet introuvable");
    const { data: ex } = await admin.from("saas_apps").select("id, statut, maj").eq("projet_id", pr.id).maybeSingle();
    if (ex?.statut === "en_cours" && Date.now() - new Date(ex.maj).getTime() < 10 * 60e3) return { id: ex.id, statut: "en_cours" };
    await quota(ws.id, "construire", 3);
    if (!req.headers.get("x-cron-key")) await quotaMois(ws.id, ws.plan, "construire");
    setAi({ ws: ws.id, live: true, feature: "construire" });
    const { saasConstruire, nouveauSlug } = await import("../_shared/app-build.ts");
    // Chaque écran s'écrit dans sa propre invocation (limite de durée d'une invocation)
    const cle = await secret("cron_key");
    const lancerEcran = async (ecran: string) => {
      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/r/saas-app-ecran`, { method: "POST", headers: { "content-type": "application/json", "x-cron-key": cle }, body: JSON.stringify({ app_id: id, ecran, ws: ws.id }) });
      if (!r.ok) console.error("saas-app-ecran", r.status, await r.text());
    };
    const nom = String((pr.data as { nom?: string })?.nom ?? "saas");
    let id = ex?.id;
    if (id) await admin.from("saas_apps").update({ statut: "en_cours", brouillon: null, erreur: null, etape: "Démarrage", maj: new Date().toISOString() }).eq("id", id);
    else id = (await admin.from("saas_apps").insert({ projet_id: pr.id, workspace_id: ws.id, slug: nouveauSlug(nom), etape: "Démarrage" }).select("id").single()).data!.id;
    await log(ws.id, "construire", `Construction du SaaS ${nom}`);
    const travail = saasConstruire(id!, lancerEcran).catch(async (e) => {
      console.error("construire", e);
      await admin.from("saas_apps").update({ statut: ex?.statut === "pret" ? "pret" : "erreur", erreur: String(e?.message ?? e).slice(0, 300), etape: null }).eq("id", id!);
    });
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(travail); else await travail;
    return { id, statut: "en_cours" };
  },
  // Appel interne (clé des tâches planifiées) : écrit un écran du brouillon
  async "saas-app-ecran"(req, b) {
    await cron(req);
    setAi({ ws: String(b.ws ?? ""), live: true, feature: "construire" });
    const { saasEcrireEcran } = await import("../_shared/app-build.ts");
    const travail = saasEcrireEcran(String(b.app_id ?? ""), String(b.ecran ?? "")).catch((e) => console.error("ecran", e));
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(travail); else await travail;
    return { ok: true };
  },
  // Réglages d'un SaaS construit : encaissement Stripe, nom de domaine, chiffres
  async "saas-app-reglages"(req, b) {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    const { data: app } = await admin.from("saas_apps").select("id").eq("id", String(b.app_id ?? "")).eq("workspace_id", ws.id).maybeSingle();
    if (!app) throw new HttpError(404, "Application introuvable");
    const o = await import("../_shared/app-owner.ts");
    if (b.quoi === "paiement") { await log(ws.id, "app_reglage", "Encaissement de l'application modifié"); return await o.appPaiement(app.id, b); }
    if (b.quoi === "domaine") { await log(ws.id, "app_reglage", `Nom de domaine : ${String(b.domaine ?? "retiré").slice(0, 80)}`); return await o.appDomaine(app.id, b.domaine); }
    if (b.quoi === "domaine-verifier") return await o.appDomaineVerifier(app.id);
    if (b.quoi === "chiffres") {
      const c = await o.appChiffres(app.id);
      const debut = new Date(); debut.setUTCDate(1); debut.setUTCHours(0, 0, 0, 0);
      const [{ count: cons }, { count: mods }] = await Promise.all(["construire", "modifier_app"].map((k) => admin.from("activity").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("kind", k).gte("created_at", debut.toISOString())));
      return { ...c, quota: { ...plafondDe(ws.plan), constructions: cons ?? 0, modifications: mods ?? 0 } };
    }
    if (b.quoi === "public") return await o.appPublic(app.id, !!b.public);
    if (b.quoi === "icones") return await o.appIcones(app.id, b);
    if (b.quoi === "bourse") { await log(ws.id, "app_reglage", b.retirer ? "Retiré de la bourse" : `Mis en vente : ${b.prix} €`); return await o.appBourse(app.id, b); }
    if (b.quoi === "ab") return await o.appAb(app.id, b);
    if (b.quoi === "prix-suggeres") { await log(ws.id, "app_reglage", "Prix mis à jour (jumeau)"); return await o.appPrixSuggeres(app.id, String(b.suggestion ?? "")); }
    if (b.quoi === "brouillon-valider" || b.quoi === "brouillon-annuler") { await log(ws.id, "app_reglage", b.quoi === "brouillon-valider" ? "Modification mise en ligne" : "Modification abandonnée"); return await o.appBrouillon(app.id, b.quoi === "brouillon-valider"); }
    if (b.quoi === "ab-resultats") return await o.appAbResultats(app.id);
    if (b.quoi === "lancement-fait") return await o.appLancementFait(app.id, String(b.cle ?? ""), !!b.fait);
    if (b.quoi === "jumeau") { await quota(ws.id, "jumeau", 5); await log(ws.id, "jumeau", "Vérification du jumeau"); setAi({ ws: ws.id, live: true, feature: "construire/jumeau" }); return await o.appJumeau(app.id); }
    if (b.quoi === "lancement") { await quota(ws.id, "lancement", 3); await log(ws.id, "lancement", "Kit de lancement"); setAi({ ws: ws.id, live: true, feature: "construire/lancement" }); return await o.appLancement(app.id); }
    if (b.quoi === "emails") { const m = await import("../_shared/app-mails.ts"); return b.type ? await m.appEmailsModeles(app.id, b) : await m.appEmailsEtat(app.id); }
    if (b.quoi === "email-test" || b.quoi === "annonce") {
      const m = await import("../_shared/app-mails.ts");
      const { data: moi } = await admin.from("members").select("email").eq("workspace_id", ws.id).eq("user_id", userId).maybeSingle();
      if (b.quoi === "email-test") { await quota(ws.id, "email_test", 20); return await m.appEmailTest(app.id, String(b.type ?? ""), moi?.email ?? ""); }
      if (!b.test) await log(ws.id, "annonce", `Annonce envoyée : ${String(b.sujet ?? "").slice(0, 80)}`);
      return await m.appAnnonce(app.id, String(b.sujet ?? ""), String(b.texte ?? ""), String(b.bouton ?? ""), b.test ? moi?.email ?? null : null);
    }
    if (b.quoi === "email-domaine" || b.quoi === "email-verifier") {
      const m = await import("../_shared/app-mails.ts");
      return b.quoi === "email-domaine" ? await m.appEmailDomaine(app.id, b.domaine) : await m.appEmailVerifier(app.id);
    }
    throw new HttpError(400, "Réglage inconnu");
  },
  // Bourse des SaaS : conversation entre acheteur et vendeur dans Bingoo! (messages et offres), sans échanger d'e-mails.
  // L'autre partie est prévenue par e-mail, avec un lien vers la conversation.
  async "saas-bourse-message"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { data: bo } = await admin.from("saas_bourse").select("id, prix, app_id, statut").eq("id", String(b.bourse_id ?? "")).maybeSingle();
    if (!bo || bo.statut !== "en_vente") throw new HttpError(404, "Annonce introuvable");
    const { data: app } = await admin.from("saas_apps").select("workspace_id, spec").eq("id", bo.app_id).single();
    const vendeur = app!.workspace_id === ws.id;
    const acheteur = vendeur ? String(b.acheteur ?? "") : ws.id;
    if (vendeur && !(await admin.from("saas_bourse_messages").select("id").eq("bourse_id", bo.id).eq("acheteur_ws", acheteur).limit(1).maybeSingle()).data) throw new HttpError(400, "Conversation introuvable");
    const texte = String(b.texte ?? "").trim().slice(0, 2000);
    const offre = b.offre != null && b.offre !== "" ? Math.round(Number(b.offre)) : null;
    if (offre != null && (vendeur || !(offre >= 100 && offre <= 10_000_000))) throw new HttpError(400, vendeur ? "Seul l'acheteur fait une offre" : "Offre entre 100 € et 10 M€");
    if (!texte && offre == null) throw new HttpError(400, "Message vide");
    await quota(ws.id, "bourse_message", 60);
    // Une nouvelle offre remplace la précédente encore en attente
    if (offre != null) await admin.from("saas_bourse_messages").update({ statut_offre: "remplacee" }).eq("bourse_id", bo.id).eq("acheteur_ws", acheteur).eq("statut_offre", "proposee");
    await admin.from("saas_bourse_messages").insert({ bourse_id: bo.id, acheteur_ws: acheteur, de_ws: ws.id, texte: texte || null, offre, statut_offre: offre != null ? "proposee" : null });
    const nom = (app!.spec as { nom?: string })?.nom ?? "SaaS";
    const dest = vendeur ? acheteur : app!.workspace_id;
    const { data: wd } = await admin.from("workspaces").select("*").eq("id", dest).single();
    const { sendSystem, teamAddress } = await import("../_shared/mail.ts");
    const to = await teamAddress(wd as never);
    const resume = offre != null ? `Offre de ${offre.toLocaleString("fr-FR")} € pour ${nom}${texte ? ` : « ${texte.slice(0, 300)} »` : ""}` : `« ${texte.slice(0, 500)} »`;
    if (to) await sendSystem({ to, subject: `Bourse Bingoo! · ${nom} : ${offre != null ? "nouvelle offre" : "nouveau message"} de ${ws.name ?? "un membre"}`, text: `${ws.name ?? "Un membre de Bingoo!"} t'écrit à propos de ${nom} (en vente à ${bo.prix} €) :\n\n${resume}\n\nRéponds dans Bingoo! : https://kairo.maisonravita.fr/#/explorer/bourse\n\nBingoo!`, key: `bourse-${bo.id}-${acheteur}-${Date.now()}` }).catch((e) => console.error("bourse mail", e));
    await admin.from("activity").insert({ workspace_id: dest, kind: "bourse", summary: `${offre != null ? "Offre" : "Message"} sur la bourse : ${nom}` });
    return { ok: true };
  },
  async "saas-bourse-lu"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await admin.from("saas_bourse_messages").update({ lu: true }).eq("bourse_id", String(b.bourse_id ?? "")).eq("acheteur_ws", String(b.acheteur ?? "")).neq("de_ws", ws.id);
    return { ok: true };
  },
  // Le vendeur accepte ou refuse l'offre en cours ; acceptée, la vente attend le paiement de l'acheteur
  async "saas-bourse-offre"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { data: m } = await admin.from("saas_bourse_messages").select("id, bourse_id, acheteur_ws, offre, statut_offre").eq("id", String(b.message_id ?? "")).maybeSingle();
    const { data: bo } = m ? await admin.from("saas_bourse").select("id, app_id, statut").eq("id", m.bourse_id).single() : { data: null };
    const { data: app } = bo ? await admin.from("saas_apps").select("workspace_id, spec").eq("id", bo.app_id).single() : { data: null };
    if (!m || !bo || !app || app.workspace_id !== ws.id || m.statut_offre !== "proposee") throw new HttpError(404, "Offre introuvable");
    const ok = !!b.accepter;
    await admin.from("saas_bourse_messages").update({ statut_offre: ok ? "acceptee" : "refusee" }).eq("id", m.id);
    const nom = (app.spec as { nom?: string })?.nom ?? "SaaS";
    await admin.from("saas_bourse_messages").insert({ bourse_id: bo.id, acheteur_ws: m.acheteur_ws, de_ws: ws.id, texte: ok ? `Offre de ${m.offre!.toLocaleString("fr-FR")} € acceptée. Prochaine étape : le paiement entre vous (virement), puis je transfère ${nom} sur ton espace.` : `Offre de ${m.offre!.toLocaleString("fr-FR")} € refusée.${b.texte ? ` ${String(b.texte).slice(0, 500)}` : ""}` });
    if (ok) await admin.from("saas_bourse_ventes").insert({ bourse_id: bo.id, app_id: bo.app_id, vendeur_ws: ws.id, acheteur_ws: m.acheteur_ws, prix: m.offre!, commission: Math.round(m.offre! * 0.05) });
    const { data: wd } = await admin.from("workspaces").select("*").eq("id", m.acheteur_ws).single();
    const { sendSystem, teamAddress } = await import("../_shared/mail.ts");
    const to = await teamAddress(wd as never);
    if (to) await sendSystem({ to, subject: `Bourse Bingoo! · ${nom} : ton offre est ${ok ? "acceptée" : "refusée"}`, text: `Ton offre de ${m.offre} € pour ${nom} est ${ok ? "acceptée. Organise le paiement avec le vendeur dans la conversation : il transfère ensuite l'application sur ton espace" : "refusée. Tu peux en proposer une autre dans la conversation"}.\n\nhttps://kairo.maisonravita.fr/#/explorer/bourse\n\nBingoo!` }).catch(() => null);
    await log(ws.id, "bourse", `Offre ${ok ? "acceptée" : "refusée"} : ${nom} ${m.offre} €`);
    return { ok: true };
  },
  // Paiement reçu : l'application (et son projet) passe sur l'espace de l'acheteur ; la commission de 5 % est due à Bingoo!
  async "saas-bourse-vendu"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { data: v } = await admin.from("saas_bourse_ventes").select("*").eq("bourse_id", String(b.bourse_id ?? "")).eq("acheteur_ws", String(b.acheteur ?? "")).eq("statut", "attente_paiement").order("at", { ascending: false }).limit(1).maybeSingle();
    if (!v || v.vendeur_ws !== ws.id) throw new HttpError(400, "Accepte d'abord une offre de cet acheteur");
    const { data: app } = await admin.from("saas_apps").select("id, workspace_id, projet_id, spec").eq("id", v.app_id).single();
    if (app!.workspace_id !== ws.id) throw new HttpError(403, "Ce SaaS n'est plus à toi");
    await admin.from("saas_projets").update({ workspace_id: v.acheteur_ws }).eq("id", app!.projet_id);
    // Le compte Stripe du vendeur est débranché : l'acheteur branche le sien (les abonnés en cours se transfèrent entre vous chez Stripe)
    await admin.from("saas_app_secrets").delete().eq("app_id", app!.id);
    await admin.from("saas_apps").update({ workspace_id: v.acheteur_ws, public: false, paiement: { actif: false, essai_jours: 14 } }).eq("id", app!.id);
    await admin.from("saas_bourse").update({ statut: "vendu" }).eq("id", v.bourse_id);
    await admin.from("saas_bourse_ventes").update({ statut: "a_facturer", transfere_at: new Date().toISOString() }).eq("id", v.id);
    const nom = (app!.spec as { nom?: string })?.nom ?? "SaaS";
    await admin.from("saas_bourse_messages").insert({ bourse_id: v.bourse_id, acheteur_ws: v.acheteur_ws, de_ws: ws.id, texte: `${nom} est transféré sur ton espace. Retrouve-le dans « Mes SaaS et classement », puis branche ton compte Stripe (onglet « Encaisser »).` });
    await log(ws.id, "bourse", `${nom} vendu ${v.prix} € (commission Bingoo! 5 % : ${v.commission} €)`);
    await admin.from("activity").insert({ workspace_id: v.acheteur_ws, kind: "bourse", summary: `${nom} est maintenant à toi : retrouve-le dans « Mes SaaS et classement »` });
    return { ok: true };
  },
  // Tâches planifiées des SaaS construits : jumeau (une fois par semaine par app) et e-mails des apps (fin d'essai, relance)
  async "leader-pages-test"(req, b) { await cron(req); const { pagesTest } = await import("../_shared/leader-pages.ts"); return await pagesTest(String(b.domaine ?? "")); },
  async "apps-cron"(req, b) {
    await cron(req);
    const out: Record<string, unknown> = {};
    if (b.mails !== false) { const { appMailsCron } = await import("../_shared/app-mails.ts"); out.mails = await appMailsCron().catch((e) => ({ erreur: String(e?.message ?? e) })); }
    if (b.createurs !== false && new Date().getUTCHours() === 2 || b.createurs === true) { const { appsCreateursCron } = await import("../_shared/app-owner.ts"); out.createurs = await appsCreateursCron().catch((e) => ({ erreur: String(e?.message ?? e) })); const { appsAbCron } = await import("../_shared/app-owner.ts"); out.ab = await appsAbCron().catch((e) => ({ erreur: String(e?.message ?? e) })); }
    if (b.jumeau !== false) {
      const { appJumeau } = await import("../_shared/app-owner.ts");
      const { data: apps } = await admin.from("saas_apps").select("id, workspace_id, jumeau_at").eq("statut", "pret").or(`jumeau_at.is.null,jumeau_at.lt.${new Date(Date.now() - 7 * 864e5).toISOString()}`).order("jumeau_at", { ascending: true, nullsFirst: true }).limit(Number(b.n ?? 3));
      out.jumeau = [];
      for (const a of apps ?? []) {
        setAi({ ws: a.workspace_id, live: false, feature: "construire/jumeau" });
        (out.jumeau as unknown[]).push(await appJumeau(a.id).catch((e) => ({ erreur: String(e?.message ?? e) })));
      }
    }
    return out;
  },
  async "saas-app-modifier"(req, b) {
    const { ws } = await membreOuCron(req, b.workspace_id);
    const demande = String(b.demande ?? "").trim().slice(0, 1500);
    if (demande.length < 5) throw new HttpError(400, "Décris la modification en une phrase au moins");
    const { data: app } = await admin.from("saas_apps").select("id, statut").eq("id", String(b.app_id ?? "")).eq("workspace_id", ws.id).maybeSingle();
    if (!app || app.statut !== "pret") throw new HttpError(404, "Application introuvable ou en cours de construction");
    await quota(ws.id, "modifier_app", 30);
    if (!req.headers.get("x-cron-key")) await quotaMois(ws.id, ws.plan, "modifier");
    setAi({ ws: ws.id, live: true, feature: "construire/modifier" });
    await log(ws.id, "modifier_app", `Modification : ${demande.slice(0, 120)}`);
    const { saasModifierEcran } = await import("../_shared/app-build.ts");
    await admin.from("saas_apps").update({ statut: "en_cours", etape: "Modification en cours", erreur: null, maj: new Date().toISOString() }).eq("id", app.id);
    const travail = saasModifierEcran(app.id, String(b.ecran ?? "nouveau"), demande, b.suggestion ? String(b.suggestion) : null).catch(async (e) => {
      await admin.from("saas_apps").update({ statut: "pret", etape: null, erreur: String(e?.message ?? e).slice(0, 300) }).eq("id", app.id);
    });
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(travail); else await travail;
    return { id: app.id, statut: "en_cours" };
  },
  async "saas-clients"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    if (ws.plan === "explorer") throw new HttpError(402, "« Qui démarcher » est dans la formule Pro.");
    await quota(ws.id, "recherche", 200);
    const { saasClients } = await import("../_shared/saas-base.ts");
    return await saasClients({ domaine: b.domaine ? String(b.domaine) : null, categorie: b.categorie ? String(b.categorie) : null, tag: b.tag ? String(b.tag) : null });
  },
  // Explorer → prospection : un segment de clients devient une cible de l'espace (Radar et Mission la prospectent ensuite)
  async "saas-cible-ajouter"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    if (["explorer", "explorer_pro", "business"].includes(String(ws.plan))) throw new HttpError(402, "La prospection ne fait pas partie de ta formule : tu peux noter ces segments et les démarcher avec ton outil.");
    const x = (b.segment ?? {}) as Record<string, unknown>;
    const naf = (Array.isArray(x.naf) ? x.naf : []).map(String).filter((n) => /^\d{2}\.\d{2}[A-Z]$/.test(n)).slice(0, 4);
    if (!x.label || !naf.length) throw new HttpError(400, "Segment incomplet");
    const targets = ((ws.targets ?? []) as Record<string, unknown>[]).slice();
    if (targets.length >= 10) throw new HttpError(400, "Tu as déjà 10 cibles : désactive ou supprime-en une dans Réglages avant d'en ajouter.");
    if (targets.some((t) => String(t.label).toLowerCase() === String(x.label).toLowerCase())) return { ok: true, deja: true };
    const t = { id: `e${Date.now().toString(36)}`, label: String(x.label).slice(0, 80), pourquoi: String(x.pourquoi ?? "").slice(0, 300), naf,
      tranches: (Array.isArray(x.tranches) ? x.tranches : []).map(String).slice(0, 8), siege_only: true, interlocuteur: String(x.interlocuteur ?? "").slice(0, 80),
      pour_qui: "", angle: String(x.angle ?? "").slice(0, 300), confiance: "a_tester", moment: "", actif: true, next_page: 1, total: Number(x.total) || undefined, source: "explorer" };
    await admin.from("workspaces").update({ targets: [...targets, t] }).eq("id", ws.id);
    return { ok: true, id: t.id };
  },
  async "saas-recherche"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "recherche", 200);
    const q = String(b.q ?? "").trim();
    if (q.length < 3) throw new HttpError(400, "Décris ce que tu cherches");
    const { saasRecherche } = await import("../_shared/saas-base.ts");
    return await saasRecherche(q, b.categorie ? String(b.categorie) : null);
  },
  // Histoire d'un SaaS à la demande (sa fiche est consultée et il n'en a pas encore) : une fois par SaaS, en tâche de fond
  async "saas-histoire-demande"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { data: x } = await admin.from("saas").select("id, statut").eq("domaine", String(b.domaine ?? "")).maybeSingle();
    if (!x || x.statut !== "ok") return { statut: "absent" };
    const { data: h } = await admin.from("saas_histoires").select("statut").eq("saas_id", x.id).maybeSingle();
    if (h) return { statut: h.statut };
    await quota(ws.id, "histoire", 20);
    await log(ws.id, "histoire", `Histoire demandée : ${b.domaine}`);
    await admin.from("saas_histoires").upsert({ saas_id: x.id, statut: "en_cours", at: new Date().toISOString() });
    const { saasHistoire } = await import("../_shared/saas-base.ts");
    const travail = saasHistoire(x.id).then(async (r) => { if (!r || r.statut === "erreur") await admin.from("saas_histoires").delete().eq("saas_id", x.id).eq("statut", "en_cours"); }).catch(() => admin.from("saas_histoires").delete().eq("saas_id", x.id).eq("statut", "en_cours"));
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(travail); else await travail;
    return { statut: "en_cours" };
  },
  async "saas-histoires"(req, b) { await cron(req); const { saasHistoires } = await import("../_shared/saas-base.ts"); return await saasHistoires(Math.min(5, Number(b.n ?? 3))); },
  async "saas-pays"(req, b) { await cron(req); const { saasPays } = await import("../_shared/saas-base.ts"); return await saasPays(Math.min(40, Number(b.n ?? 24))); },
  async "saas-pubs"(req, b) { await cron(req); const { saasPubs } = await import("../_shared/saas-base.ts"); return await saasPubs(Math.min(12, Number(b.n ?? 6))); },
  async "saas-tags"(req) { await cron(req); const { saasTags, saasEmailsAClasser } = await import("../_shared/saas-base.ts"); await saasEmailsAClasser().catch(() => null); return await saasTags(); },
  // Explorer (clé cron) : relevés de nuit et amorçage de la base
  // Découverte à grande échelle (clé cron) : import de la liste Tranco, puis tri sans IA des candidats
  async "saas-decouvrir-import"(req, b) { await cron(req); const { decouvrirImport } = await import("../_shared/saas-decouverte.ts"); return await decouvrirImport(Math.max(1, Number(b.debut ?? 1)), Math.min(1_000_001, Number(b.fin ?? 100_001))); },
  async "saas-succes-import"(req) { await cron(req); const { succesImport } = await import("../_shared/saas-decouverte.ts"); return await succesImport(); },
  async "trustmrr-plan"(req) { await cron(req); const { trustmrrPlan } = await import("../_shared/saas-decouverte.ts"); return await trustmrrPlan(); },
  async "trustmrr-lire"(req, b) { await cron(req); const { trustmrrLire } = await import("../_shared/saas-decouverte.ts"); return await trustmrrLire(Math.min(80, Number(b.n ?? 40))); },
  async "saas-entreprises"(req, b) { await cron(req); const { entreprisesMaj } = await import("../_shared/saas-entreprise.ts"); return await entreprisesMaj(Math.min(30, Number(b.n ?? 15))); },
  async "saas-decouvrir"(req, b) { await cron(req); const { decouvrirTri } = await import("../_shared/saas-decouverte.ts"); return await decouvrirTri(Math.min(400, Number(b.n ?? 240))); },
  async "saas-cron"(req) { await cron(req); const { saasCron } = await import("../_shared/saas-base.ts"); return await saasCron(); },
  async "saas-seed"(req, b) {
    await cron(req);
    const { saasSeed, CATEGORIES } = await import("../_shared/saas-base.ts");
    const cats = Array.isArray(b.categories) && b.categories.length ? b.categories.map(String) : CATEGORIES.filter((c) => c !== "Autre");
    const regions = Array.isArray(b.regions) && b.regions.length ? b.regions.map(String) : ["France"];
    const t0 = Date.now(); let ajoutes = 0, faits = 0;
    for (const c of cats) for (const r of regions) {
      if (Date.now() - t0 > 100_000) break;
      ajoutes += await saasSeed(c, r); faits++;
    }
    return { faits, ajoutes };
  },
  async "attrey-search"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    if (ws.id !== "4e9c20f1-84bb-4854-aca7-adcdc2bc8bfd") throw new HttpError(403, "Espace Attrey uniquement");
    await quota(ws.id, "espion", 20);
    // Par défaut : interroger les 10 domaines publics en deux lots bornés.
    // Une plateforme explicitement choisie conserve l'ancien mode mono-source.
    if (!b.variante || b.variante === "toutes") return await attreyMultiScan(ws,"manuel");
    if (b.variante === "airbnb") return await attreyAirbnbIndexedSearch(ws);
    // La recherche Airbnb ciblée ne doit pas scanner les forums en supplément.
    const forums = b.variante === "airbnb" ? {added:0} : await attreyForums(ws, "manuel").catch((e) => { console.error("attrey forums", e); return { added: 0 }; });
    const web = await attreySearch(ws, "manuel", typeof b.variante === "string" ? b.variante : undefined);
    return { ...web, added: (web.added ?? 0) + (forums.added ?? 0), forums };
  },
  async "attrey-classify"(req,b) {
    const {ws}=await requireMember(req,b.workspace_id);
    await quota(ws.id,"espion",20);
    return await classifyAttreyCandidates(ws,Array.isArray(b.ids)?b.ids:undefined);
  },
  async "attrey-airbnb-audit"(req,b) {
    const {ws}=await requireMember(req,b.workspace_id);
    await quota(ws.id,"espion",20);
    return await attreyAirbnbAudit(ws,b);
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
  // Accueil : places restantes au prix fondateur (compteur réel, sans connexion)
  async "founder-slots"() { const { founderSlots } = await import("../_shared/growth.ts"); return await founderSlots(); },
  async "free-site"(req, b) {
    const { freeLimit, freeSite } = await import("../_shared/free-tools.ts");
    await freeLimit(req, "site", 3, 300, { visitor: "Tu as fait tes 3 essais du jour. Crée ton compte Bingoo! pour lancer le Radar sans limite." });
    return await freeSite(b);
  },
  // « Ton marché SaaS » : concurrents, prix, recrutement, nouveautés (essai gratuit sans compte)
  async "free-marche"(req, b) {
    const { freeLimit } = await import("../_shared/free-tools.ts");
    await freeLimit(req, "marche", 2, 120, { visitor: "Tu as fait tes 2 rapports gratuits du jour. Crée ton compte Bingoo! pour suivre ton marché chaque semaine." });
    const { marcheSaas } = await import("../_shared/marche-saas.ts");
    return await marcheSaas(b);
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
  // Téléphone du décideur via trouvé! : à la demande seulement (3 clés), jamais en automatique
  async "find-phone"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { data: p } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("id", String(b.id ?? "")).single();
    if (!p) throw new HttpError(404, "Fiche introuvable");
    const { trouveReady, trouvePhone, trouveMsg } = await import("../_shared/trouve.ts");
    if (!trouveReady()) throw new HttpError(400, "La recherche de téléphone n'est pas encore activée");
    try { return await trouvePhone(ws, p); } catch (e) { throw new HttpError(502, trouveMsg(e)); }
  },
  // Test de trouvé! sur quelques fiches (clé cron) : dry = dirigeants seulement, aucune clé dépensée
  async "trouve-test"(req, b) {
    await cron(req);
    const { trouveEmail, trouveMsg } = await import("../_shared/trouve.ts");
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).slice(0, 5);
    const { data: ps } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).in("id", ids);
    const out = [];
    const mod = await import("../_shared/trouve.ts");
    for (const p of ps ?? []) { try { out.push({ nom: p.name, ...(await trouveEmail(ws, p, b.dry !== false)), ...(b.debug ? { brut: mod.lastRaw } : {}) }); } catch (e) { out.push({ nom: p.name, erreur: trouveMsg(e) }); } }
    return { resultats: out };
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
    const { data: p } = await admin.from("prospects").update({ status: "ignore", fit: "non", fit_reason: `Écarté par toi : ${raison}` }).eq("workspace_id", ws.id).eq("id", String(b.id ?? "")).select("name, siren, email, website").single();
    // « Déjà client » : l'entreprise rejoint la liste « ne jamais contacter » (plus jamais d'autre fiche ni d'autre interlocuteur)
    if (raison === "Déjà client" && p) {
      const { exclusionsDe, domaineDe } = await import("../_shared/deja.ts");
      const cle = (p.siren && String(p.siren).replace(/\D/g, "").length === 9 ? String(p.siren).replace(/\D/g, "") : "") || domaineDe(p.email) || String(p.name ?? "");
      const liste = exclusionsDe(ws);
      if (cle && !liste.includes(cle.toLowerCase())) await admin.from("workspaces").update({ profile: { ...((ws.profile ?? {}) as Record<string, unknown>), exclusions: [...liste, cle] } }).eq("id", ws.id);
    }
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
  // Parrainage : posé une seule fois, juste après l'inscription, avec le code reçu dans le lien (?parrain=…)
  async parrain(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const code = String(b.code ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
    const w = ws as { referred_by?: string | null; paid_since?: string | null; created_at: string };
    if (!code || w.referred_by || w.paid_since || Date.now() - new Date(w.created_at).getTime() > 14 * 864e5) return { ok: false };
    const { data: p } = await admin.from("workspaces").select("id, name, created_by").eq("referral_code", code).maybeSingle();
    if (!p || p.id === ws.id || p.created_by === (ws as { created_by?: string }).created_by) return { ok: false };
    await admin.from("workspaces").update({ referred_by: p.id }).eq("id", ws.id).is("referred_by", null);
    return { ok: true, parrain: p.name };
  },
  async "perks-cron"(req, b) {
    await cron(req);
    const { perksCron } = await import("../_shared/garantie.ts");
    return await perksCron(b.dry === true);
  },
  // « Ne jamais contacter » : clients actuels, partenaires, concurrents (domaines, SIREN, e-mails ou noms, un par ligne)
  // Démarrage express (fin d'inscription) : par tranches courtes pour afficher la progression.
  // etape "chercher" : une tranche de recherche gratuite (site + e-mail publié) sur les fiches avec un décideur nommé ;
  // etape "rediger" : jusqu'à 3 premiers messages prêts à valider. Rien ne part sans validation.
  async demarrage(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const prets = async () => (await admin.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "brouillon")).count ?? 0;
    const avecEmail = async () => (await admin.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).in("status", ["nouveau", "pret"]).neq("email", "")).count ?? 0;
    if (b.etape === "rediger") {
      const { draft } = await import("../_shared/agents.ts");
      const { dejaContacte } = await import("../_shared/deja.ts");
      let n = await prets();
      const { aEcrire } = await import("../_shared/agents.ts");
      const cands = await aEcrire(ws.id, 8);
      const t0 = Date.now();
      for (const p of cands ?? []) {
        if (n >= 3 || Date.now() - t0 > 100_000) break;
        if (await dejaContacte(ws, p).catch(() => null)) continue;
        try { await draft(ws, p); n++; } catch { /* adresse écartée ou déjà prête : on passe à la suivante */ }
      }
      return { prets: n };
    }
    const { freeEnrich } = await import("../_shared/deep.ts");
    const since = new Date(Date.now() - 3 * 864e5).toISOString();
    const base = () => admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("email", "").in("status", ["nouveau", "sans_email"]).or(`free_tried_at.is.null,free_tried_at.lt.${since}`);
    // Les fiches avec un fait récent à citer d'abord (sans lui, aucun message ne sera écrit), puis celles avec un décideur nommé
    const { declencheur } = await import("../_shared/agents.ts");
    const { data: pool } = await base().order("score", { ascending: false, nullsFirst: false }).limit(60);
    const rang = (p: any) => (declencheur(p) ? 2 : 0) + (p.contact_name ? 1 : 0);
    const rows = (pool ?? []).sort((a: any, b: any) => rang(b) - rang(a)).slice(0, 6);
    let sites = 0, emails = 0;
    const t0 = Date.now();
    for (let i = 0; i < rows.length && Date.now() - t0 < 45_000; i += 3) {
      const part = await Promise.all(rows.slice(i, i + 3).map((p) => freeEnrich(p, true).catch(() => ({ site: "", foundSite: false, email: "" }))));
      sites += part.filter((x) => x.site).length; emails += part.filter((x) => x.email).length;
    }
    return { essais: rows.length, sites, emails, avec_email: await avecEmail(), reste: rows.length > 0 };
  },
  async exclusions(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { exclusionsDe } = await import("../_shared/deja.ts");
    if (b.liste !== undefined) {
      const liste = String(b.liste ?? "").split(/[\n,;]+/).map((x) => x.trim()).filter((x) => x.length >= 3).slice(0, 2000);
      const prof = (ws.profile ?? {}) as Record<string, unknown>;
      await admin.from("workspaces").update({ profile: { ...prof, exclusions: liste } }).eq("id", ws.id);
      return { liste, n: liste.length };
    }
    return { liste: exclusionsDe(ws), n: exclusionsDe(ws).length };
  },
  // Import des clients actuels depuis le CRM vers « Ne jamais contacter » (HubSpot : sociétés clientes ; Pipedrive : affaires gagnées)
  async "exclusions-crm"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { crmAuth } = await import("../_shared/crm-oauth.ts");
    const { hub, pipe } = await import("../_shared/growth.ts");
    const { exclusionsDe } = await import("../_shared/deja.ts");
    const auth = await crmAuth(ws);
    if (!auth.hubspot && !auth.pipedrive) throw new HttpError(400, "Connecte HubSpot ou Pipedrive dans Connexions pour importer tes clients");
    const ajout: string[] = [];
    if (auth.hubspot) {
      let after: string | undefined;
      for (let page = 0; page < 5; page++) {
        const r = await hub(auth.hubspot.token, "/crm/v3/objects/companies/search", "POST", { filterGroups: [{ filters: [{ propertyName: "lifecyclestage", operator: "EQ", value: "customer" }] }], properties: ["name", "domain"], limit: 100, ...(after ? { after } : {}) });
        for (const c of (r.data?.results ?? []) as { properties?: { name?: string; domain?: string } }[]) ajout.push(c.properties?.domain || c.properties?.name || "");
        after = r.data?.paging?.next?.after; if (!after) break;
      }
    }
    if (auth.pipedrive) {
      for (let start = 0; start < 500; start += 100) {
        const r = await pipe(auth.pipedrive as never, `/deals?status=won&limit=100&start=${start}`);
        const rows = (r.data?.data ?? []) as { org_name?: string; org_id?: { name?: string } }[];
        for (const d of rows) ajout.push(d.org_name || d.org_id?.name || "");
        if (!r.data?.additional_data?.pagination?.more_items_in_collection) break;
      }
    }
    const avant = exclusionsDe(ws);
    const set = new Set(avant);
    const nouveaux = [...new Set(ajout.map((x) => String(x).trim()).filter((x) => x.length >= 3))].filter((x) => !set.has(x.toLowerCase()));
    const liste = [...avant, ...nouveaux].slice(0, 2000);
    await admin.from("workspaces").update({ profile: { ...((ws.profile ?? {}) as Record<string, unknown>), exclusions: liste } }).eq("id", ws.id);
    return { ajoutes: nouveaux.length, total: liste.length, liste };
  },
  // Test du détecteur (clé cron) : pour chaque fiche prête, dit si elle serait bloquée et pourquoi, sans rien changer
  async "deja-test"(req, b) {
    await cron(req);
    const { dejaContacte } = await import("../_shared/deja.ts");
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id)).single();
    const { data: ps } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).in("status", ["pret", "a_valider", "nouveau"]).limit(Number(b.n ?? 30));
    const out = [];
    for (const p of ps ?? []) { const d = await dejaContacte(ws, p); if (d) out.push({ name: p.name, raison: d.raison }); }
    return { testees: ps?.length ?? 0, bloquees: out };
  },
  async "style-set"(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { styleSet } = await import("../_shared/style.ts");
    return await styleSet(ws, b.regles);
  },
  // Ton public : état de chaque cible (marche, en test, en pause) et journal de ce que Bingoo! a changé tout seul
  async ciblage(req, b) {
    const { ws } = await requireMember(req, b.workspace_id);
    const { cibleStats, autoCiblage } = await import("../_shared/ciblage.ts");
    if (b.run === true) { setAi({ ws: ws.id, live: true }); const r = await autoCiblage(ws, { force: true }); const { data: w } = await admin.from("workspaces").select("profile").eq("id", ws.id).single(); return { ...r, journal: (w?.profile as { ciblage?: { journal?: unknown[] } })?.ciblage?.journal ?? [] }; }
    return { stats: await cibleStats(ws), journal: (ws.profile as { ciblage?: { journal?: unknown[] } })?.ciblage?.journal ?? [] };
  },
  async "ciblage-cron"(req, b) {
    await cron(req);
    const { autoCiblage } = await import("../_shared/ciblage.ts");
    const { planOk } = await import("../_shared/core.ts");
    let q = admin.from("workspaces").select("*").eq("onboarded", true).neq("plan", "fondateur");
    if (b.workspace_id) q = admin.from("workspaces").select("*").eq("id", String(b.workspace_id));
    const { data } = await q;
    const out: Record<string, unknown> = {};
    for (const ws of (data ?? []).filter((w) => b.workspace_id || planOk(w))) { setAi({ ws: ws.id, live: !!b.workspace_id }); out[ws.name] = await autoCiblage(ws, { dry: b.dry === true, force: b.force === true }).then((r) => ({ actions: r.actions, applique: r.applique, stats: r.stats.map((x) => `${x.label} : ${x.etat} (${x.positifs}/${x.contactes})`) })).catch((e) => ({ erreur: (e as Error).message })); }
    return out;
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
  // Recherche d'entreprises (gratuit, base SIRENE) pour un espace donné, par l'administration (clé cron)
  async "search-ws"(req, b) {
    await cron(req);
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    const { searchTarget } = await import("../_shared/search.ts");
    const targets = (ws.targets ?? []) as { id: string; label: string; actif?: boolean; next_page?: number | null }[];
    let inserted = 0;
    const detail: Record<string, number> = {};
    for (const t of targets.filter((x) => x.actif !== false && x.next_page !== null && (!b.target_id || x.id === b.target_id))) {
      const r = await searchTarget(ws.id, t as never, ws.zone ?? [], Math.min(Number(b.pages ?? 1), 3));
      t.next_page = r.nextPage; inserted += r.inserted; detail[t.label] = r.inserted;
    }
    await admin.from("workspaces").update({ targets }).eq("id", ws.id);
    return { inserted, detail };
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
    // Les fiches qui ont un fait récent passent d'abord (sans e-mail, elles ne peuvent pas devenir des opportunités), puis un décideur nommé
    const { declencheur } = await import("../_shared/agents.ts");
    const { data: pool } = await base().order("free_tried_at", { ascending: true, nullsFirst: true }).order("score", { ascending: false, nullsFirst: false }).limit(Math.max(n * 6, 120));
    const rang = (p: any) => (declencheur(p) ? 2 : 0) + (p.contact_name ? 1 : 0);
    const data = (pool ?? []).sort((a: any, b: any) => rang(b) - rang(a)).slice(0, n);
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
  // Réécrit les opportunités en attente avec les règles actuelles (fait daté, pont vers l'offre, contrôle des faits).
  // Ce qui reste douteux est retiré de l'Atelier (la fiche attend un fait plus solide). Rien n'est envoyé.
  async "reecrire-brouillons"(req, b) {
    await cron(req);
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    setAi({ ws: ws.id, live: true });
    const { rediger, declencheur } = await import("../_shared/agents.ts");
    const { data: ms } = await admin.from("messages").select("id, prospect_id, prospects(*)").eq("workspace_id", ws.id).eq("status", "brouillon").eq("step", 0)
      .lt("created_at", String(b.avant ?? new Date().toISOString())).order("created_at").limit(Math.min(Number(b.n ?? 10), 15));
    const out: Record<string, string> = {};
    const t0 = Date.now();
    for (const m of ms ?? []) {
      if (Date.now() - t0 > 110_000) break;
      const p = (m as { prospects: Prospect }).prospects;
      // Pas de fait récent : pas de message (règle de base), la fiche attend un signal
      // (les faits du Radar sont recopiés sur la fiche : le lien seul ne suffit plus)
      if (!declencheur(p)) {
        await admin.from("messages").update({ status: "ignore", error: "Retiré : aucun fait récent à citer" }).eq("id", m.id);
        await admin.from("prospects").update({ status: "pret" }).eq("id", m.prospect_id).eq("status", "a_valider");
        out[p.name] = "retiré (aucun fait récent)"; continue;
      }
      try {
        const d = await rediger(ws, p);
        await admin.from("messages").update({ subject: d.subject, body: d.body, check_note: "", created_at: new Date().toISOString() }).eq("id", m.id);
        out[p.name] = "réécrit";
      } catch (e) {
        await admin.from("messages").update({ status: "ignore", error: "Retiré : pas assez de faits sûrs pour un message dont on est certain" }).eq("id", m.id);
        await admin.from("prospects").update({ status: "pret" }).eq("id", m.prospect_id).eq("status", "a_valider");
        out[p.name] = `retiré (${(e as Error).message.slice(0, 60)})`;
      }
    }
    return { traites: Object.keys(out).length, detail: out };
  },
  // Remplir l'Atelier tout de suite (sans attendre la nuit) : plus d'entreprises du registre, Radar sur les sources officielles,
  // entrées automatiques des entreprises au bon moment, e-mails publiés (fiches à fait récent d'abord), puis rédaction.
  async remplir(req, b) {
    await cron(req);
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    setAi({ ws: ws.id, live: true });
    const out: Record<string, unknown> = {};
    const t0 = Date.now(), reste = () => 140_000 - (Date.now() - t0);
    if (b.etape === "chercher" || !b.etape) {
      const { searchTarget } = await import("../_shared/search.ts");
      const targets = (ws.targets ?? []) as { id: string; actif?: boolean; next_page?: number | null }[];
      let n = 0;
      for (const t of targets.filter((x) => x.actif !== false && x.next_page !== null)) {
        if (reste() < 60_000) break;
        const r = await searchTarget(ws.id, t as never, ws.zone ?? [], Math.min(Number(b.pages ?? 2), 3)).catch(() => null);
        if (r) { t.next_page = r.nextPage; n += r.inserted; }
      }
      await admin.from("workspaces").update({ targets }).eq("id", ws.id);
      out.entreprises_ajoutees = n;
    }
    if (b.etape === "radar" || !b.etape) {
      const { scanRadar, radarAuto } = await import("../_shared/radar.ts");
      const sr = await scanRadar(ws, { web: false }).catch((e) => ({ erreur: (e as Error).message }));
      out.radar = sr;
      out.entrees_radar = await radarAuto(ws).catch(() => 0);
    }
    if (b.etape === "emails") {
      const { freeEnrich } = await import("../_shared/deep.ts");
      const { declencheur } = await import("../_shared/agents.ts");
      const { data: pool } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("email", "").in("status", ["nouveau", "sans_email"]).is("free_tried_at", null).limit(400);
      const cibles = (pool ?? []).filter((p) => declencheur(p)).slice(0, 18);
      let emails = 0;
      for (let i = 0; i < cibles.length && reste() > 15_000; i += 3) {
        const r = await Promise.all(cibles.slice(i, i + 3).map((p) => freeEnrich(p, true).catch(() => ({ email: "" }))));
        emails += r.filter((x) => x.email).length;
      }
      out.essais = cibles.length; out.emails = emails;
    }
    if (b.etape === "rediger") {
      const { aEcrire, draft } = await import("../_shared/agents.ts");
      const cands = await aEcrire(ws.id, 8);
      let n = 0, retires = 0;
      for (const p of cands) {
        if (n >= Number(b.n ?? 5) || reste() < 20_000) break;
        try { await draft(ws, p); n++; } catch { retires++; }
      }
      out.opportunites = n; out.non_retenues = retires;
    }
    return out;
  },
  // Diagnostic La Bonne Boîte : quelles formes du filtre d'activité sont prises en compte (aucune donnée enregistrée)
  async "lbb-test"(req, b) {
    await cron(req);
    const { ftAuth } = await import("../_shared/radar-plus.ts");
    const token = await ftAuth(["api_labonneboitev2 search office", "api_labonneboitev2"]);
    const essais: Record<string, string>[] = (b.essais as Record<string, string>[]) ?? [{ naf: "7022Z" }, { naf: "70" }, { naf: "70.22Z" }, { job: "conseil en gestion" }];
    const out: unknown[] = [];
    for (const e of essais) {
      const u = new URL("https://api.francetravail.io/partenaire/labonneboite/v2/recherche");
      for (const [k, v] of Object.entries(e)) u.searchParams.append(k, v);
      u.searchParams.set("department_number", String(b.dep ?? "75")); u.searchParams.set("page_size", "20");
      const r = await fetch(u, { headers: { authorization: `Bearer ${token}`, accept: "application/json" }, signal: AbortSignal.timeout(20000) });
      const j = await r.json().catch(() => ({}));
      const items = (j.items ?? []) as { naf?: string; is_high_potential?: boolean }[];
      out.push({ essai: e, statut: r.status, hits: j.hits, nafs: [...new Set(items.map((x) => x.naf))].slice(0, 8), fort: items.filter((x) => x.is_high_potential).length, erreur: r.ok ? undefined : JSON.stringify(j).slice(0, 200) });
      await new Promise((x) => setTimeout(x, 600));
    }
    return out;
  },
  // Test des fournisseurs d'e-mails : présence des clés (jamais leur valeur), puis recherche sur quelques fiches à déclencheur
  // Diagnostic (clé cron) : santé de l'envoi d'un espace, ou d'un domaine quelconque ; relecture d'un texte
  async "sante-test"(req, b) {
    await cron(req);
    const s = await import("../_shared/sante.ts");
    if (b.domaine) return await s.controleDomaine(String(b.domaine), String(b.site ?? ""));
    if (b.texte !== undefined) { const c = await import("../_shared/controle.ts"); return c.controler({ name: String(b.nom ?? ""), contact_name: String(b.contact ?? ""), email: String(b.email ?? "") } as never, String(b.objet ?? ""), String(b.texte)); }
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    return await s.santeEnvoi(ws, b.sauver === true);
  },
  async "email-test"(req, b) {
    await cron(req);
    const { providers } = await import("../_shared/contacts.ts");
    const { findEmail, dropcontactPending } = await import("../_shared/deep.ts");
    const { declencheur } = await import("../_shared/agents.ts");
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    if (b.poll === true) return { fournisseurs: providers(), resultats: await dropcontactPending(ws) };
    const { data: pool } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("email", "").neq("contact_name", "").is("dropcontact_req", null)
      .not("status", "in", "(ignore,refus,client)").limit(300);
    const cibles = (pool ?? []).filter((p) => declencheur(p) && String(p.contact_name).trim().includes(" ")).slice(0, Math.min(Number(b.n ?? 5), 10));
    const out: Record<string, unknown> = {};
    for (const p of cibles) out[p.name] = await findEmail(ws, p).catch((e) => ({ erreur: (e as Error).message }));
    return { fournisseurs: providers(), essais: cibles.length, detail: out };
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
    const out = await Promise.all((ps ?? []).map(async (p) => { try { const { rediger } = await import("../_shared/agents.ts"); const d = await rediger(ws, p, { test: true }); const doutes = d.check_note; const r1 = b.relance === false ? "" : await offerFollowup(ws, d.body, (d.body.split("\n")[0] || "Bonjour,")).catch((e) => `(relance : ${e.message})`); return { prospect: p.name, objet: d.subject, corps: d.body, doutes, relance1: r1 }; } catch (e) { return { prospect: p.name, erreur: String((e as Error).message) }; } }));
    return { messages: out };
  },
  // Test interne : rédige et enregistre le premier message d'UNE fiche (brouillon à valider, rien n'est envoyé)
  async "draft-one"(req, b) {
    await cron(req);
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    const { data: p } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("id", String(b.prospect_id ?? "")).single();
    if (!p) throw new HttpError(404, "Fiche introuvable");
    setAi({ ws: ws.id, live: true });
    const { draft } = await import("../_shared/agents.ts");
    return await draft(ws, p);
  },
  // Test interne : ce que Bingoo! comprend d'un site ou d'une description (aucun espace modifié)
  async "analyze-test"(req, b) {
    await cron(req);
    const { analyze, normalizeUrl, readSite } = await import("../_shared/analyze.ts");
    const site = b.url ? await readSite(normalizeUrl(String(b.url))) : "";
    const r = await analyze(site as string, String(b.description ?? ""));
    return { profil: r.profile, cibles: r.targets.map((x) => ({ label: x.label, confiance: x.confiance, moment: x.moment, interlocuteur: x.interlocuteur, total: x.total })) };
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
  // Attrey : recherche web quotidienne de l'espace MVJ, sur sa propre tâche planifiée (budget de temps séparé de la veille générale)
  async "attrey-cron"(req) {
    await cron(req);
    const wid = "4e9c20f1-84bb-4854-aca7-adcdc2bc8bfd";
    // Le scan MANUEL ne doit pas bloquer le passage programmé du lendemain.
    const { data: lastCron } = await admin.from("attrey_runs").select("at")
      .eq("workspace_id", wid).eq("canal","web").eq("declenchement","cron")
      .order("at",{ascending:false}).limit(1).maybeSingle();
    if (lastCron?.at && Date.now() - new Date(lastCron.at).getTime() < 23 * 3600000) return { skipped: "deja_fait" };
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", wid).single();
    const { aiRoom, backgroundPaused } = await import("../_shared/core.ts");
    if (!ws || (await backgroundPaused()) || !(await aiRoom(wid, 0.6))) return { skipped: "budget_ou_pause" };
    try {
      // Priorité Attrey : un passage borné chaque jour sur les avis Airbnb publics indexés.
      // Les autres canaux restent accessibles en recherche manuelle.
      return { airbnb: await attreyAirbnbIndexedSearch(ws, "cron") };
    }
    catch (e) {
      await admin.from("attrey_scan_state").upsert({ workspace_id: wid, last_error: (e as Error).message.slice(0, 300), updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
      throw e;
    }
  },
  async "spy-digest"(req) { await cron(req); return await spyDigest(); },
  // Administration : recherche de demandes publiques sur un espace précis (clé cron)
  // Administration (clé cron) : fiches prospects depuis les opportunités du Radar, puis e-mail pro et, si demandé, téléphone du dirigeant via trouvé!
  // Une clé trouvé! n'est débitée que si la coordonnée existe. Aucun message n'est envoyé.
  async "contacts-run"(req, b) {
    await cron(req);
    const { data: w } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!w) throw new HttpError(404, "Espace introuvable");
    const ws = w as Parameters<typeof radarToProspect>[0];
    const max = Math.max(1, Math.min(40, Number(b.max) || 15));
    const t0 = Date.now(), reste = () => 120_000 - (Date.now() - t0);
    const kinds = Array.isArray(b.kinds) && b.kinds.length ? b.kinds.map(String) : ["patrimoine", "creation"];
    const { data: opps } = await admin.from("radar_opps").select("id").eq("workspace_id", ws.id).in("kind", kinds).is("prospect_id", null).neq("status", "ecarte").order("created_at").limit(max);
    let fiches = 0;
    for (const o of opps ?? []) { if (reste() < 60_000) break; try { await radarToProspect(ws, o.id); fiches++; } catch (e) { console.error("contacts-run fiche", o.id, e); } }
    const { trouveReady, trouveEmail, trouvePhone, trouveMsg, trouveStop } = await import("../_shared/trouve.ts");
    if (!trouveReady()) return { fiches, emails: 0, telephones: 0, note: "trouvé! non configuré" };
    const { data: ids } = await admin.from("radar_opps").select("prospect_id").eq("workspace_id", ws.id).in("kind", kinds).not("prospect_id", "is", null);
    const pids = [...new Set(((ids ?? []) as { prospect_id: string }[]).map((x) => x.prospect_id))];
    const { data: ps } = await admin.from("prospects").select("*").in("id", pids.length ? pids : ["00000000-0000-0000-0000-000000000000"]).is("dc_tried_at", null).not("siren", "is", null).limit(max);
    let emails = 0, telephones = 0, essais = 0; const erreurs: string[] = [];
    for (const p of (ps ?? []) as Prospect[]) {
      if (reste() < 15_000) break;
      essais++;
      try {
        const r = await trouveEmail(ws, p);
        if (r.email) emails++;
        if (b.phone === true && !p.phone) { const t = await trouvePhone(ws, p); if (t.phone) telephones++; }
      } catch (e) { erreurs.push(trouveMsg(e)); if (trouveStop(e)) break; }
    }
    return { fiches, essais, emails, telephones, erreurs: [...new Set(erreurs)] };
  },
  async "spy-needs-run"(req, b) {
    await cron(req);
    const { data: ws } = await admin.from("workspaces").select("*").eq("id", String(b.workspace_id ?? "")).single();
    if (!ws) throw new HttpError(404, "Espace introuvable");
    setAi({ ws: ws.id, feature: "radar/demandes" });
    return await spyNeeds(ws);
  },
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
