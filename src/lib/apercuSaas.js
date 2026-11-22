// Aperçu d'un SaaS avant construction : l'écran principal de l'idée, écrit avec les vrais composants des SaaS Bingoo!
// (cartes de chiffres, listes, calendrier, colonnes, courbe…) et affiché dans la vraie coque de l'application.
// Aucune IA ici : le code de l'écran est fabriqué à partir des blocs de l'aperçu (données d'exemple de l'idée).

const num = (t) => { const m = String(t ?? "").match(/^\s*([+-]?\s?\d[\d\s.,]*\s?(?:€|%|h|min|kg|km)?)\s+(.*)$/); return m ? [m[1].replace(/\s+(?=%)/, " ").trim(), m[2]] : [null, String(t ?? "")]; };
const decoupe = (t) => { const [a, ...b] = String(t ?? "").split(/\s[·—-]\s|\s:\s/); return { titre: a.trim(), sous: b.join(" · ").trim() }; };

function bloc(b, i) {
  const el = (b.elements ?? []).filter(Boolean).slice(0, 4), titre = b.titre || "";
  const jour = (k) => { const d = new Date(); d.setDate(d.getDate() + k * 2 - 1); return d.toISOString().slice(0, 10); };
  switch (b.type) {
    case "kpi": return { g: "stats", items: el.map((x) => { const [v, l] = num(x); return v ? { label: l, valeur: v } : { label: "", valeur: x }; }) };
    case "graphique": return { g: "carte", titre, k: "ligne", donnees: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((label, j) => ({ label, valeur: [4, 6, 5, 8, 7, 10, 9][j] + (i % 3) })) };
    case "calendrier": return { g: "carte", titre, k: "calendrier", lignes: el.map((x, j) => ({ id: "c" + j, date: jour(j), titre: x })) };
    case "colonnes": return { g: "carte", titre, k: "kanban", colonnes: el.slice(0, 3), lignes: el.slice(0, 3).flatMap((c, j) => [{ id: `k${j}a`, statut: c, titre: `${titre || "Élément"} ${j * 2 + 1}` }, ...(j % 2 ? [] : [{ id: `k${j}b`, statut: c, titre: `${titre || "Élément"} ${j * 2 + 2}` }])]) };
    case "galerie": return { g: "carte", titre, k: "galerie", lignes: el.map((x, j) => ({ id: "g" + j, ...decoupe(x) })) };
    case "chat": return { g: "carte", titre, k: "fil", lignes: el.map((x, j) => ({ id: "f" + j, auteur: j % 2 ? "Camille" : "Client", texte: x })) };
    case "formulaire": return { g: "carte", titre, k: "formulaire", champs: el };
    default: return { g: "carte", titre, k: "liste", lignes: el.map((x, j) => ({ id: "l" + j, ...decoupe(x) })) };
  }
}

/** Le code (format des écrans Bingoo!) de l'écran principal de l'aperçu. */
export function codeEcranApercu(principal) {
  const D = { titre: principal?.titre ?? "Accueil", blocs: (principal?.blocs ?? []).slice(0, 5).map(bloc) };
  // Les chiffres d'abord, puis les blocs deux par deux (le plus grand en premier)
  return `const D = ${JSON.stringify(D)};
function Bloc({ b }) {
  if (b.k === "ligne") return h(ui.Ligne, { donnees: b.donnees });
  if (b.k === "calendrier") return h(ui.Calendrier, { lignes: b.lignes, rendu: (l) => l.titre });
  if (b.k === "kanban") return h(ui.Kanban, { colonnes: b.colonnes, lignes: b.lignes, rendu: (l) => l.titre });
  if (b.k === "galerie") return h(ui.Galerie, { lignes: b.lignes, colonnes: 3 });
  if (b.k === "fil") return h(ui.Fil, { lignes: b.lignes });
  if (b.k === "formulaire") return h("div", { class: "grid gap-3 sm:grid-cols-2" }, b.champs.map((c) => h(ui.Input, { label: c, value: "", onInput: () => {} })), h("div", null, h(ui.Button, null, "Enregistrer")));
  return h(ui.Liste, { lignes: b.lignes, rendu: (l) => ({ titre: l.titre, sous: l.sous }) });
}
function Ecran() {
  const stats = D.blocs.filter((b) => b.g === "stats"), autres = D.blocs.filter((b) => b.g !== "stats");
  return h(ui.Page, { titre: D.titre },
    stats.map((s, i) => h("div", { key: "s" + i, class: "grid grid-cols-2 gap-4 lg:grid-cols-4 mb-5" }, s.items.map((x, j) => h(ui.Stat, { key: j, label: x.label, valeur: x.valeur })))),
    h("div", { class: "grid gap-5 lg:grid-cols-2" }, autres.map((b, i) => h("div", { key: i, class: (b.k === "calendrier" || b.k === "kanban" || (i === 0 && autres.length % 2)) ? "lg:col-span-2" : "" }, h(ui.Card, { titre: b.titre }, h(Bloc, { b }))))));
}`;
}

/** Spec d'application pour l'aperçu : l'écran principal écrit, les autres écrans annoncés (écrits à la construction). */
export function specApercuSaas(nom, ap) {
  const ecrans = (ap.ecrans ?? []).slice(0, 8);
  const principal = ap.principal?.titre ?? ecrans[0]?.titre;
  const idDe = (t, i) => "e" + i + String(t ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 16);
  const iPrincipal = Math.max(0, ecrans.findIndex((e) => e.titre === principal));
  return {
    type: "saas", nom, pitch: ap.pitch ?? "", couleur: ap.design?.couleurs?.primary ?? "#E8571C", design: ap.design ?? undefined, gabarit_app: "taste",
    ecrans: ecrans.map((e, i) => ({
      id: idDe(e.titre, i), titre: e.titre,
      code: i === iPrincipal ? codeEcranApercu(ap.principal) : `function Ecran() { return h(ui.Page, { titre: ${JSON.stringify(e.titre)} }, h(ui.Card, null, h(ui.Empty, { texte: ${JSON.stringify(`Écrit par Bingoo! à la construction : ${e.role ?? ""}`.slice(0, 200))} }))); }`,
    })).sort((a, b) => (a.code.startsWith("const D") ? -1 : b.code.startsWith("const D") ? 1 : 0)),
    demo: {},
  };
}
