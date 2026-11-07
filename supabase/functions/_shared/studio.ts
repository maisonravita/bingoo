// Bingoo! Studio : contenus marketing prêts à publier, fondés sur ce que l'entreprise sait vraiment d'elle-même.
import { HttpError } from "./http.ts";
import { admin, askJson, knowledgeOf, log, type Workspace } from "./core.ts";

const TYPES: Record<string, { label: string; format: string }> = {
  social: { label: "Publication réseaux sociaux", format: `"texte": "légende prête à publier (avec retours à la ligne)", "hashtags": ["#…"], "visuel": {"surtitre": "1 à 2 mots", "titre": "6 à 10 mots percutants", "points": ["3 bénéfices de 1 à 3 mots"], "bouton": "appel à l'action, 2 à 5 mots"}` },
  video: { label: "Vidéo courte (TikTok, Reels, Shorts)", format: `"accroche": "les 2 premières secondes", "scenes": [{"temps": "0-3 s", "image": "ce qu'on voit", "texte_ecran": "", "voix": ""}], "texte": "légende", "hashtags": ["#…"], "visuel": {"surtitre": "", "titre": "titre de la miniature", "points": [], "bouton": ""}` },
  pub: { label: "Publicité (image et textes)", format: `"texte": "texte principal de l'annonce", "titres": ["3 titres courts (40 caractères max)"], "descriptions": ["2 descriptions (90 caractères max)"], "visuel": {"surtitre": "", "titre": "", "points": [""], "bouton": ""}` },
  article: { label: "Article SEO (blog)", format: `"titre": "titre H1", "meta": "méta-description (155 caractères max)", "mot_cle": "requête principale visée", "texte": "article complet en Markdown (## sous-titres), 700 à 1000 mots", "visuel": {"surtitre": "Blog", "titre": "", "points": [], "bouton": "Lire l'article"}` },
  email: { label: "Email marketing", format: `"objet": "", "preheader": "", "texte": "corps de l'e-mail", "visuel": {"surtitre": "", "titre": "", "points": [""], "bouton": ""}` },
  page: { label: "Page de vente", format: `"titre": "promesse principale (H1)", "texte": "page complète en Markdown : promesse, problème, solution, bénéfices, déroulé, preuves, offre, FAQ, appel à l'action", "visuel": {"surtitre": "", "titre": "", "points": [""], "bouton": ""}` },
  script: { label: "Script vidéo", format: `"accroche": "", "texte": "script complet minuté, avec indications de plan entre crochets", "visuel": {"surtitre": "", "titre": "", "points": [], "bouton": ""}` },
  autre: { label: "Contenu libre", format: `"texte": "", "visuel": {"surtitre": "", "titre": "", "points": [""], "bouton": ""}` },
};

export async function studioGenerate(ws: Workspace, b: Record<string, unknown>) {
  const type = TYPES[String(b.type)] ? String(b.type) : "social";
  const brief = String(b.brief ?? "").trim().slice(0, 500);
  if (brief.length < 8) throw new HttpError(400, "Décris en une phrase le contenu que tu veux");
  const ton = String(b.ton ?? "Professionnel et engageant").slice(0, 60);
  const langue = String(b.langue ?? "Français").slice(0, 30);
  const objectif = String(b.objectif ?? "").slice(0, 60);
  const reseau = String(b.reseau ?? "").slice(0, 30);
  const pr = ws.profile ?? {};
  const know = knowledgeOf(ws);
  const r = await askJson<Record<string, unknown>>(`Crée un contenu marketing pour ${pr.nom ?? ws.name}.
Type : ${TYPES[type].label}${reseau ? ` (${reseau})` : ""}
Demande : « ${brief} »
Ton : ${ton} · Langue : ${langue}${objectif ? ` · Objectif : ${objectif}` : ""}

CE QUE L'ENTREPRISE EST (seule source de faits) :
${pr.resume ?? ""}
Offre : ${pr.offre ?? ""} · Ce qui la distingue : ${pr.differenciation ?? ""} · Preuves : ${(pr.preuves ?? []).join(" ; ") || "aucune"}
${know ? `Fiche : ${know}` : ""}

Règles :
- N'invente aucun chiffre, résultat, client, témoignage, prix, label ou garantie. Si un élément de preuve serait utile mais n'est pas fourni, écris-le entre crochets à compléter, ex. [chiffre clé], [prénom du client].
- Écris pour le lecteur visé, phrases courtes, concret, sans jargon ni superlatifs vides.
- Le visuel doit tenir sur une image carrée : textes très courts.
- variantes : 2 autres versions de l'accroche ou du titre, d'angle différent.
- conseil : un conseil concret pour améliorer ce contenu avant publication.
Format : {${TYPES[type].format}, "variantes": ["", ""], "conseil": ""}`,
    { maxTokens: type === "article" || type === "page" ? 9000 : 3500, system: `Tu es un directeur de création et rédacteur marketing francophone senior. Tu écris en ${langue}. Tu n'inventes jamais de faits.` });
  if (!r || typeof r !== "object" || (!r.texte && !r.visuel)) throw new HttpError(502, "La génération est revenue incomplète, réessaie");
  const { data, error } = await admin.from("studio_items").insert({ workspace_id: ws.id, type, brief, params: { ton, langue, objectif, reseau }, output: r }).select("*").single();
  if (error) throw new HttpError(500, error.message);
  await log(ws.id, "studio", `${TYPES[type].label} : ${brief.slice(0, 60)}`);
  return data;
}
