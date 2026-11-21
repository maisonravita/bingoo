// Apparence d'un site ou d'un SaaS : tout ce qui change son allure, rien de son contenu (textes, prix, écrans).
// Règle (Jean, 21/11) : avant tout changement de design d'un site existant, on garde l'apparence précédente et
// le membre peut y revenir en un clic, sans perdre les textes ou prix modifiés depuis (contrairement au retour
// à une version complète). Les 5 dernières apparences sont gardées dans spec.designs_precedents.

const CLES = ["design", "design_avant", "couleur", "style", "fond", "forme", "police", "police_titres", "disposition"] as const;
const MAX = 5;

// deno-lint-ignore no-explicit-any
type Spec = Record<string, any>;

export function apparence(spec: Spec): Spec {
  const a: Spec = {};
  for (const k of CLES) if (spec?.[k] !== undefined) a[k] = structuredClone(spec[k]);
  a.gabarit = spec?.site?.gabarit ?? null;
  return a;
}

const pareil = (a: Spec, b: Spec) => JSON.stringify(a) === JSON.stringify(b);

// Après une modification : si l'apparence a changé, l'ancienne est mise de côté (la plus récente en premier)
export function garderApparence(avant: Spec, apres: Spec, raison: string): Spec {
  const a = apparence(avant);
  if (pareil(a, apparence(apres))) return apres;
  const liste = [{ apparence: a, at: new Date().toISOString(), raison: raison.slice(0, 80) }, ...(avant.designs_precedents ?? [])].slice(0, MAX);
  return { ...apres, designs_precedents: liste };
}

function poser(spec: Spec, a: Spec): Spec {
  const n: Spec = { ...spec };
  for (const k of CLES) { if (a[k] === undefined) delete n[k]; else n[k] = structuredClone(a[k]); }
  const site = { ...(n.site ?? {}) };
  if (a.gabarit) site.gabarit = a.gabarit; else delete site.gabarit;
  if (n.site || a.gabarit) n.site = site;
  return n;
}

// Retour au design précédent. L'apparence quittée prend sa place en tête de liste : un second clic annule le retour.
export function revenirApparence(spec: Spec): Spec | null {
  const [prec, ...reste] = spec.designs_precedents ?? [];
  if (!prec?.apparence) return null;
  const n = poser(spec, prec.apparence);
  n.designs_precedents = [{ apparence: apparence(spec), at: new Date().toISOString(), raison: "Avant le retour au design précédent" }, ...reste].slice(0, MAX);
  return n;
}

// Résumé pour l'espace gérant
export const resumeApparences = (spec: Spec) => (spec.designs_precedents ?? []).map((d: Spec) => ({
  at: d.at, raison: d.raison,
  couleur: d.apparence?.design?.couleurs?.primary ?? d.apparence?.couleur ?? null,
  style: d.apparence?.design?.style ?? d.apparence?.style ?? null,
}));
