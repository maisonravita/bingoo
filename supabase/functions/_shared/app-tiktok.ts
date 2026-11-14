// TikTok pour un SaaS construit par Bingoo! : des comptes et vidéos réels à étudier (recherche web, liens tiktok.com seulement),
// et des formats de vidéos adaptés au SaaS (accroche, déroulé, pourquoi ça marche). Mis en cache 14 jours par application.
// deno-lint-ignore-file no-explicit-any
import { admin, askJson } from "./core.ts";

const court = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const lienTikTok = (u: unknown) => { const s = String(u ?? "").trim(); return /^https:\/\/(www\.|vm\.|m\.)?tiktok\.com\//i.test(s) ? s.split("?")[0] : null; };

export async function saasTikTok(app: any, projet: any, refaire = false) {
  if (!refaire) {
    const { data } = await admin.from("saas_tiktok").select("data, at").eq("app_id", app.id).maybeSingle();
    if (data && Date.now() - new Date(data.at).getTime() < 14 * 864e5) return { ...data.data, at: data.at };
  }
  const spec = app.spec ?? {};
  const modele = projet?.inspire?.nom ?? projet?.inspire?.domaine ?? "";
  const qui = `« ${spec.nom ?? projet?.nom} » : ${spec.pitch ?? projet?.pitch ?? ""}. Pour : ${spec.cible ?? projet?.cible ?? ""}. Inspiré de ${modele} (${projet?.inspire?.domaine ?? ""}), catégorie ${projet?.inspire?.categorie ?? ""}.`;

  const [trouve, formats] = await Promise.all([
    askJson<any>(`Tu aides le créateur d'un logiciel SaaS à réussir sur TikTok. Son SaaS : ${qui}
Cherche sur le web (TikTok est indexé par les moteurs de recherche) :
1. le compte TikTok officiel de ${modele} s'il existe ;
2. des comptes TikTok de logiciels concurrents ou proches qui publient régulièrement ;
3. des vidéos TikTok de la même niche qui ont beaucoup de vues (le problème de ces clients, des démos d'outils, des créateurs qui en parlent), en français ou en anglais.
Règles strictes : ne donne QUE des liens tiktok.com que tu as vus dans les résultats de recherche, jamais un lien inventé ou reconstruit. Si tu ne trouves rien de sûr, renvoie des listes vides. Les nombres (abonnés, vues) seulement s'ils apparaissent dans les résultats, sinon null.
JSON : { "comptes": [{ "nom": "", "url": "", "abonnes": "texte ou null", "pourquoi": "ce qu'il fait bien, 1 phrase en français" }], "videos": [{ "titre": "", "url": "", "vues": "texte ou null", "pourquoi": "pourquoi elle a marché, 1 phrase en français" }] } (5 de chaque au plus)`,
      { fast: true, maxTokens: 2500, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }] }).catch(() => ({ comptes: [], videos: [] })),
    askJson<any>(`Tu es un expert des vidéos TikTok qui font connaître des logiciels SaaS sans budget publicitaire. Son SaaS : ${qui}
Propose 6 formats de vidéos courtes adaptés à CE SaaS et à SES clients (pas des conseils génériques), du plus facile au plus ambitieux. Pour chacun :
- format : le nom du format (ex. « Avant / après », « POV », « 3 erreurs que… », « Je teste pendant 7 jours », « Démo en 15 secondes », « Histoire d'un client »)
- accroche : la phrase exacte affichée à l'écran les 2 premières secondes, 70 caractères maximum, en français, tutoiement, qui arrête le pouce
- deroule : 3 étapes courtes de la vidéo (tableau de 3 phrases)
- pourquoi : pourquoi ce format marche pour ce public, 1 phrase
- duree : durée conseillée en secondes (nombre)
Sans emoji, sans promesse de revenus chiffrée.
JSON : { "formats": [ ... ], "conseils": ["3 conseils concrets de publication pour ce public : fréquence, heure, ton"] }`, { fast: true, maxTokens: 2500 }).catch(() => ({ formats: [], conseils: [] })),
  ]);

  const data = {
    comptes: (Array.isArray(trouve?.comptes) ? trouve.comptes : []).map((c: any) => ({ nom: court(c.nom, 60), url: lienTikTok(c.url), abonnes: c.abonnes ? court(c.abonnes, 30) : null, pourquoi: court(c.pourquoi, 200) })).filter((c: any) => c.url).slice(0, 5),
    videos: (Array.isArray(trouve?.videos) ? trouve.videos : []).map((v: any) => ({ titre: court(v.titre, 120), url: lienTikTok(v.url), vues: v.vues ? court(v.vues, 30) : null, pourquoi: court(v.pourquoi, 200) })).filter((v: any) => v.url).slice(0, 5),
    formats: (Array.isArray(formats?.formats) ? formats.formats : []).slice(0, 6).map((f: any) => ({ format: court(f.format, 50), accroche: court(f.accroche, 90), deroule: (Array.isArray(f.deroule) ? f.deroule : []).slice(0, 3).map((x: unknown) => court(x, 160)), pourquoi: court(f.pourquoi, 200), duree: Math.max(7, Math.min(90, Number(f.duree) || 20)) })).filter((f: any) => f.accroche),
    conseils: (Array.isArray(formats?.conseils) ? formats.conseils : []).slice(0, 3).map((x: unknown) => court(x, 200)),
  };
  if (!data.formats.length && !data.comptes.length && !data.videos.length) throw new Error("La recherche n'a rien donné, réessaie dans un instant");
  await admin.from("saas_tiktok").upsert({ app_id: app.id, workspace_id: app.workspace_id, data, at: new Date().toISOString() });
  return { ...data, at: new Date().toISOString() };
}
