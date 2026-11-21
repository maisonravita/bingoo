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
  await admin.from("saas_apps").update({ brouillon: spec, etape: `Écriture des écrans (${spec.ecrans.length - 1}/${spec.ecrans.length})`, maj: new Date().toISOString() }).eq("id", appId);
  // La vérification est posée avant la mise en ligne : le site ne paraît jamais « prêt » sans avoir été testé
  await demarrerVerification(appId, spec).catch((x) => console.error("verification site", x));
  const e0 = spec.ecrans[0];
  await admin.rpc("saas_app_ecran_set", { p_app: appId, p_id: e0.id, p_code: e0.code, p_ok: true });
}
