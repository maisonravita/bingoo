// Stratégie par compte (comptes stratégiques) : plusieurs interlocuteurs, un angle par personne, un plan sur 6 semaines.
// Uniquement à partir de ce qui est connu (fiche, signaux, enquête, décideurs trouvés) : jamais de nom inventé.
import { admin, askJson, type Prospect, type Workspace } from "./core.ts";
import { HttpError } from "./http.ts";

export type PlanCompte = {
  pourquoi: string;
  interlocuteurs: { qui: string; role: string; connu: boolean; angle: string }[];
  semaines: { semaine: number; action: string; canal: string; pour: string }[];
  risque: string; at: string;
};

export async function planCompte(ws: Workspace, p: Prospect): Promise<PlanCompte> {
  const { data: contacts } = await admin.from("contacts").select("name, role").eq("prospect_id", p.id).limit(8);
  const t = (ws.targets ?? []).find((x) => x.id === p.target);
  const prof = (ws.profile ?? {}) as Record<string, unknown>;
  const connus = [p.contact_name ? `${p.contact_name} (${p.contact_role || "dirigeant"})` : "", ...(contacts ?? []).map((c) => `${c.name} (${c.role || "?"})`)].filter(Boolean);
  const r = await askJson<Omit<PlanCompte, "at">>(`Prépare un plan de compte sur 6 semaines pour obtenir un rendez-vous avec cette entreprise, jugée stratégique.
Notre offre : ${String(prof.offre ?? "")}
Entreprise : ${p.name}, ${p.activity ?? ""}, ${p.city ?? ""}.
Faits publics : ${((p.signals ?? []) as { label?: string }[]).map((x) => x.label).filter(Boolean).slice(0, 8).join(" ; ") || "aucun"}
Enquête : ${(p.insight as { resume?: string } | null)?.resume ?? "aucune"}
Interlocuteurs CONNUS (noms réels) : ${connus.join(" ; ") || "aucun"}
Interlocuteur habituel de la cible : ${t?.interlocuteur ?? "dirigeant"}

Règles : 2 à 4 interlocuteurs. Pour un interlocuteur connu, reprends son nom exact (connu: true). Pour un rôle à trouver, mets qui = "à trouver" et connu: false, jamais de nom inventé.
Un angle différent par personne (ce qui compte pour SON poste). 6 semaines, une action par semaine (canaux : e-mail, LinkedIn, appel, courrier), du dirigeant vers les autres.
Le risque principal du compte en une phrase.
JSON : {"pourquoi": "", "interlocuteurs": [{"qui": "", "role": "", "connu": true, "angle": ""}], "semaines": [{"semaine": 1, "action": "", "canal": "", "pour": ""}], "risque": ""}`, { fast: true, maxTokens: 1400 });
  const vrais = new Set(connus.map((c) => c.split(" (")[0].toLowerCase()));
  const plan: PlanCompte = {
    pourquoi: String(r.pourquoi ?? "").slice(0, 400),
    interlocuteurs: (r.interlocuteurs ?? []).slice(0, 4).map((i) => {
      const connu = !!i.connu && vrais.has(String(i.qui ?? "").toLowerCase());
      return { qui: connu ? String(i.qui) : "à trouver", role: String(i.role ?? "").slice(0, 80), connu, angle: String(i.angle ?? "").slice(0, 300) };
    }),
    semaines: (r.semaines ?? []).slice(0, 6).map((s, k) => ({ semaine: k + 1, action: String(s.action ?? "").slice(0, 240), canal: String(s.canal ?? "").slice(0, 30), pour: String(s.pour ?? "").slice(0, 80) })),
    risque: String(r.risque ?? "").slice(0, 300), at: new Date().toISOString(),
  };
  if (!plan.semaines.length) throw new HttpError(502, "Plan de compte incomplet, réessaie");
  const insight = { ...((p.insight ?? {}) as Record<string, unknown>), plan_compte: plan };
  await admin.from("prospects").update({ insight, strategique: true }).eq("id", p.id);
  return plan;
}
