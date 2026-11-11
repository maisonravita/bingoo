// Bingoo! construit le SaaS : à partir d'un projet « Lancer le mien », génère une application qui marche
// (site public, comptes, écrans avec données), hébergée par Bingoo! sur kairo.maisonravita.fr/#/app/<slug>.
// 1. une spec (couleur, données, écrans, données d'exemple) ; 2. le code de chaque écran, en parallèle.
// Le gabarit (src/lib/appShell.js) fournit navigation, comptes, composants et accès aux données.
// deno-lint-ignore-file no-explicit-any
import { admin, ask, askJson } from "./core.ts";
import { sansIdentite } from "./identite.ts";

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
- Envoyer un e-mail à quelqu'un (client, prospect…) : ouvre la messagerie de l'utilisateur avec un lien mailto: prérempli (destinataire, objet, texte encodés avec encodeURIComponent), puis enregistre l'envoi dans la collection. N'affirme jamais qu'un e-mail ou un SMS est parti tout seul.
- ia(consigne, { texte?, json? }) → Promise : l'IA intégrée de l'application (rédiger, reformuler, résumer, traduire, analyser, classer, générer des idées ou un document). Renvoie du texte, ou un objet si json: true (décris alors la forme attendue dans la consigne). Pendant l'appel, désactive le bouton et affiche « … en cours » ; en cas d'erreur, toast(e.message, "bad"). Enregistre le résultat dans une collection quand l'utilisateur voudra le retrouver. N'utilise ia que si la fonctionnalité en a vraiment besoin.
- fmt.eur(n), fmt.num(n), fmt.date(iso), fmt.dateHeure(iso), fmt.pct(n).
- ui.Page({ titre, sous, actions }) : en-tête d'écran + contenu (toujours l'élément racine de l'écran).
- ui.Card({ titre, actions, class }), ui.Stat({ label, valeur, sous, icone }), ui.Badge({ couleur: "vert"|"rouge"|"orange"|"bleu"|"violet"|"gris" }),
  ui.Button({ variant: "primary"|"secondary"|"danger"|"ghost", onClick, type, disabled, icone }), ui.Input({ label, value, onInput(v), type, placeholder, required }) (type "number" renvoie un nombre),
  ui.Textarea({ label, value, onInput(v), rows }), ui.Select({ label, value, onChange(v), options: [[valeur, libellé], …] }),
  ui.Modal({ open, onClose, titre, actions }), ui.Table({ colonnes: [{ cle, label, rendu?(ligne) }], lignes, onClick?(ligne), vide }), ui.Empty({ texte, action }), ui.Loading(), ui.Tabs({ valeur, onChange, onglets: [[v, l]] }), ui.Bar({ donnees: [{ label, valeur }] }), ui.Icone({ nom, class }) avec nom parmi ${ICONES.join(", ")}.
- Tailwind CSS est chargé. Couleur de la marque : classes bg-[var(--c)], text-[var(--c)], border-[var(--c)]. Grilles : grid sm:grid-cols-2 lg:grid-cols-4 gap-4.
Règles : tout en français, tutoiement ; un vrai écran utile et complet (création, modification, suppression avec confirm(), recherche ou filtres quand c'est utile, états vides) ; calcule les indicateurs à partir des données ; jamais de fausses données en dur (les données d'exemple sont déjà dans la base) ; pas de fetch, pas de localStorage, pas de window.parent ; code compact : 180 lignes au plus, pas de commentaires, pas de répétition (factorise les formulaires dans une petite fonction).`;

// Page publique : ouverte par les clients de l'utilisateur, sans compte
const DOC_PUBLIC = (e: any) => `

IMPORTANT : cet écran est une PAGE PUBLIQUE, ouverte sans compte par les clients de l'utilisateur (lien qu'il leur partage). Pas de menu autour : la page se suffit à elle-même.
- user vaut null. props.espace : nom de l'entreprise de l'utilisateur s'il est connu (peut être vide).
- Lecture possible seulement avec db.list ou useCollection sur : ${(e.lecture ?? []).join(", ") || "aucune collection"} (n'affiche que ce qui sert au visiteur ; si la collection a un champ booléen publie ou visible, ne montre que les éléments où il vaut true — c'est déjà filtré côté serveur).
- Écriture possible seulement avec db.add dans : ${e.ecriture ?? "aucune collection"}. Pas de update, pas de remove, pas de ia.
- Mise en page : en-tête avec le titre et une phrase claire, puis le formulaire ou la liste, en une colonne lisible sur téléphone (max-w-xl mx-auto). Après l'envoi, un message de confirmation chaleureux à la place du formulaire. Champs obligatoires vérifiés avant l'envoi ; adresse e-mail du visiteur demandée quand l'utilisateur devra lui répondre.
- Réservation : propose seulement des créneaux libres (calculés à partir des disponibilités et des réservations déjà prises), jamais dans le passé.`;

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
Écrans de l'application (id : titre) : ${(spec.ecrans ?? []).filter((e: any) => !e.public).map((e: any) => `${e.id} : ${e.titre}`).join(" ; ")}${(spec.ecrans ?? []).some((e: any) => e.public) ? `
Pages publiques (pour les clients de l'utilisateur, sans compte ; leur lien à partager est déjà affiché dans le menu de l'application) : ${(spec.ecrans ?? []).filter((e: any) => e.public).map((e: any) => `${e.titre} (enregistre dans ${e.ecriture ?? "rien"})`).join(" ; ")}. Dans l'application, les éléments reçus par ces pages ont le champ _public = true : signale-les (badge « Reçu en ligne »).` : ""}`;
}

async function ecrire(spec: any, e: any, demande = "", actuel = "") {
  const consigne = actuel
    ? `Voici le code actuel de l'écran « ${e.titre} » (${e.id}) :\n\`\`\`js\n${actuel}\n\`\`\`\nModification demandée par l'utilisateur : ${demande}\nRéécris l'écran complet avec cette modification, sans rien casser du reste.`
    : `Écris l'écran « ${e.titre} » (id ${e.id}). Ce qu'il doit faire : ${e.but}\nFonctions à couvrir : ${(e.fonctions ?? []).join(" ; ")}${demande ? `\nPrécision de l'utilisateur : ${demande}` : ""}`;
  const prompt = `${DOC}${e.public ? DOC_PUBLIC(e) : ""}\n\n${contexteSpec(spec)}\n\n${consigne}\n\nRéponds uniquement avec le code dans un bloc \`\`\`js.`;
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
- ecrans : 4 à 6 objets id (snake_case court), titre (2 mots au plus), icone (parmi ${ICONES.join(", ")}), but (une phrase), fonctions (3 à 5 éléments courts). Le premier écran est « Tableau de bord » (indicateurs et activité récente). Couvre le cœur du MVP ; pas d'écran de connexion, de paiement ni de réglages de compte (le gabarit les gère). L'application dispose d'une IA intégrée (rédiger, reformuler, résumer, analyser, générer un document) : si le SaaS d'origine repose sur l'IA, l'écran principal doit la faire fonctionner pour de vrai (saisie → résultat → sauvegarde dans une collection). Elle ne sait pas produire d'images, de vidéos ni de sons, ni se connecter à des services extérieurs.
- pages_publiques : 0 à 2 objets id (snake_case court), titre (3 mots au plus), but (une phrase), fonctions (3 à 5), lecture (collections que la page montre au visiteur, ex. créneaux, prestations, témoignages publiés ; peut être vide), ecriture (UNE collection où la page enregistre ce que le visiteur envoie : réservation, demande, témoignage, commande, inscription, réponse). Une page publique est ouverte par les clients de l'utilisateur, sans compte, depuis un lien qu'il partage. N'en mets que si le SaaS sert à recevoir quelque chose de ces clients (prise de rendez-vous, formulaire, avis, devis, commande, inscription, sondage) ; sinon une liste vide. Dans ce cas, ne crée PAS d'écran de l'application qui imite cette page : l'application affiche déjà son lien à partager.
- demo : objet { <collection> : 5 éléments réalistes en français (entreprises et personnes fictives, montants cohérents, dates réparties entre ${new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10)} et ${new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10)}, aujourd'hui = ${new Date().toISOString().slice(0, 10)}) } ; les champs <collection>_id pointent vers le champ « ref » (ex. "c1") que tu ajoutes à chaque élément.`, { maxTokens: 12000 });

  const spec: any = {
    nom: p.nom, pitch: p.pitch, cible: p.cible, probleme: p.probleme,
    couleur: /^#[0-9a-f]{6}$/i.test(s.couleur ?? "") ? s.couleur : "#4F46E5",
    slogan: String(s.slogan ?? p.pitch ?? "").slice(0, 90), cible_courte: String(s.cible_courte ?? "").slice(0, 60),
    atouts: (s.atouts ?? []).slice(0, 6), formules: (p.formules ?? []).slice(0, 3),
    collections: (s.collections ?? []).slice(0, 6),
    ecrans: (s.ecrans ?? []).slice(0, 6).map((e: any, i: number) => ({ id: slugify(String(e.id ?? `ecran-${i}`)).replace(/-/g, "_") || `ecran_${i}`, titre: String(e.titre ?? `Écran ${i + 1}`).slice(0, 24), icone: ICONES.includes(e.icone) ? e.icone : "liste", but: e.but, fonctions: e.fonctions })),
    demo: s.demo ?? {},
  };
  // Pages publiques (réservation, formulaire, avis…) : écrites comme des écrans, servies sans compte
  const cols = new Set(spec.collections.map((c: any) => c.nom));
  for (const [i, x] of (s.pages_publiques ?? []).slice(0, 2).entries()) {
    const ecriture = cols.has(x?.ecriture) ? x.ecriture : null;
    // La collection d'écriture est toujours lisible (sans les coordonnées des autres visiteurs) : créneaux déjà pris, doublons…
    const lecture = [...new Set([...(Array.isArray(x?.lecture) ? x.lecture : []).filter((c: any) => cols.has(c)), ...(ecriture ? [ecriture] : [])])].slice(0, 4);
    if (!ecriture && !lecture.length) continue;
    spec.ecrans.push({ id: `pub_${slugify(String(x.id ?? i)).replace(/-/g, "_")}`, titre: String(x.titre ?? "Page publique").slice(0, 30), icone: "carte", but: x.but, fonctions: x.fonctions, public: true, lecture, ecriture });
  }
  spec.ecrans = spec.ecrans.filter((e: any, i: number) => spec.ecrans.findIndex((x: any) => x.id === e.id) === i);
  // Garde-fou : rien du SaaS d'origine (nom, domaine) dans ce que verront les clients
  const { ecrans: _e, ...visible } = spec;
  Object.assign(spec, sansIdentite(visible, p.inspire ?? {}, p.nom).valeur);
  if (!spec.ecrans.length) throw new Error("La conception de l'application a échoué, réessaie");
  await admin.from("saas_apps").update({ brouillon: spec, etape: `Écriture des écrans (0/${spec.ecrans.length})`, maj: new Date().toISOString() }).eq("id", appId);
  for (const e of spec.ecrans) await lancerEcran(e.id);
}

async function inspireDe(appId: string) {
  const { data: a } = await admin.from("saas_apps").select("projet_id").eq("id", appId).single();
  const { data: pr } = await admin.from("saas_projets").select("data").eq("id", a!.projet_id).single();
  return ((pr?.data as any)?.inspire ?? {}) as { nom?: string; domaine?: string };
}

/** Étape 2 : écrit un écran du brouillon (appelée une fois par écran, en parallèle). */
export async function saasEcrireEcran(appId: string, ecranId: string) {
  const { data: app } = await admin.from("saas_apps").select("brouillon").eq("id", appId).single();
  const spec = app?.brouillon as any;
  const e = spec?.ecrans?.find((x: any) => x.id === ecranId);
  if (!e) return;
  const r = await ecrire(spec, e).catch((x) => { console.error("ecran", ecranId, x); return { code: "", ok: false }; });
  r.code = await inspireDe(appId).then((o) => sansIdentite(r.code, o, spec.nom).valeur);
  await admin.rpc("saas_app_ecran_set", { p_app: appId, p_id: ecranId, p_code: r.code, p_ok: r.ok });
}

/** Modifie un écran à la demande (ou en ajoute un si ecranId = "nouveau"). */
// La modification s'écrit dans le brouillon (aperçu) : le créateur la voit, puis la met en ligne ou l'abandonne.
export async function saasModifierEcran(appId: string, ecranId: string, demande: string, suggestion: string | null = null) {
  // Une modification déjà en attente d'aperçu : la nouvelle s'ajoute par-dessus (on met en ligne le tout)
  const { data: app } = await admin.from("saas_apps").select("spec, brouillon, version").eq("id", appId).single();
  const enAttente = (app?.brouillon as any)?._modif ? (app!.brouillon as any) : null;
  const spec = structuredClone(enAttente ?? (app?.spec ?? {})) as any;
  const avant = enAttente?._modif?.liste ?? (enAttente?._modif ? [enAttente._modif] : []);
  delete spec._modif;
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
  e.code = sansIdentite(e.code, await inspireDe(appId), spec.nom).valeur;
  const m = { demande, ecran: e.id, titre: e.titre, nouveau: ecranId === "nouveau", suggestion, at: new Date().toISOString() };
  spec._modif = { ...m, liste: [...avant.map(({ liste: _l, ...x }: any) => x), m] };
  await admin.from("saas_apps").update({ brouillon: spec, statut: "pret", etape: null, erreur: null, maj: new Date().toISOString() }).eq("id", appId);
}

/** Réparation après la vérification : l'écran plante ou n'a pas été écrit ; on le réécrit avec l'erreur constatée. */
export async function saasReparerEcran(appId: string, ecranId: string, erreur: string) {
  const { data: app } = await admin.from("saas_apps").select("spec").eq("id", appId).single();
  const spec = app?.spec as any;
  const e = spec?.ecrans?.find((x: any) => x.id === ecranId);
  if (!e) return false;
  const r = e.code
    ? await ecrire(spec, e, `L'écran ne fonctionne pas à l'ouverture, avec les données d'exemple : « ${erreur.slice(0, 300)} ». Trouve la cause (donnée absente, champ d'un autre type que prévu, composant ui mal utilisé, variable non définie) et corrige-la sans changer ce que fait l'écran. Protège chaque accès aux données (valeurs absentes, listes vides).`, e.code)
    : await ecrire(spec, e);
  if (!r.ok) return false;
  await admin.rpc("saas_app_code_set", { p_app: appId, p_id: ecranId, p_code: sansIdentite(r.code, await inspireDe(appId), spec.nom).valeur });
  return true;
}
