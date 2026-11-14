// Bingoo! construit le SaaS : à partir d'un projet « Lancer le même », génère une application qui marche
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
- email({ a, sujet, texte, bouton?, lien?, quand?, repeter? }) → Promise { id, quand } : envoie un vrai e-mail au client de l'utilisateur (confirmation, devis, relance…), au nom de l'utilisateur (les réponses lui arrivent). quand = date ISO pour un envoi plus tard (rappel la veille d'un rendez-vous, relance à J+7) ; repeter = "jour" | "semaine" | "mois" pour un envoi régulier. Garde l'id renvoyé dans l'élément (champ rappel_id…) pour pouvoir l'annuler avec annulerEmail(id) si le rendez-vous est annulé ou déplacé. emailsEnvoyes() → la liste des e-mails (a, sujet, statut attente|envoye|erreur|annule, quand). Pas de SMS (ne les propose pas).
- pdf({ titre, sousTitre?, emetteur?: { titre, lignes: [] }, destinataire?: { titre, lignes: [] }, lignes?: [[libellé, valeur]], tableau?: { colonnes: [], lignes: [[]] }, totaux?: [[libellé, valeur]], paragraphes?: [], signature?, mentions?, nomFichier? }) → télécharge un document PDF propre aux couleurs de l'app (devis, facture, bail, contrat, attestation, compte rendu, bon de commande). Formate montants et dates avec fmt avant de les passer.
- ui.Fichier({ label, value, onChange(fichier|null), accept? }) : envoi d'une photo, d'un PDF ou d'un logo (4,5 Mo au plus). onChange reçoit { id, url, nom, type, taille } : enregistre cet objet tel quel dans un champ de l'élément, et affiche l'image avec <img src=\${f.url}> ou un lien vers le fichier.
- lienAgenda() → Promise<url> : lien d'abonnement à ajouter dans Google Agenda ou Outlook (le menu de l'application propose déjà « Ajouter à mon agenda » ; ne refais pas ce bouton).
- ia(consigne, { texte?, json? }) → Promise : l'IA intégrée de l'application (rédiger, reformuler, résumer, traduire, analyser, classer, générer des idées ou un document). Renvoie du texte, ou un objet si json: true (décris alors la forme attendue dans la consigne). Pendant l'appel, désactive le bouton et affiche « … en cours » ; en cas d'erreur, toast(e.message, "bad"). Enregistre le résultat dans une collection quand l'utilisateur voudra le retrouver. N'utilise ia que si la fonctionnalité en a vraiment besoin.
- fmt.eur(n), fmt.num(n), fmt.date(iso), fmt.dateHeure(iso), fmt.pct(n).
- ui.Page({ titre, sous, actions }) : en-tête d'écran + contenu (toujours l'élément racine de l'écran).
- ui.Card({ titre, actions, class }), ui.Stat({ label, valeur, sous, icone }), ui.Badge({ couleur: "vert"|"rouge"|"orange"|"bleu"|"violet"|"gris" }),
  ui.Button({ variant: "primary"|"secondary"|"danger"|"ghost", onClick, type, disabled, icone }), ui.Input({ label, value, onInput(v), type, placeholder, required }) (type "number" renvoie un nombre),
  ui.Textarea({ label, value, onInput(v), rows }), ui.Select({ label, value, onChange(v), options: [[valeur, libellé], …] }),
  ui.Modal({ open, onClose, titre, actions }), ui.Table({ colonnes: [{ cle, label, rendu?(ligne) }], lignes, onClick?(ligne), vide }), ui.Empty({ texte, action }), ui.Loading(), ui.Tabs({ valeur, onChange, onglets: [[v, l]] }), ui.Bar({ donnees: [{ label, valeur }] }), ui.Ligne({ donnees: [{ label, valeur }] }) (évolution dans le temps), ui.Donut({ donnees: [{ label, valeur }] }) (répartition), ui.Progress({ valeur, max, label }),
  ui.Calendrier({ lignes, champ: "date", rendu?(ligne), onClick?(ligne), onJour?(dateISO) }) (vue du mois, pour tout ce qui est daté), ui.Kanban({ colonnes: [[valeur, libellé], …], lignes, champ: "statut", onDeplacer(id, valeur), rendu?(ligne), onClick?(ligne) }) (suivi par étapes, glisser-déposer), ui.Icone({ nom, class }) avec nom parmi ${ICONES.join(", ")}.
- Tailwind CSS est chargé. Couleur de la marque : classes bg-[var(--c)], text-[var(--c)], border-[var(--c)]. Grilles : grid sm:grid-cols-2 lg:grid-cols-4 gap-4.
Le tableau ui.Table ajoute déjà tout seul la recherche, le tri, l'export et la pagination, et met en forme dates, nombres et statuts : ne les refais pas. Choisis la bonne vue : un calendrier pour ce qui est daté, des colonnes Kanban pour ce qui avance par étapes, un tableau pour le reste, et au moins un graphique sur un tableau de bord.
Règles : tout en français, tutoiement ; un vrai écran utile et complet (création, modification, suppression avec confirm(), recherche ou filtres quand c'est utile, états vides) ; calcule les indicateurs à partir des données ; jamais de fausses données en dur (les données d'exemple sont déjà dans la base) ; pas de fetch, pas de localStorage, pas de window.parent ; code compact : 180 lignes au plus, pas de commentaires, pas de répétition (factorise les formulaires dans une petite fonction).`;

// Page publique : ouverte par les clients de l'utilisateur, sans compte
const DOC_PUBLIC = (e: any) => `

IMPORTANT : cet écran est une PAGE PUBLIQUE, ouverte sans compte par les clients de l'utilisateur (lien qu'il leur partage). Pas de menu autour : la page se suffit à elle-même.
- user vaut null. props.espace : nom de l'entreprise de l'utilisateur s'il est connu (peut être vide).
- Lecture possible seulement avec db.list ou useCollection sur : ${(e.lecture ?? []).join(", ") || "aucune collection"} (n'affiche que ce qui sert au visiteur ; si la collection a un champ booléen publie ou visible, ne montre que les éléments où il vaut true — c'est déjà filtré côté serveur).
- Écriture possible seulement avec db.add dans : ${e.ecriture ?? "aucune collection"}. Pas de update, pas de remove, pas de ia, pas de email.
- E-mails au visiteur : db.add(col, donnees, { confirmation: { sujet, texte }, rappels: [{ quand: date ISO, sujet, texte }] }) envoie une confirmation tout de suite et jusqu'à 2 rappels (ex. la veille d'un rendez-vous à la même heure) à l'adresse e-mail qu'il vient de saisir. Utilise-le dès qu'il y a une réservation, une commande ou une demande.
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
  const { data: av } = await admin.from("saas_apps").select("etape").eq("id", appId).single();
  const suffixe = /2e essai/.test(String(av?.etape ?? "")) ? " (2e essai)" : "";
  await etape(appId, `Conception des données et des écrans${suffixe}`);
  const s = await askJson<any>(`Tu conçois la première version d'un SaaS qui va être générée automatiquement et mise en ligne.
SaaS : « ${p.nom} » — ${p.pitch}
Pour : ${p.cible}
Besoin : ${p.probleme}
Fonctionnalités (équivalentes à ${p.inspire?.nom ?? "un SaaS qui marche"}) : ${(p.equivalences ?? []).map((x: any) => x.chez_toi).join(" ; ")}
MVP dans l'ordre : ${(p.mvp ?? []).map((m: any) => m.fonction).join(" ; ")}

Rends un objet JSON compact :
- couleur : couleur de marque en hexadécimal (#xxxxxx), assez foncée pour du texte blanc dessus, PAS celle de ${p.inspire?.nom ?? "l'inspiration"}.
- slogan : titre du site, 8 mots au plus, percutant ; cible_courte : 5 mots (« Pour les … »).
- pitch_site : la phrase sous le titre du site, 35 mots au plus. Elle ne promet QUE ce que cette première version fait vraiment (écrans, pages publiques, IA texte) : pas de synchronisation d'agenda, d'envoi de SMS, d'intégration à un autre logiciel ni de chiffres inventés. Les atouts suivent la même règle.
- formules : reprends EXACTEMENT ces formules (même nom, même prix, même « pour ») : ${JSON.stringify((p.formules ?? []).slice(0, 3).map((f: any) => ({ nom: f.nom, prix: f.prix, pour: f.pour })))}, avec pour chacune « inclus » : 3 à 5 avantages qui ne citent QUE ce que cette première version fait vraiment (ses écrans, ses pages publiques, l'IA texte, les e-mails, le paiement par carte, le nombre d'utilisateurs). Interdits : « dès disponible », API, images, vidéo, import de fichiers, chiffrement, modèle d'IA au choix, intégrations, application mobile, recherche web.
- probleme_site : le problème des clients, en 2 phrases au plus, à la 2e personne ou sur « les » clients : AUCUN chiffre, AUCUN nom de logiciel, de marque ou de concurrent (ni le nôtre), aucune revendication de clients ou de succès.
- atouts : 6 objets titre + texte (une phrase courte), tirés des fonctionnalités.
- collections : 2 à 5 objets nom (snake_case, pluriel), label, champs : 4 à 8 objets nom (snake_case) + type (texte|nombre|montant|date|choix|booleen|email|telephone|lien) + valeurs (pour choix seulement). Les liens entre collections : un champ <collection>_id de type texte.
- ecrans : 4 à 6 objets id (snake_case court), titre (2 mots au plus), icone (parmi ${ICONES.join(", ")}), but (une phrase), fonctions (3 à 5 éléments courts). Le premier écran est « Tableau de bord » (indicateurs et activité récente). Couvre le cœur du MVP ; pas d'écran de connexion, de paiement ni de réglages de compte (le gabarit les gère). L'application dispose d'une IA intégrée (rédiger, reformuler, résumer, analyser, générer un document) : si le SaaS d'origine repose sur l'IA, l'écran principal doit la faire fonctionner pour de vrai (saisie → résultat → sauvegarde dans une collection). Elle ne sait pas produire d'images, de vidéos ni de sons, ni se connecter à des services extérieurs. L'application sait aussi envoyer de vrais e-mails aux clients de l'utilisateur (tout de suite, planifiés ou répétés : confirmations, rappels, relances), générer des PDF (devis, factures, contrats), stocker des photos et fichiers, et publier un agenda abonnable : prévois les écrans qui s'en servent quand le SaaS d'origine le fait.
- agenda : null, ou { collection, champ_date, champ_heure (ou null), duree (nombre de minutes, ou nom du champ de durée), champs_titre (1 à 2 champs) } si l'application gère des rendez-vous, des événements, des échéances ou des interventions datées : l'utilisateur pourra s'abonner à cet agenda depuis Google Agenda ou Outlook.
- pages_publiques : 0 à 2 objets id (snake_case court), titre (3 mots au plus), but (une phrase), fonctions (3 à 5), lecture (collections que la page montre au visiteur, ex. créneaux, prestations, témoignages publiés ; peut être vide), ecriture (UNE collection où la page enregistre ce que le visiteur envoie : réservation, demande, témoignage, commande, inscription, réponse). Une page publique est ouverte par les clients de l'utilisateur, sans compte, depuis un lien qu'il partage. N'en mets que si le SaaS sert à recevoir quelque chose de ces clients (prise de rendez-vous, formulaire, avis, devis, commande, inscription, sondage) ; sinon une liste vide. Dans ce cas, ne crée PAS d'écran de l'application qui imite cette page : l'application affiche déjà son lien à partager.
Les données d'exemple sont produites à part : ne mets pas de clé demo.`, { maxTokens: 9000 });

  // Données d'exemple à part (modèle rapide) : la conception reste courte et ne dépasse jamais la durée d'une invocation
  const demo = await askJson<any>(`Application « ${p.nom} » : ${p.pitch}
Collections : ${(s.collections ?? []).slice(0, 6).map((c: any) => `${c.nom} : ${(c.champs ?? []).map((x: any) => `${x.nom} ${x.type}${x.valeurs ? ` [${x.valeurs.join("|")}]` : ""}`).join(", ")}`).join(" ; ")}
Écris les données d'exemple de cette application. Rends un objet JSON { <collection> : 5 éléments réalistes en français (entreprises et personnes fictives, montants cohérents, dates réparties entre ${new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10)} et ${new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10)}, aujourd'hui = ${new Date().toISOString().slice(0, 10)}) } ; les champs <collection>_id pointent vers le champ « ref » (ex. "c1") que tu ajoutes à chaque élément.`, { fast: true, maxTokens: 7000 }).catch(() => ({}));
  const spec: any = {
    nom: p.nom, pitch: p.pitch, cible: p.cible, probleme: p.probleme,
    couleur: /^#[0-9a-f]{6}$/i.test(s.couleur ?? "") ? s.couleur : "#4F46E5",
    slogan: String(s.slogan ?? p.pitch ?? "").slice(0, 90), cible_courte: String(s.cible_courte ?? "").slice(0, 60),
    ...(s.pitch_site ? { pitch: String(s.pitch_site).slice(0, 300) } : {}),
    ...(s.probleme_site ? { probleme: String(s.probleme_site).slice(0, 320) } : {}),
    atouts: (s.atouts ?? []).slice(0, 6),
    // Formules du site : avantages réécrits pour ne promettre que ce qui est construit (sinon celles du projet)
    formules: (Array.isArray(s.formules) && s.formules.length === Math.min(3, (p.formules ?? []).length) && s.formules.every((f: any) => f?.nom && Number.isFinite(Number(f.prix)) && Array.isArray(f.inclus) && f.inclus.length)
      ? s.formules.slice(0, 3).map((f: any) => ({ nom: String(f.nom).slice(0, 40), prix: Number(f.prix), pour: String(f.pour ?? "").slice(0, 120), inclus: f.inclus.slice(0, 5).map((x: unknown) => String(x).slice(0, 90)).filter((x: string) => !/dès disponible|api\b|chiffr|image|vidéo|import/i.test(x)) }))
      : (p.formules ?? []).slice(0, 3)),
    collections: (s.collections ?? []).slice(0, 6),
    ecrans: (s.ecrans ?? []).slice(0, 6).map((e: any, i: number) => ({ id: slugify(String(e.id ?? `ecran-${i}`)).replace(/-/g, "_") || `ecran_${i}`, titre: String(e.titre ?? `Écran ${i + 1}`).slice(0, 24), icone: ICONES.includes(e.icone) ? e.icone : "liste", but: e.but, fonctions: e.fonctions })),
    demo: (demo && typeof demo === "object" && !Array.isArray(demo) ? (demo.demo ?? demo) : {}) as any,
    agenda: s.agenda?.collection && s.agenda?.champ_date ? { collection: String(s.agenda.collection), champ_date: String(s.agenda.champ_date), champ_heure: s.agenda.champ_heure ? String(s.agenda.champ_heure) : null, duree: s.agenda.duree ?? 60, champs_titre: (Array.isArray(s.agenda.champs_titre) ? s.agenda.champs_titre : [s.agenda.champs_titre]).filter(Boolean).slice(0, 2) } : null,
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
