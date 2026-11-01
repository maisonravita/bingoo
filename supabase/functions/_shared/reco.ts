// Recommandations Kairo (Distribution, Conversion) : uniquement à partir des chiffres réels fournis, sans estimation inventée.
import { HttpError } from "./http.ts";
import { askJson, log, type Workspace } from "./core.ts";

const LINKS = ["intelligence", "espion", "radar", "prospection", "mesure"];
export async function growthReco(ws: Workspace, page: string, stats: unknown) {
  const what = page === "conversion" ? "transformer davantage de visiteurs du site en demandes (leads), puis en clients" : "attirer plus de clients par les bons canaux d'acquisition";
  const data = JSON.stringify(stats ?? {}).slice(0, 6000);
  if (data.length < 20) throw new HttpError(400, "Pas encore assez de données");
  const pr = ws.profile ?? {};
  const r = await askJson<{ recos: { titre: string; pourquoi: string; action: string; lien: string }[] }>(`Tu conseilles ${pr.nom ?? ws.name} (${pr.offre ?? ""}) pour ${what}.
Voici ses chiffres RÉELS sur les 30 derniers jours (mesurés par Kairo) : ${data}
Donne exactement 3 recommandations, de la plus rentable à la moins rentable.
Règles :
- « pourquoi » cite les chiffres réels ci-dessus qui justifient la recommandation. N'invente aucun chiffre, aucune estimation de gain, aucun pourcentage d'amélioration.
- Si les données sont trop faibles pour conclure (moins de 100 visites ou moins de 5 leads), dis-le et recommande d'abord ce qui permettra d'en avoir.
- « action » : ce qu'il faut faire concrètement cette semaine, en une phrase.
- « lien » : l'outil Kairo qui aide à le faire, parmi : ${LINKS.join(", ")}.
Format : {"recos": [{"titre": "5 mots maximum", "pourquoi": "", "action": "", "lien": ""}]}`, { fast: true, maxTokens: 1500 });
  await log(ws.id, "reco", `Recommandations ${page === "conversion" ? "Conversion" : "Distribution"} mises à jour`);
  return { recos: (r.recos ?? []).slice(0, 3).map((x) => ({ titre: String(x.titre ?? "").slice(0, 60), pourquoi: String(x.pourquoi ?? "").slice(0, 300), action: String(x.action ?? "").slice(0, 240), lien: LINKS.includes(x.lien) ? x.lien : "prospection" })) };
}
