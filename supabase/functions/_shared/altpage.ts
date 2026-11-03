// Espion : page « Alternative à [concurrent] » pour le site du client.
// Rédigée à partir du dossier concurrent (faits sourcés uniquement) et du profil du client.
// Règles de la publicité comparative (Code de la consommation, art. L122-1 et suivants) : comparaison objective, vérifiable,
// sur des caractéristiques essentielles et comparables, sans dénigrement ni confusion. Les visiteurs de cette page sont repérés par le Radar.
import { HttpError } from "./http.ts";
import { admin, askJson, type Workspace } from "./core.ts";

export type AltPage = {
  slug: string; titre: string; meta: string; h1: string; intro: string;
  raisons: { titre: string; texte: string; source?: string }[];
  comparatif: { critere: string; nous: string; eux: string; source?: string }[];
  changer: string[]; faq: { q: string; r: string }[]; appel: string; avertissement: string;
  html?: string; at?: string;
};

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** HTML autonome, prêt à coller dans une page du site (styles inclus, sobres). */
export function altHtml(p: AltPage, brand: string, trackSnippet: string) {
  return `<!-- Page générée par Bingoo · Espion : à relire avant publication -->
<section class="bg-alt" style="max-width:860px;margin:0 auto;padding:32px 20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1917;line-height:1.6">
  <h1 style="font-size:2rem;line-height:1.2;margin:0 0 12px">${esc(p.h1)}</h1>
  <p style="font-size:1.1rem;color:#44403c">${esc(p.intro)}</p>
  <h2 style="margin-top:32px">Pourquoi des entreprises cherchent une alternative</h2>
  ${p.raisons.map((r) => `<h3 style="margin:18px 0 4px">${esc(r.titre)}</h3><p style="margin:0">${esc(r.texte)}${r.source ? ` <a href="${esc(r.source)}" rel="nofollow noopener" target="_blank" style="color:#78716c;font-size:.85em">(source)</a>` : ""}</p>`).join("\n  ")}
  <h2 style="margin-top:32px">Comparatif</h2>
  <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.95rem">
    <thead><tr><th style="text-align:left;padding:10px;border-bottom:2px solid #e7e5e4">Critère</th><th style="text-align:left;padding:10px;border-bottom:2px solid #e7e5e4">${esc(brand)}</th><th style="text-align:left;padding:10px;border-bottom:2px solid #e7e5e4">L'autre solution</th></tr></thead>
    <tbody>${p.comparatif.map((c) => `<tr><td style="padding:10px;border-bottom:1px solid #e7e5e4;font-weight:600">${esc(c.critere)}</td><td style="padding:10px;border-bottom:1px solid #e7e5e4">${esc(c.nous)}</td><td style="padding:10px;border-bottom:1px solid #e7e5e4">${esc(c.eux)}${c.source ? ` <a href="${esc(c.source)}" rel="nofollow noopener" target="_blank" style="color:#78716c;font-size:.85em">(source)</a>` : ""}</td></tr>`).join("")}</tbody>
  </table></div>
  <h2 style="margin-top:32px">Changer, concrètement</h2>
  <ol>${p.changer.map((x) => `<li style="margin:6px 0">${esc(x)}</li>`).join("")}</ol>
  <h2 style="margin-top:32px">Questions fréquentes</h2>
  ${p.faq.map((f) => `<details style="border-bottom:1px solid #e7e5e4;padding:10px 0"><summary style="font-weight:600;cursor:pointer">${esc(f.q)}</summary><p style="margin:8px 0 0">${esc(f.r)}</p></details>`).join("\n  ")}
  <p style="margin-top:32px;font-size:1.1rem;font-weight:600">${esc(p.appel)}</p>
  <p style="margin-top:24px;font-size:.8rem;color:#78716c">${esc(p.avertissement)}</p>
</section>
${trackSnippet}`;
}

/** Rédige (ou relit) la page à partir du dossier Espion. */
export async function altPage(ws: Workspace & { track_key?: string | null }, competitorId: string, force = false) {
  const { data: c } = await admin.from("competitors").select("id, name, url, summary, alt_page").eq("workspace_id", ws.id).eq("id", competitorId).single();
  if (!c) throw new HttpError(404, "Concurrent introuvable");
  if (c.alt_page && !force) return c.alt_page as AltPage;
  if (!c.summary) throw new HttpError(400, "Le dossier de ce concurrent n'est pas encore prêt : lance d'abord l'analyse.");
  const rival = String(c.name || "").replace(/\s*[—(].*$/, "").trim();
  const pr = ws.profile ?? {};
  const brand = pr.nom || ws.name;
  const dossier = JSON.stringify(c.summary).slice(0, 14000);
  const p = await askJson<AltPage>(`Tu rédiges, pour le site de ${brand}, une page « Alternative à ${rival} » destinée aux entreprises qui cherchent une autre solution que ${rival} sur Google.

Ce que vend ${brand} : ${pr.offre ?? ""}
Ce qui le distingue : ${pr.differenciation ?? ""}
Preuves vérifiées de ${brand} : ${(pr.preuves ?? []).join(" ; ") || "aucune"}
Dossier sur ${rival} (faits sourcés et hypothèses signalées) : ${dossier}

RÈGLES STRICTES (publicité comparative, droit français) :
- Seulement des faits présents dans le dossier (pour ${rival}) ou dans le profil (pour ${brand}). Rien d'inventé : pas de chiffre, de prix, de client ou de fonctionnalité absents des données.
- Comparaison objective et vérifiable, sur des critères essentiels et comparables (prix affichés, fonctionnalités, engagement, accompagnement, avis clients publics). Ne compare pas ce qui n'est pas connu : écris « Non communiqué ».
- Aucun dénigrement, aucun terme insultant ou alarmiste, aucune affirmation sur la qualité de ${rival} qui ne soit pas sourcée. Les avis négatifs sont présentés comme des retours d'utilisateurs, avec leur source, au conditionnel si besoin.
- Pas de confusion : il est clair que ${brand} est une autre entreprise, sans lien avec ${rival}.
- Ton : celui de ${brand} (${pr.ton ?? "sobre"}), en français, phrases courtes, concret.
- "source" : l'URL exacte du dossier quand le fait vient du dossier ; sinon vide.

Format :
{"slug": "alternative-a-${slugify(rival)}", "titre": "balise title, 60 caractères max, contient « Alternative à ${rival} »", "meta": "meta description, 155 caractères max",
 "h1": "", "intro": "2 phrases", "raisons": [{"titre": "", "texte": "", "source": ""}],
 "comparatif": [{"critere": "", "nous": "", "eux": "", "source": ""}], "changer": ["étape concrète pour passer chez ${brand}"],
 "faq": [{"q": "", "r": ""}], "appel": "phrase d'appel à l'action", "avertissement": "mention : marques citées appartenant à leurs propriétaires, informations publiques à la date du ${new Date().toLocaleDateString("fr-FR")}, sources indiquées"}`, { maxTokens: 5000 });
  const page: AltPage = {
    slug: slugify(p.slug || `alternative-a-${rival}`), titre: String(p.titre ?? "").slice(0, 70), meta: String(p.meta ?? "").slice(0, 170), h1: String(p.h1 ?? `Alternative à ${rival}`), intro: String(p.intro ?? ""),
    raisons: (p.raisons ?? []).slice(0, 5), comparatif: (p.comparatif ?? []).slice(0, 10), changer: (p.changer ?? []).slice(0, 6), faq: (p.faq ?? []).slice(0, 6),
    appel: String(p.appel ?? ""), avertissement: String(p.avertissement ?? ""), at: new Date().toISOString(),
  };
  const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/t`;
  page.html = altHtml(page, brand, ws.track_key ? `<script defer src="${base}/kairo.js" data-k="${ws.track_key}"></script>` : "");
  await admin.from("competitors").update({ alt_page: page }).eq("id", c.id);
  return page;
}
