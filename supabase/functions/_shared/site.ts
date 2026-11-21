// Sites web (étape 2 de « Construire mon idée ») : construction (textes par l'IA, espace gérant fait main), voir site-spec.ts
// deno-lint-ignore-file no-explicit-any
import { categorieDesign, tirerDesign } from "./design.ts";
import { admin, askJson } from "./core.ts";
import { promptSite, specSite } from "./site-spec.ts";
export { promptSite, specSite };

/** Tirage du système de design d'une construction, avec l'historique du membre et du secteur. */
export async function choisirDesign(appId: string, motsCles: string) {
  const categorie = categorieDesign(motsCles);
  const { data: app } = await admin.from("saas_apps").select("workspace_id").eq("id", appId).maybeSingle();
  const [{ data: siens }, { data: secteur }] = await Promise.all([
    admin.from("saas_apps").select("spec->design").eq("workspace_id", app?.workspace_id ?? "").neq("id", appId).order("maj", { ascending: false }).limit(10),
    admin.from("saas_apps").select("spec->design").eq("spec->design->>categorie", categorie).neq("id", appId).order("maj", { ascending: false }).limit(6),
  ]);
  const vues = [...(siens ?? []), ...(secteur ?? [])].map((x: any) => x.design).filter(Boolean);
  return tirerDesign(categorie, vues);
}

/** Construction d'un site : une seule écriture rapide (les textes), l'espace gérant est déjà écrit et testé. */
export async function construireSite(appId: string, p: any, demarrerVerification: (id: string, spec?: any) => Promise<unknown>) {
  await admin.from("saas_apps").update({ etape: "Écriture des textes du site", maj: new Date().toISOString() }).eq("id", appId);
  const c = await askJson<any>(promptSite(p), { fast: true, maxTokens: 5000 });
  const spec = specSite(c, p);
  if (!spec.ecrans.every((e: any) => e.code)) throw new Error("L'espace gérant du site est introuvable");
  // Système de design (UI UX Pro Max) : catégorie tirée des mots-clés du plan, variante jamais vue chez ce membre ni
  // sur les derniers projets du même secteur ; palette et polices imposées (l'IA ne les choisit plus)
  const d = await choisirDesign(appId, String(c?.secteur_en ?? `${spec.site?.metier ?? ""}`));
  spec.design = d;
  spec.couleur = d.couleurs.primary;
  if (d.allure) spec.style = d.allure;
  // Gabarit kit Taste : pour les nouveaux portfolios seulement (validé par Jean le 21/11 après comparaison).
  // Les sites existants gardent leur gabarit ; un changement passe par garderApparence (retour en un clic).
  if (spec.site?.modele === "portfolio") spec.site = { ...spec.site, gabarit: "taste" };
  // Moteur de pages sur mesure (chantier « façon Lovable ») : la page publique écrite par l'IA, le gabarit restant en secours.
  // Activé par le secret GEN_SITES : "on" pour tous, "robot" (par défaut) pour les espaces du robot seulement, "off" jamais.
  if (await genActif(appId)) {
    await admin.from("saas_apps").update({ etape: "Écriture de la page sur mesure", maj: new Date().toISOString() }).eq("id", appId);
    const idee = p.idee ?? {};
    try {
      const { genererPage } = await import("./site-gen.ts");
      const g = await genererPage({
        nom: spec.nom, brief: [idee.texte, ...(Array.isArray(idee.reponses) ? idee.reponses.map((x: any) => `${x.q} : ${x.r}`) : [])].filter(Boolean).join("\n") || String(spec.pitch ?? ""),
        modele: spec.site?.modele, metier: spec.site?.metier, ville: spec.site?.ville, cta: spec.site?.cta, demande: spec.site?.demande,
        design: spec.design, services: spec.demo?.services, horaires: spec.demo?.horaires, infos: (spec.demo?.infos ?? [])[0], faq: spec.faq,
      });
      spec.site = { ...spec.site, page: g.page };
      spec.gen = { ...g.mesure, at: new Date().toISOString() };
    } catch (x) {
      // Gabarit de secours : jamais un site cassé ; la raison est gardée pour « Qualité des constructions »
      spec.gen = { echec: String((x as Error)?.message ?? x).slice(0, 240), at: new Date().toISOString() };
      console.error("moteur de pages", x);
    }
  }
  // Portfolio sans photos du membre : le nom en grand (Taste : jamais de photos de bibliothèque en en-tête ni de personnes,
  // elles passeraient pour son travail). Les photos libres (photos.ts) restent réservées à des détails, plus tard.
  await admin.from("saas_apps").update({ brouillon: spec, etape: `Écriture des écrans (${spec.ecrans.length - 1}/${spec.ecrans.length})`, maj: new Date().toISOString() }).eq("id", appId);
  // La vérification est posée avant la mise en ligne : le site ne paraît jamais « prêt » sans avoir été testé
  await demarrerVerification(appId, spec).catch((x) => console.error("verification site", x));
  const e0 = spec.ecrans[0];
  await admin.rpc("saas_app_ecran_set", { p_app: appId, p_id: e0.id, p_code: e0.code, p_ok: true });
}

/** Le moteur de pages est-il actif pour cette construction ? (secret GEN_SITES : on | robot | off) */
async function genActif(appId: string) {
  const mode = Deno.env.get("GEN_SITES") ?? "robot";
  if (mode === "on") return true;
  if (mode !== "robot") return false;
  const { data } = await admin.from("saas_apps").select("workspaces(name)").eq("id", appId).maybeSingle();
  return /^Robot construction/.test(String((data as any)?.workspaces?.name ?? ""));
}
