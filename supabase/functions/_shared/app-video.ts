// Vidéo pub en motion design d'un SaaS construit par Bingoo! : l'IA écrit un scénario court et percutant,
// la page du créateur l'anime (gabarit fixe aux couleurs du SaaS) et l'exporte en vidéo, sans serveur de rendu.
// deno-lint-ignore-file no-explicit-any
import { askJson } from "./core.ts";

const court = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export type ScriptVideo = {
  accroche: string; probleme: string; presentation: string;
  ecrans: { titre: string; detail: string }[]; benefices: string[]; appel: string;
  couleur?: string; note?: string;
};

export async function saasVideoScript(spec: any, angle = "", ctx: { scan?: any; cible?: any } = {}): Promise<ScriptVideo> {
  const ecrans = (spec.ecrans ?? []).filter((e: any) => !e.public).map((e: any) => `${e.titre}${e.but ? ` (${String(e.but).slice(0, 80)})` : ""}`).join(" ; ");
  const prompt = `Tu écris le scénario d'une vidéo publicitaire de 20 secondes, en motion design (texte animé, pas de voix), pour le logiciel SaaS « ${spec.nom} ».
Ce qu'il fait : ${spec.pitch ?? ""}
Pour qui : ${spec.cible ?? ""}
Ses écrans : ${ecrans}
${angle ? `Angle voulu par le créateur : ${angle}\n` : ""}${ctx.cible?.qui ? `Le client visé en premier : ${ctx.cible.qui} — ${ctx.cible.pourquoi ?? ""}\n` : ""}${ctx.scan?.objections?.length ? `Ce qui fait hésiter ces clients : ${ctx.scan.objections.map((o: any) => o.q).join(" ; ")}\n` : ""}${ctx.scan?.vocabulaire?.length ? `Leurs mots : ${ctx.scan.vocabulaire.slice(0, 10).join(", ")}\n` : ""}
Écris pour CE client précis : l'accroche nomme sa situation concrète avec ses mots (pas une généralité), le problème est une scène de sa journée, les bénéfices répondent à ce qui le fait hésiter. Ne promets que ce que font les écrans listés.
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

/** Retouche à la demande : le créateur écrit ce qu'il veut changer, l'IA réécrit le scénario existant en gardant le même gabarit. */
export async function saasVideoRetouche(spec: any, script: ScriptVideo, demande: string): Promise<ScriptVideo> {
  const ecrans = (spec.ecrans ?? []).filter((e: any) => !e.public).map((e: any) => e.titre).join(" ; ");
  const prompt = `Voici le scénario actuel d'une vidéo publicitaire de 20 secondes en motion design (texte animé, pas de voix) pour le logiciel « ${spec.nom} » (${spec.pitch ?? ""}).
Scénario actuel (JSON) : ${JSON.stringify({ accroche: script.accroche, probleme: script.probleme, presentation: script.presentation, ecrans: script.ecrans, benefices: script.benefices, appel: script.appel, couleur: script.couleur ?? spec.couleur ?? null })}
Écrans qui existent vraiment : ${ecrans}

Le créateur demande : « ${demande} »

Applique sa demande en changeant le moins possible le reste. Tu peux changer les textes, le ton, l'ordre des écrans (parmi la liste), les bénéfices, l'appel à l'action et la couleur principale (code hexadécimal, seulement s'il le demande).
Tu ne peux pas : ajouter une voix, une vraie personne, un logo d'une autre marque, de la musique précise, des écrans qui n'existent pas, des chiffres ou des avis inventés. Si une partie de la demande est impossible, fais le reste et explique-le dans « note » en une phrase courte, en tutoyant ; sinon note est vide.
Règles : français, tutoiement, phrases très courtes, pas d'emoji. Limites : accroche 45 caractères, probleme 55, presentation 60, ecrans 3 objets { titre 22, detail 40 }, benefices 3 de 30, appel 32.
Réponds avec le JSON complet : accroche, probleme, presentation, ecrans, benefices, appel, couleur, note.`;
  const x = await askJson<any>(prompt, { maxTokens: 900 });
  const ec = (Array.isArray(x.ecrans) ? x.ecrans : []).slice(0, 3).map((e: any) => ({ titre: court(e?.titre, 24), detail: court(e?.detail, 44) })).filter((e: any) => e.titre);
  const couleur = /^#[0-9a-f]{6}$/i.test(String(x.couleur ?? "")) ? String(x.couleur) : script.couleur;
  return {
    accroche: court(x.accroche, 50) || script.accroche,
    probleme: court(x.probleme, 60) || script.probleme,
    presentation: court(x.presentation, 66) || script.presentation,
    ecrans: ec.length ? ec : script.ecrans,
    benefices: (Array.isArray(x.benefices) ? x.benefices : []).slice(0, 3).map((b: unknown) => court(b, 34)).filter(Boolean).length ? (x.benefices as unknown[]).slice(0, 3).map((b) => court(b, 34)).filter(Boolean) : script.benefices,
    appel: court(x.appel, 36) || script.appel,
    ...(couleur ? { couleur } : {}),
    ...(court(x.note, 200) ? { note: court(x.note, 200) } : {}),
  };
}
