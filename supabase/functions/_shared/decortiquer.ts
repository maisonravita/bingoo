// « Décortiquer ce SaaS » : l'analyse REA des pages publiques (scripts/explorer/decortiquer.cjs, tâche GitHub)
// est résumée ici par l'IA en fonctionnalités, parcours, tarifs et plan pour lancer sa propre version.
// Règle : on décrit ce que fait le logiciel (une idée ou une fonction ne se protège pas), jamais son code,
// ses textes ou ses visuels, qui restent la propriété de son éditeur.
import { admin, askJson, setAi } from "./core.ts";

export const domaineNet = (d: string) => String(d ?? "").toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/?#].*$/, "").slice(0, 120);

type Page = { url: string; titre: string; visible?: { h?: string[]; boutons?: string[]; formulaires?: string[][]; texte?: string }; rea?: { routes?: string[]; api?: string[]; techno?: string[]; scripts?: number | null } };

export async function synthese(domaine: string) {
  const { data: row } = await admin.from("saas_decortique").select("domaine, rea, demande_par").eq("domaine", domaine).maybeSingle();
  const pages: Page[] = (row?.rea as any)?.pages ?? [];
  if (!pages.length) throw new Error("Aucune page analysée");
  const routes = [...new Set(pages.flatMap((p) => p.rea?.routes ?? []))].slice(0, 90);
  const api = [...new Set(pages.flatMap((p) => p.rea?.api ?? []))].slice(0, 60);
  const techno = [...new Set(pages.flatMap((p) => p.rea?.techno ?? []))].slice(0, 20);
  const corps = pages.map((p) => `### ${p.url}\nTitre : ${p.titre}\nTitres : ${(p.visible?.h ?? []).slice(0, 25).join(" | ")}\nBoutons : ${(p.visible?.boutons ?? []).slice(0, 25).join(" | ")}\nFormulaires : ${JSON.stringify(p.visible?.formulaires ?? []).slice(0, 300)}\nTexte visible : ${String(p.visible?.texte ?? "").slice(0, 2600)}`).join("\n\n");
  setAi({ ws: row?.demande_par ?? undefined, live: true, feature: "decortiquer" });
  const r = await askJson<any>(`Tu analyses le SaaS ${domaine} à partir de ce qu'un visiteur voit sur ses pages publiques, et de ce que l'outil REA (analyse passive du navigateur) a relevé dans son JavaScript public : routes de l'application, points d'API et technologies.
But : aider un créateur à comprendre comment ce logiciel fonctionne pour lancer SA PROPRE version, avec ses propres textes, son propre design et son propre code.

Règles :
- Décris les fonctionnalités et le parcours avec tes mots, en français, en tutoyant le lecteur. Ne recopie jamais de phrases de leur site (au plus un nom de fonction ou de formule).
- Appuie chaque fonctionnalité sur une preuve courte : la page, un bouton, une route (ex. /dashboard/forms) ou un point d'API (ex. POST /api/forms).
- Les routes et points d'API sont des indices relevés dans le code public : ils montrent ce qui existe dans l'application, pas comment c'est codé.
- N'invente rien : si une information manque, ne la donne pas.

Pages publiques :
${corps}

Relevé REA :
Routes : ${routes.join(" , ")}
Points d'API : ${api.join(" , ")}
Technologies : ${techno.join(" , ")}

Réponds en JSON, clés :
resume (2 phrases : ce que fait le logiciel et pour qui),
fonctionnalites (8 à 14 objets {nom, detail (une phrase), preuve}),
parcours (5 à 8 étapes, de l'arrivée sur le site à l'utilisation payante, chacune une phrase),
tarifs (liste {formule, prix, inclus} si visibles, sinon liste vide),
arguments (3 à 6 arguments de vente qu'ils mettent en avant, reformulés),
integrations (liste de noms d'outils connectés, si visibles),
technologies (liste courte de noms de technologies, ex. React, Next.js, Stripe, d'après le relevé REA ; jamais de libellé interne de l'outil comme vendor_fingerprint, ni de route ; liste vide si rien de sûr),
plan (objet {indispensables : 5 à 7 fonctions pour une première version, pour_faire_mieux : 3 à 5 idées pour te démarquer}).`, { maxTokens: 3500 });
  const resultat = { ...r, source: { outil: "REA", pages: pages.map((p) => p.url), routes: routes.length, api: api.length } };
  await admin.from("saas_decortique").update({ statut: "fait", resultat, fait_at: new Date().toISOString(), erreur: null }).eq("domaine", domaine);
  return resultat;
}

/** Tâche minute : résume les analyses REA arrivées (2 par passage). */
export async function syntheseCron() {
  const { data } = await admin.from("saas_decortique").select("domaine").eq("statut", "analyse").order("at").limit(2);
  const out: Record<string, string> = {};
  for (const { domaine } of data ?? []) {
    try { await synthese(domaine); out[domaine] = "fait"; }
    catch (e) {
      out[domaine] = String((e as Error).message).slice(0, 120);
      await admin.from("saas_decortique").update({ erreur: out[domaine] }).eq("domaine", domaine);
    }
  }
  return out;
}
