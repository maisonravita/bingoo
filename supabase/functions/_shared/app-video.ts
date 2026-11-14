// Vidéo pub en motion design d'un SaaS construit par Bingoo! : l'IA écrit un scénario court et percutant,
// la page du créateur l'anime (gabarit fixe aux couleurs du SaaS) et l'exporte en vidéo, sans serveur de rendu.
// deno-lint-ignore-file no-explicit-any
import { askJson } from "./core.ts";

const court = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export type ScriptVideo = {
  accroche: string; probleme: string; presentation: string;
  ecrans: { titre: string; detail: string }[]; benefices: string[]; appel: string;
};

export async function saasVideoScript(spec: any, angle = ""): Promise<ScriptVideo> {
  const ecrans = (spec.ecrans ?? []).filter((e: any) => !e.public).map((e: any) => `${e.titre}${e.but ? ` (${String(e.but).slice(0, 80)})` : ""}`).join(" ; ");
  const prompt = `Tu écris le scénario d'une vidéo publicitaire de 20 secondes, en motion design (texte animé, pas de voix), pour le logiciel SaaS « ${spec.nom} ».
Ce qu'il fait : ${spec.pitch ?? ""}
Pour qui : ${spec.cible ?? ""}
Ses écrans : ${ecrans}
${angle ? `Angle voulu par le créateur : ${angle}\n` : ""}
Règles : français, tutoiement, phrases très courtes et concrètes, parle au client final (pas au créateur). Aucune promesse chiffrée inventée (pas de « +50 % », pas de faux avis), pas d'emoji, pas de point d'exclamation en série.
Clés du JSON :
- accroche : la question ou la phrase choc du début, 45 caractères maximum (ex. « Tes devis te prennent ta soirée ? »)
- probleme : la douleur du client, 55 caractères maximum
- presentation : ce que fait ${spec.nom}, en une phrase de 60 caractères maximum, sans répéter le nom
- ecrans : 3 objets { titre (22 caractères max, un vrai écran de la liste), detail (40 caractères max, ce qu'on y fait) }
- benefices : 3 bénéfices concrets, 30 caractères maximum chacun
- appel : l'appel à l'action final, 32 caractères maximum (ex. « Essaie-le dès aujourd'hui »)`;
  const x = await askJson<any>(prompt, { maxTokens: 900 });
  const ec = (Array.isArray(x.ecrans) ? x.ecrans : []).slice(0, 3).map((e: any) => ({ titre: court(e?.titre, 24), detail: court(e?.detail, 44) })).filter((e: any) => e.titre);
  const fallback = (spec.ecrans ?? []).filter((e: any) => !e.public).slice(0, 3).map((e: any) => ({ titre: court(e.titre, 24), detail: "" }));
  const s: ScriptVideo = {
    accroche: court(x.accroche, 50) || `Et si c'était plus simple ?`,
    probleme: court(x.probleme, 60),
    presentation: court(x.presentation, 66) || court(spec.pitch, 66),
    ecrans: ec.length ? ec : fallback,
    benefices: (Array.isArray(x.benefices) ? x.benefices : []).slice(0, 3).map((b: unknown) => court(b, 34)).filter(Boolean),
    appel: court(x.appel, 36) || "Essaie-le dès aujourd'hui",
  };
  if (!s.ecrans.length) throw new Error("Le scénario de la vidéo n'a pas pu être écrit, réessaie");
  return s;
}
