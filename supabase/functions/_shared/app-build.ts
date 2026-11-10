// Bingoo! construit le SaaS : à partir d'un projet « Lancer le mien », génère une application qui marche
// (site public, comptes, écrans avec données), hébergée par Bingoo! sur kairo.maisonravita.fr/#/app/<slug>.
// 1. une spec (couleur, données, écrans, données d'exemple) ; 2. le code de chaque écran, en parallèle.
// Le gabarit (src/lib/appShell.js) fournit navigation, comptes, composants et accès aux données.
// deno-lint-ignore-file no-explicit-any
import { admin, ask, askJson } from "./core.ts";

const ICONES = ["accueil", "liste", "contacts", "agenda", "graphique", "reglages", "fichier", "boite", "mail", "carte", "tag", "etoile", "horloge", "panier", "message"];

const DOC = `Tu écris UN écran d'une application web en Preact avec htm (pas de JSX, pas de build). Le code est évalué tel quel.
Écris exactement une fonction nommée Ecran (function Ecran(props) { ... }) et, si besoin, de petites fonctions d'aide au-dessus. Pas d'import, pas d'export.
Variables déjà disponibles (ne les redéclare pas) :
- html : gabarit htm. Composant : html\`<\${ui.Card} titre="…">…</\${ui.Card}>\`. Attributs : class=, onClick=, onInput=, value=. Listes : \${rows.map((r) => html\`<li key=\${r.id}>…</li>\`)}.
- useState, useEffect, useMemo, useRef, useCallback (hooks Preact).
- useCollection(col, where?) → { rows, loading, error, reload, add(data), update(id, data), remove(id) }. Chaque élément a id, created_at, updated_at et ses champs. add/update/remove renvoient une promesse et rafraîchissent automatiquement toutes les vues de la collection. where = égalité simple, ex. { statut: "ouvert" }.
- db.list(col), db.get(col, id), db.add(col, data), db.update(col, id, data), db.remove(col, id) : mêmes données, sans hook.
- user : { id, nom, email } du compte connecté. params : paramètres reçus via go().
- go(idEcran, params?) : ouvre un autre écran de l'application.
- toast(message, "ok"|"bad") : petite notification.
- fmt.eur(n), fmt.num(n), fmt.date(iso), fmt.dateHeure(iso), fmt.pct(n).
- ui.Page({ titre, sous, actions }) : en-tête d'écran + contenu (toujours l'élément racine de l'écran).
- ui.Card({ titre, actions, class }), ui.Stat({ label, valeur, sous, icone }), ui.Badge({ couleur: "vert"|"rouge"|"orange"|"bleu"|"violet"|"gris" }),
  ui.Button({ variant: "primary"|"secondary"|"danger"|"ghost", onClick, type, disabled, icone }), ui.Input({ label, value, onInput(v), type, placeholder, required }) (type "number" renvoie un nombre),
  ui.Textarea({ label, value, onInput(v), rows }), ui.Select({ label, value, onChange(v), options: [[valeur, libellé], …] }),
  ui.Modal({ open, onClose, titre, actions }), ui.Table({ colonnes: [{ cle, label, rendu?(ligne) }], lignes, onClick?(ligne), vide }), ui.Empty({ texte, action }), ui.Loading(), ui.Tabs({ valeur, onChange, onglets: [[v, l]] }), ui.Bar({ donnees: [{ label, valeur }] }), ui.Icone({ nom, class }) avec nom parmi ${ICONES.join(", ")}.
- Tailwind CSS est chargé. Couleur de la marque : classes bg-[var(--c)], text-[var(--c)], border-[var(--c)]. Grilles : grid sm:grid-cols-2 lg:grid-cols-4 gap-4.
Règles : tout en français, tutoiement ; un vrai écran utile et complet (création, modification, suppression avec confirm(), recherche ou filtres quand c'est utile, états vides) ; calcule les indicateurs à partir des données ; jamais de fausses données en dur (les données d'exemple sont déjà dans la base) ; pas de fetch, pas de localStorage, pas de window.parent ; code compact : 180 lignes au plus, pas de commentaires, pas de répétition (factorise les formulaires dans une petite fonction).`;

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "saas";

export function nouveauSlug(nom: string) {
  return `${slugify(nom)}-${crypto.getRandomValues(new Uint8Array(3)).reduce((a, b) => a + b.toString(36).padStart(2, "0"), "").slice(0, 4)}`;
}

const etape = (id: string, t: string) => admin.from("saas_apps").update({ etape: t, maj: new Date().toISOString() }).eq("id", id);

// Le code doit au moins se lire (une erreur de syntaxe casserait l'écran)
function erreurSyntaxe(code: string): string | null {
  try { new Function("ctx", code); return null; } catch (e) { return e instanceof SyntaxError ? e.message : null; }
}
function extraire(t: string) {
  const f = [...t.matchAll(/```(?:js|javascript|jsx)?\s*([\s\S]*?)```/g)].map((m) => m[1]).sort((a, b) => b.length - a.length)[0];
  return (f ?? t).trim();
}

function contexteSpec(spec: any) {
  return `Application « ${spec.nom} » : ${spec.pitch}
Pour : ${spec.cible ?? ""}
Collections (données) : ${(spec.collections ?? []).map((c: any) => `${c.nom} (${c.label}) : ${(c.champs ?? []).map((x: any) => `${x.nom} ${x.type}${x.valeurs ? ` [${x.valeurs.join("|")}]` : ""}`).join(", ")}`).join(" ; ")}
Écrans de l'application (id : titre) : ${(spec.ecrans ?? []).map((e: any) => `${e.id} : ${e.titre}`).join(" ; ")}`;
}

async function ecrire(spec: any, e: any, demande = "", actuel = "") {
  const consigne = actuel
    ? `Voici le code actuel de l'écran « ${e.titre} » (${e.id}) :\n\`\`\`js\n${actuel}\n\`\`\`\nModification demandée par l'utilisateur : ${demande}\nRéécris l'écran complet avec cette modification, sans rien casser du reste.`
    : `Écris l'écran « ${e.titre} » (id ${e.id}). Ce qu'il doit faire : ${e.but}\nFonctions à couvrir : ${(e.fonctions ?? []).join(" ; ")}`;
  const prompt = `${DOC}\n\n${contexteSpec(spec)}\n\n${consigne}\n\nRéponds uniquement avec le code dans un bloc \`\`\`js.`;
  let code = extraire(await ask(prompt, { maxTokens: 12000, system: "Tu es un excellent développeur front-end. Tu écris du code Preact + htm propre, robuste et lisible, avec une interface soignée." }));
  let err = erreurSyntaxe(code);
  if (err || !/function\s+Ecran\s*\(/.test(code)) {
    code = extraire(await ask(`${prompt}\n\nTa première version ne marchait pas (${err ?? "pas de fonction Ecran"}). Corrige-la :\n\`\`\`js\n${code}\n\`\`\``, { maxTokens: 12000, fast: true }));
    err = erreurSyntaxe(code);
  }
  return { code, ok: !err && /function\s+Ecran\s*\(/.test(code) };
}

// Étape 1 (une invocation) : la spec, écrite dans le brouillon. Étape 2 : un appel par écran, chacun dans sa propre invocation
// (une invocation est limitée à environ 150 secondes, un écran en prend 40 à 90).
export async function saasConstruire(appId: string, lancerEcran: (ecranId: string) => Promise<void>) {
  const { data: app } = await admin.from("saas_apps").select("id, projet_id").eq("id", appId).single();
  const { data: pr } = await admin.from("saas_projets").select("data").eq("id", app!.projet_id).single();
  const p = (pr?.data ?? {}) as any;
  await etape(appId, "Conception des données et des écrans");
  const s = await askJson<any>(`Tu conçois la première version d'un SaaS qui va être générée automatiquement et mise en ligne.
SaaS : « ${p.nom} » — ${p.pitch}
Pour : ${p.cible}
Besoin : ${p.probleme}
Fonctionnalités (équivalentes à ${p.inspire?.nom ?? "un SaaS qui marche"}) : ${(p.equivalences ?? []).map((x: any) => x.chez_toi).join(" ; ")}
MVP dans l'ordre : ${(p.mvp ?? []).map((m: any) => m.fonction).join(" ; ")}

Rends un objet JSON compact :
- couleur : couleur de marque en hexadécimal (#xxxxxx), assez foncée pour du texte blanc dessus, PAS celle de ${p.inspire?.nom ?? "l'inspiration"}.
- slogan : titre du site, 8 mots au plus, percutant ; cible_courte : 5 mots (« Pour les … »).
- atouts : 6 objets titre + texte (une phrase courte), tirés des fonctionnalités.
- collections : 2 à 5 objets nom (snake_case, pluriel), label, champs : 4 à 8 objets nom (snake_case) + type (texte|nombre|montant|date|choix|booleen|email|telephone|lien) + valeurs (pour choix seulement). Les liens entre collections : un champ <collection>_id de type texte.
- ecrans : 4 à 6 objets id (snake_case court), titre (2 mots au plus), icone (parmi ${ICONES.join(", ")}), but (une phrase), fonctions (3 à 5 éléments courts). Le premier écran est « Tableau de bord » (indicateurs et activité récente). Couvre le cœur du MVP ; pas d'écran de connexion, de paiement ni de réglages de compte (le gabarit les gère).
- demo : objet { <collection> : 5 éléments réalistes en français (entreprises et personnes fictives, montants et dates cohérents en 2026) } ; les champs <collection>_id pointent vers le champ « ref » (ex. "c1") que tu ajoutes à chaque élément.`, { maxTokens: 12000 });

  const spec: any = {
    nom: p.nom, pitch: p.pitch, cible: p.cible, probleme: p.probleme,
    couleur: /^#[0-9a-f]{6}$/i.test(s.couleur ?? "") ? s.couleur : "#4F46E5",
    slogan: String(s.slogan ?? p.pitch ?? "").slice(0, 90), cible_courte: String(s.cible_courte ?? "").slice(0, 60),
    atouts: (s.atouts ?? []).slice(0, 6), formules: (p.formules ?? []).slice(0, 3),
    collections: (s.collections ?? []).slice(0, 6),
    ecrans: (s.ecrans ?? []).slice(0, 6).map((e: any, i: number) => ({ id: slugify(String(e.id ?? `ecran-${i}`)).replace(/-/g, "_") || `ecran_${i}`, titre: String(e.titre ?? `Écran ${i + 1}`).slice(0, 24), icone: ICONES.includes(e.icone) ? e.icone : "liste", but: e.but, fonctions: e.fonctions })),
    demo: s.demo ?? {},
  };
  spec.ecrans = spec.ecrans.filter((e: any, i: number) => spec.ecrans.findIndex((x: any) => x.id === e.id) === i);
  if (!spec.ecrans.length) throw new Error("La conception de l'application a échoué, réessaie");
  await admin.from("saas_apps").update({ brouillon: spec, etape: `Écriture des écrans (0/${spec.ecrans.length})`, maj: new Date().toISOString() }).eq("id", appId);
  for (const e of spec.ecrans) await lancerEcran(e.id);
}

/** Étape 2 : écrit un écran du brouillon (appelée une fois par écran, en parallèle). */
export async function saasEcrireEcran(appId: string, ecranId: string) {
  const { data: app } = await admin.from("saas_apps").select("brouillon").eq("id", appId).single();
  const spec = app?.brouillon as any;
  const e = spec?.ecrans?.find((x: any) => x.id === ecranId);
  if (!e) return;
  const r = await ecrire(spec, e).catch((x) => { console.error("ecran", ecranId, x); return { code: "", ok: false }; });
  await admin.rpc("saas_app_ecran_set", { p_app: appId, p_id: ecranId, p_code: r.code, p_ok: r.ok });
}

/** Modifie un écran à la demande (ou en ajoute un si ecranId = "nouveau"). */
export async function saasModifierEcran(appId: string, ecranId: string, demande: string) {
  const { data: app } = await admin.from("saas_apps").select("spec, version").eq("id", appId).single();
  const spec = (app?.spec ?? {}) as any;
  let e = (spec.ecrans ?? []).find((x: any) => x.id === ecranId);
  if (ecranId === "nouveau") {
    const n = await askJson<any>(`${contexteSpec(spec)}\nL'utilisateur veut un nouvel écran : ${demande}\nRends un objet JSON id (snake_case court, différent des écrans existants), titre (2 mots au plus), icone (parmi ${ICONES.join(", ")}), but, fonctions (3 à 6), collection (null, ou un nouvel objet nom + label + champs si l'écran a besoin de données qui n'existent pas encore).`, { fast: true });
    e = { id: slugify(String(n.id ?? "ecran")).replace(/-/g, "_"), titre: String(n.titre ?? "Nouvel écran").slice(0, 24), icone: ICONES.includes(n.icone) ? n.icone : "liste", but: n.but, fonctions: n.fonctions };
    if ((spec.ecrans ?? []).some((x: any) => x.id === e.id)) e.id += "_2";
    if (n.collection?.nom && !(spec.collections ?? []).some((c: any) => c.nom === n.collection.nom)) spec.collections = [...(spec.collections ?? []), n.collection];
    spec.ecrans = [...(spec.ecrans ?? []), e];
    const r = await ecrire(spec, e);
    Object.assign(e, r);
  } else {
    if (!e) throw new Error("Écran introuvable");
    const r = await ecrire(spec, e, demande, e.code);
    if (!r.ok) throw new Error("La modification n'a pas pu être écrite correctement, reformule ta demande");
    Object.assign(e, r);
  }
  await admin.from("saas_apps").update({ spec, statut: "pret", etape: null, erreur: null, version: (app?.version ?? 0) + 1, maj: new Date().toISOString() }).eq("id", appId);
}
