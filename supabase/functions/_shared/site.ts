// Sites web (étape 2 de « Construire mon idée ») : construction (textes par l'IA, espace gérant fait main), voir site-spec.ts
// deno-lint-ignore-file no-explicit-any
import { admin, askJson } from "./core.ts";
import { promptSite, specSite } from "./site-spec.ts";
export { promptSite, specSite };

/** Construction d'un site : une seule écriture rapide (les textes), l'espace gérant est déjà écrit et testé. */
export async function construireSite(appId: string, p: any, demarrerVerification: (id: string, spec?: any) => Promise<unknown>) {
  await admin.from("saas_apps").update({ etape: "Écriture des textes du site", maj: new Date().toISOString() }).eq("id", appId);
  const c = await askJson<any>(promptSite(p), { fast: true, maxTokens: 5000 });
  const spec = specSite(c, p);
  if (!spec.ecrans.every((e: any) => e.code)) throw new Error("L'espace gérant du site est introuvable");
  await admin.from("saas_apps").update({ brouillon: spec, etape: `Écriture des écrans (${spec.ecrans.length - 1}/${spec.ecrans.length})`, maj: new Date().toISOString() }).eq("id", appId);
  // La vérification est posée avant la mise en ligne : le site ne paraît jamais « prêt » sans avoir été testé
  await demarrerVerification(appId, spec).catch((x) => console.error("verification site", x));
  const e0 = spec.ecrans[0];
  await admin.rpc("saas_app_ecran_set", { p_app: appId, p_id: e0.id, p_code: e0.code, p_ok: true });
}
