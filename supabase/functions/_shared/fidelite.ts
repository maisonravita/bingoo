// Règles de fidélité à la famille de logiciel (sans IA), partagées par la construction (src : app-build) et la vérification
// (scripts/verif-apps.mjs). Les connaître dès l'écriture évite qu'un écran parte en réparation après coup.
// Contrôle de fidélité (sans IA) : le SaaS ressemble-t-il à sa famille de logiciel, ou à un logiciel de gestion habillé ?
// Seulement pour les SaaS conçus avec une famille (les plus anciens ne sont pas concernés). Chaque écart part en réparation avec sa consigne.
export const SIGNATURE: Record<string, [RegExp, string]> = {
  edition: [/ui\.(Editeur|Toile|ConstructeurFormulaire|EditeurVitrine)\b/, "le vrai espace de création du produit : un éditeur de documents (ui.Editeur), une toile de création graphique (ui.Toile) ou un constructeur de formulaires (ui.ConstructeurFormulaire), selon ce que fait le produit d'origine"],
  ia: [/ui\.Chat|\bia\(/, "l'interaction IA du produit (ui.Chat pour une conversation, ou une grande zone de saisie avec un résultat généré par ia())"],
  projets: [/ui\.(Kanban|Tableau)\b/, "un tableau de colonnes personnalisables et de cartes déplaçables (ui.Kanban avec les colonnes du tableau ouvert)"],
  communaute: [/ui\.Fil/, "un fil de publications des membres (ui.Fil) avec une zone pour publier"],
  contenu: [/ui\.(Galerie|EditeurVitrine|Vitrine)\b/, "une galerie de cartes (ui.Galerie) avec recherche et filtres"],
  reservation: [/ui\.Calendrier|ui\.Creneaux/, "un vrai calendrier des réservations (ui.Calendrier)"],
};
/** L'écran qui porte le calendrier (agenda, planning, réservations, disponibilités) : un seul par logiciel. */
export function ecranCalendrier(spec: any): string | null {
  const prives = (spec?.ecrans ?? []).filter((e: any) => !e.public);
  const re = /agenda|calendrier|planning|disponibilit|r[ée]servations?$|cr[ée]neaux|rendez-vous/i;
  return (prives.find((e: any) => re.test(`${e.id} ${e.titre}`)) ?? prives.find((e: any) => re.test(e.but ?? "")))?.id ?? null;
}
/** Un calendrier répété sur plusieurs écrans : seul l'écran de l'agenda le garde. */
function calendrierUnique(spec: any, out: Record<string, string>) {
  const avec = (spec?.ecrans ?? []).filter((e: any) => !e.public && e.code && /ui\.Calendrier\b/.test(e.code));
  if (avec.length < 2) return;
  const garde = avec.find((e: any) => e.id === ecranCalendrier(spec)) ?? avec[0];
  for (const e of avec) if (e.id !== garde.id && !out[e.id])
    out[e.id] = `Logique : le calendrier est déjà sur l'écran « ${garde.titre} ». Retire ui.Calendrier de cet écran et garde seulement ce qui lui est propre (une liste, des cartes, un lien vers « ${garde.titre} » si utile).`;
}

export function fidelite(spec: any, FAMILLES: any): Record<string, string> {
  const f = spec?.famille, F = FAMILLES[f];
  if (!F) { const o: Record<string, string> = {}; calendrierUnique(spec, o); return o; }
  const ecrans = (spec.ecrans ?? []).filter((e: any) => !e.public && e.code), out: Record<string, string> = {};
  const ref = spec.nature?.espace_principal ? ` L'espace principal du produit d'origine : ${spec.nature.espace_principal}.` : "";
  const premier = ecrans[0];
  if (premier && !["gestion", "analyse"].includes(f)) {
    const stats = (premier.code.match(/ui\.Stat\b/g) ?? []).length;
    if (/tableau de bord/i.test(premier.titre ?? "") || /ui\.Table\b/.test(premier.code) || stats >= 3)
      out[premier.id] = `Fidélité : cet écran d'accueil ressemble à un logiciel de gestion (tableau ou rangée d'indicateurs). Pour un logiciel de la famille « ${F.label} », le premier écran est : ${F.accueil}.${ref} Réécris-le comme cet espace principal, sans ui.Table ni rangée de ui.Stat, et change son titre s'il dit « Tableau de bord ».`;
  }
  const sig = SIGNATURE[f];
  if (sig && !ecrans.some((e: any) => sig[0].test(e.code)) && premier && !out[premier.id])
    out[premier.id] = `Fidélité : il manque ce qui définit un logiciel de la famille « ${F.label} » : ${sig[1]}.${ref} Ajoute-le à cet écran, il doit vraiment fonctionner et enregistrer ses données.`;
  calendrierUnique(spec, out);
  for (const e of ecrans.slice(1)) if (!["gestion", "analyse", "crm", "reservation"].includes(f) && /ui\.Table\b/.test(e.code) && !out[e.id])
    out[e.id] = `Fidélité : un tableau de données n'a pas sa place dans un logiciel de la famille « ${F.label} ». Remplace ui.Table par les composants de la famille (${F.guide.split("\n")[1]?.slice(2, 220) ?? ""}).`;
  return out;
}


/** Consigne donnée à l'IA AVANT d'écrire un écran : ce que la vérification exigera de lui. */
export function consigneFidelite(spec: any, e: any, FAMILLES: any): string {
  const f = spec?.famille, F = FAMILLES[f]; if (e?.public) return "";
  const prives = (spec.ecrans ?? []).filter((x: any) => !x.public), premier = prives[0]?.id === e.id, out: string[] = [];
  const cal = ecranCalendrier(spec);
  if (cal && cal !== e.id) out.push(`N'utilise PAS ui.Calendrier : le calendrier du logiciel est sur l'écran « ${prives.find((x: any) => x.id === cal)?.titre} », et nulle part ailleurs.`);
  if (!F) return out.length ? `\n\nEXIGENCES VÉRIFIÉES AUTOMATIQUEMENT (un écran qui ne les respecte pas est refusé) :\n- ${out.join("\n- ")}` : "";
  if (premier && !["gestion", "analyse"].includes(f)) {
    out.push(`C'est l'ÉCRAN D'ACCUEIL d'un logiciel de la famille « ${F.label} » : ${F.accueil}. Il ne doit PAS ressembler à un logiciel de gestion : pas de ui.Table, au plus 2 ui.Stat, pas de titre « Tableau de bord ».`);
    const sig = SIGNATURE[f]; if (sig) out.push(`Il DOIT contenir ${sig[1]}, qui fonctionne vraiment et enregistre ses données.`);
  } else if (!["gestion", "analyse", "crm", "reservation"].includes(f)) out.push(`N'utilise pas ui.Table : ce n'est pas un logiciel de gestion (famille « ${F.label} »).`);
  return out.length ? `\n\nEXIGENCES VÉRIFIÉES AUTOMATIQUEMENT (un écran qui ne les respecte pas est refusé) :\n- ${out.join("\n- ")}` : "";
}
