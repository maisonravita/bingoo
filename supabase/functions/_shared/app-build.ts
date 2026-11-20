// Bingoo! construit le SaaS : à partir d'un projet « Lancer le même », génère une application qui marche
// (site public, comptes, écrans avec données), hébergée par Bingoo! sur bingoo.fr/#/app/<slug>.
// 1. une spec (couleur, données, écrans, données d'exemple) ; 2. le code de chaque écran, en parallèle.
// Le gabarit (src/lib/appShell.js) fournit navigation, comptes, composants et accès aux données.
// deno-lint-ignore-file no-explicit-any
import { alignerCode } from "./contrat-donnees.ts";
import { admin, ask, askJson } from "./core.ts";
import { sansIdentite } from "./identite.ts";

export const ICONES = ["accueil", "liste", "contacts", "agenda", "graphique", "reglages", "fichier", "boite", "mail", "carte", "tag", "etoile", "horloge", "panier", "message"];

export const DOC = `Tu écris UN écran d'une application web en Preact avec htm (pas de JSX, pas de build). Le code est évalué tel quel.
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
- SURVEILLANCE DE PAGES WEB (veille de prix, de concurrents, d'offres d'emploi, de disponibilité, de mises à jour) : un élément dont la collection a un champ « url_surveillee » (texte, adresse https) est visité par Bingoo! chaque jour (ou chaque heure si son champ « frequence » vaut "heure"). Bingoo! remplit tout seul dans l'élément : derniere_verif (date ISO), dernier_changement (date ISO), statut_surveillance ("ok" | "change" | "erreur"), extrait (le texte nouveau, 600 caractères), nb_changements, erreur_surveillance ; et envoie un e-mail à son champ « email_alerte » à chaque changement. L'écran ne fait AUCUNE lecture de page lui-même : il affiche ces champs (badge de statut, date du dernier changement, extrait) et permet d'ajouter, modifier ou retirer des pages à surveiller.
- lienAgenda() → Promise<url> : lien d'abonnement à ajouter dans Google Agenda ou Outlook (le menu de l'application propose déjà « Ajouter à mon agenda » ; ne refais pas ce bouton).
- ia(consigne, { texte?, json? }) → Promise : l'IA intégrée de l'application (rédiger, reformuler, résumer, traduire, analyser, classer, générer des idées ou un document). Renvoie du texte, ou un objet si json: true (décris alors la forme attendue dans la consigne). Pendant l'appel, désactive le bouton et affiche « … en cours » ; en cas d'erreur, toast(e.message, "bad"). Enregistre le résultat dans une collection quand l'utilisateur voudra le retrouver. N'utilise ia que si la fonctionnalité en a vraiment besoin.
- fmt.eur(n), fmt.num(n), fmt.date(iso), fmt.dateHeure(iso), fmt.pct(n).
- ui.Page({ titre, sous, actions }) : en-tête d'écran + contenu (toujours l'élément racine de l'écran).
- ui.Card({ titre, actions, class }), ui.Stat({ label, valeur, sous, icone }), ui.Badge({ couleur: "vert"|"rouge"|"orange"|"bleu"|"violet"|"gris" }),
  ui.Button({ variant: "primary"|"secondary"|"danger"|"ghost", onClick, type, disabled, icone }), ui.Input({ label, value, onInput(v), type, placeholder, required }) (type "number" renvoie un nombre),
  ui.Textarea({ label, value, onInput(v), rows }), ui.Select({ label, value, onChange(v), options: [[valeur, libellé], …] }),
  ui.Modal({ open, onClose, titre, actions }), ui.Table({ colonnes: [{ cle, label, rendu?(ligne) }], lignes, onClick?(ligne), vide }), ui.Empty({ texte, action }), ui.Loading(), ui.Tabs({ valeur, onChange, onglets: [[v, l]] }), ui.Bar({ donnees: [{ label, valeur }] }), ui.Ligne({ donnees: [{ label, valeur }] }) (évolution dans le temps), ui.Donut({ donnees: [{ label, valeur }] }) (répartition), ui.Progress({ valeur, max, label }),
  ui.Calendrier({ lignes, champ: "date", rendu?(ligne), onClick?(ligne), onJour?(dateISO) }) (vue du mois, pour tout ce qui est daté), ui.Kanban({ colonnes: [[valeur, libellé], …], lignes, champ: "statut", onDeplacer(id, valeur), rendu?(ligne), onClick?(ligne) }) (suivi par étapes, glisser-déposer), ui.Icone({ nom, class }) avec nom parmi ${ICONES.join(", ")}.
  ui.Creneaux({ duree (minutes), pris: réservations déjà prises (champ "debut" en date-heure ISO, et "duree" si elle varie), horaires?: { 1: [["09:00","12:00"],["14:00","18:00"]], … 7: [] } (1 = lundi), valeur, onChange(debutISO) }) : les VRAIS créneaux libres des jours à venir (sans les créneaux pris ni passés), à cliquer. À utiliser pour toute prise de rendez-vous ou réservation, à la place d'un champ date et d'un champ heure.
  ui.Editeur({ value, onChange(blocs), placeholder?, lectureSeule? }) : VRAI éditeur de documents en blocs (titres, listes, cases à cocher, citations, code, séparateurs, menu « / », raccourcis # - [] >, Entrée et Retour arrière naturels, options de bloc). value = tableau de blocs { id, type, texte, fait } (ou un texte) : enregistre-le tel quel dans un champ json de l'élément (onChange est déjà différé de 400 ms). ui.texteDe(blocs) → le texte brut du document (recherche, IA, PDF, copie).
  ui.Chat({ messages: [{ role: "user"|"assistant", texte }], onEnvoyer(texte) → Promise, enCours, suggestions?: [phrases de départ], accueil?, nomIA?, placeholder? }) : conversation complète avec l'IA (bulles, suggestions, Entrée pour envoyer, indicateur d'écriture, copier). Dans onEnvoyer : ajoute le message, appelle ia() avec l'historique récent dans la consigne, ajoute la réponse, et enregistre la conversation dans une collection.
  ui.ConstructeurFormulaire({ value: questions, onChange(questions) }) : constructeur de formulaire complet (questions, 10 types de réponse, options, obligatoire, ordre, dupliquer). questions = tableau { id, type, titre, aide, options, obligatoire } à enregistrer dans un champ json.
  ui.Questionnaire({ questions, onTerminer(reponses) → Promise, titre, intro, merci, apercu? }) : le formulaire rempli UNE question à la fois, en grand (barre de progression, gros boutons de choix, étoiles, note de 0 à 10, Entrée pour continuer) ; reponses = [{ id, question, type, reponse }]. Sur une page publique, onTerminer enregistre la réponse avec db.add. apercu: true pour tester sans enregistrer.
  ui.Vitrine({ value: { profil: { nom, bio, emoji, photo }, theme: "clair"|"sombre"|"couleur", blocs: [{ id, type: "lien"|"produit"|"titre"|"texte"|"video", titre, texte, url, prix, image, actif }] }, onAcheter?(bloc), onClic?(bloc) }) : la page vitrine d'un créateur ou d'un commerce telle que les visiteurs la voient (page de liens, offres, produits avec bouton Acheter qui ouvre leur lien de paiement). ui.EditeurVitrine({ value, onChange }) : son éditeur complet (profil, thème, blocs à ajouter, ordonner, masquer) avec l'aperçu en direct sur téléphone. La valeur se garde dans un champ json ; la page publique affiche ui.Vitrine et compte les clics avec db.add.
  ui.Toile({ value: { largeur, hauteur, fond, elements: [...] }, onChange(toile), nomFichier? }) : VRAIE toile de création graphique (posts, stories, affiches, bannières, diapositives) : textes, formes, cercles, images envoyées, glisser pour déplacer, poignée pour redimensionner, couleurs, polices, gras, alignement, opacité, calques, dupliquer, formats prédéfinis, téléchargement en PNG. La valeur (un objet) se garde dans un champ json d'un élément « design ». À utiliser pour tout produit de création visuelle, avec une galerie de designs et des modèles de départ (valeurs prêtes d'éléments).
  ui.Tableau({ value: { colonnes: [{ id, nom }], cartes: [{ id, colonne, titre, description, responsable, echeance, etiquettes: ["rouge"|"orange"|"jaune"|"vert"|"bleu"|"violet"], cases: [{ texte, fait }], commentaires: [{ texte, auteur, at }] }] }, onChange(tableau), membres?: [noms] }) : VRAI tableau de projets façon cartes (colonnes à ajouter, renommer, déplacer et supprimer ; cartes glissées d'une colonne à l'autre ; détail avec responsable, échéance, étiquettes, liste de tâches avec progression, commentaires ; recherche et filtres). Un tableau entier = un élément d'une collection « tableaux » avec un champ json : à utiliser pour toute gestion de projets ou de tâches en équipe, avec la liste des tableaux à côté.
  BRIQUES QUI MARCHENT DÉJÀ (à préférer à du code écrit à la main : c'est là que naissent les formulaires qui n'enregistrent pas et les boutons qui ne font rien) :
  ui.Fiches({ col, titre: "client", champs: [{ nom, label, type: "texte"|"long"|"nombre"|"date"|"heure"|"email"|"tel"|"choix"|"case", options, requis }], colonnes?, rendu?: (ligne) => carte, filtre?, initial?, vide? }) : une collection complète — liste (tableau, ou cartes avec rendu), recherche, ajout, modification, suppression confirmée. Pour tout écran « liste + fiche », c'est ui.Fiches, puis tu ajoutes autour ce qui est propre au produit (indicateurs, vues, actions).
  ui.Formulaire({ champs, valeur, onEnregistrer: async (donnees) => …, onAnnuler?, libelle? }) : formulaire qui enregistre à coup sûr (état à jour, champs obligatoires vérifiés) ; dans une ui.Modal ou une page publique.
  Les noms de champs utilisés dans le code sont EXACTEMENT ceux des collections (Bingoo! aligne automatiquement les écarts évidents, mais jamais les valeurs ambiguës).
  ui.Chrono({ mode: "chrono"|"minuteur", duree (secondes, pour le minuteur), titre, onFin(), onStop(secondes) }) : chrono ou minuteur avec bip à la fin (séance de sport, révision, recette, temps de travail) ; enregistre la durée avec onStop.
  ui.Liste({ lignes, rendu(ligne) → { emoji?, titre, sous?, droite?, couleur? }, onClick?(ligne), vide }) : liste aérée façon appli mobile (au lieu d'un tableau).
  ui.Galerie({ lignes, rendu(ligne) → { emoji?, image?, titre, sous?, etiquette? }, onClick?(ligne), colonnes?: 2|3|4, vide }) : grille de cartes visuelles (catalogue, recettes, leçons).
  ui.Fil({ lignes, rendu(ligne) → { auteur, date?, texte, image?, emoji? }, actions?(ligne), vide }) : fil de publications façon réseau social.
  ui.Anneau({ valeur, max, label, sous?, taille?: "petit"|"grand" }) : anneau de progression (objectif du jour, de la semaine).
  ui.Classement({ lignes, champ (nombre à additionner par membre ; sans champ = nombre d'éléments), unite, titre, max }) : classement des membres sur une collection COMMUNAUTÉ.
- Collections COMMUNAUTÉ (marquées ainsi plus bas) : partagées entre TOUS les comptes de l'application (fil, défis, classements, entraide, recettes ou parcours partagés). Chaque élément y a en plus _auteur (prénom de son auteur), _auteur_id et _moi (true si c'est le compte connecté). N'affiche modifier et supprimer que si _moi ; n'écris jamais ces trois champs. Les autres collections restent privées à chaque compte.
- Tailwind CSS est chargé. Couleur de la marque : classes bg-[var(--c)], text-[var(--c)], border-[var(--c)]. Grilles : grid sm:grid-cols-2 lg:grid-cols-4 gap-4.
Le tableau ui.Table ajoute déjà tout seul la recherche, le tri, l'export et la pagination, et met en forme dates, nombres et statuts : ne les refais pas. Choisis les composants de la FAMILLE du logiciel (consignes de famille plus bas) : un éditeur pour un outil d'écriture, des cartes pour un outil de projets, une conversation pour un assistant IA, un calendrier pour ce qui est daté. Un tableau ou des indicateurs seulement là où la famille les prévoit.
Règles : tout en français, vouvoiement (« vous », « votre », « Ajoutez… ») ; un vrai écran utile et complet (création, modification, suppression confirmée par if (!await demander("Supprimer … ?", { ok: "Supprimer", danger: true })) return; (jamais confirm ni alert : fenêtres intégrées demander(message, { ok, danger }) → Promise<boolean> et avertir(message)), recherche ou filtres quand c'est utile, états vides) ; calcule les indicateurs à partir des données ; jamais de fausses données en dur (les données d'exemple sont déjà dans la base) ; chaque bouton fait une vraie action et chaque formulaire enregistre vraiment (le robot de vérification clique sur « Ajouter », remplit, enregistre et clique sur chaque bouton : un bouton qui ne fait rien est refusé) ; aucune fonction annoncée qui ne marche pas ; pas de fetch, pas de localStorage, pas de window.parent ; code compact : 180 lignes au plus, pas de commentaires, pas de répétition (factorise les formulaires dans une petite fonction).`;

// Page publique : ouverte par les clients de l'utilisateur, sans compte
export const DOC_PUBLIC = (e: any) => `

IMPORTANT : cet écran est une PAGE PUBLIQUE, ouverte sans compte par les clients de l'utilisateur (lien qu'il leur partage). Pas de menu autour : la page se suffit à elle-même.
- user vaut null. props.espace : nom de l'entreprise de l'utilisateur s'il est connu (peut être vide).
${e.ia ? "- OUTIL IA PUBLIC : ia(consigne, { texte?, json? }) est disponible sur cette page (le visiteur l'utilise sans compte, quelques fois par jour). C'est le cœur de la page : un formulaire clair, un bouton, un état de chargement, le résultat bien mis en forme avec un bouton Copier, et un appel à créer un compte pour aller plus loin. En cas d'erreur (limite atteinte), affiche le message reçu.\n" : ""}- Lecture possible seulement avec db.list ou useCollection sur : ${(e.lecture ?? []).join(", ") || "aucune collection"} (n'affiche que ce qui sert au visiteur ; si la collection a un champ booléen publie ou visible, ne montre que les éléments où il vaut true — c'est déjà filtré côté serveur).
- Écriture possible seulement avec db.add dans : ${e.ecriture ?? "aucune collection"}. Pas de update, pas de remove, pas de email${e.ia ? "" : ", pas de ia"}.
- E-mails au visiteur : db.add(col, donnees, { confirmation: { sujet, texte }, rappels: [{ quand: date ISO, sujet, texte }] }) envoie une confirmation tout de suite et jusqu'à 2 rappels (ex. la veille d'un rendez-vous à la même heure) à l'adresse e-mail qu'il vient de saisir. Utilise-le dès qu'il y a une réservation, une commande ou une demande.
- Mise en page : en-tête avec le titre et une phrase claire, puis le formulaire ou la liste, en une colonne lisible sur téléphone (max-w-xl mx-auto). Après l'envoi, un message de confirmation chaleureux à la place du formulaire. Champs obligatoires vérifiés avant l'envoi ; adresse e-mail du visiteur demandée quand l'utilisateur devra lui répondre.
- Réservation : utilise OBLIGATOIREMENT ui.Creneaux (jamais un champ date ou heure) avec pris = les réservations lues dans la collection d'écriture, duree = celle de la prestation choisie, et horaires = les disponibilités de l'utilisateur si une collection de disponibilités existe (jour 1 à 7, debut, fin → { [jour]: [[debut, fin], …] }). Enregistre la réservation avec un champ "debut" (date-heure ISO) et "duree" (minutes).`;

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "saas";

export function nouveauSlug(nom: string) {
  return `${slugify(nom)}-${crypto.getRandomValues(new Uint8Array(3)).reduce((a, b) => a + b.toString(36).padStart(2, "0"), "").slice(0, 4)}`;
}

const etape = (id: string, t: string) => admin.from("saas_apps").update({ etape: t, maj: new Date().toISOString() }).eq("id", id);

// Le code doit au moins se lire (une erreur de syntaxe casserait l'écran)
export function erreurSyntaxe(code: string): string | null {
  try { new Function("ctx", code); return null; } catch (e) { return e instanceof SyntaxError ? e.message : null; }
}
function extraire(t: string) {
  const f = [...t.matchAll(/```(?:js|javascript|jsx)?\s*([\s\S]*?)```/g)].map((m) => m[1]).sort((a, b) => b.length - a.length)[0];
  return (f ?? t).trim();
}

// Deux vraies lignes d'exemple par collection : l'écran calcule sur les champs et les valeurs qui existent vraiment (sinon blocs vides et chiffres à zéro)
function exemplesDe(spec: any) {
  const d = spec?.demo ?? {};
  const l = Object.entries(d).filter(([, xs]) => Array.isArray(xs) && xs.length).map(([k, xs]: [string, any]) => {
    const statuts = [...new Set((xs as any[]).map((x) => x?.statut).filter((v) => typeof v === "string"))].slice(0, 8);
    return `${k} (${xs.length} exemples) : ${(xs as any[]).slice(0, 2).map((x) => JSON.stringify(x).slice(0, 260)).join(" | ")}${statuts.length ? ` — valeurs de statut présentes : ${statuts.join(", ")}` : ""}`;
  });
  return l.length ? `\nDonnées d'exemple déjà chargées dans l'application (utilise exactement ces noms de champs et ces valeurs ; les dates sont recentrées sur aujourd'hui) :\n${l.join("\n")}` : "";
}
function contexteSpec(spec: any) {
  return `Application « ${spec.nom} » : ${spec.pitch}
Pour : ${spec.cible ?? ""}${spec.nature?.espace_principal ? `\nEspace principal du produit (ce qui le définit) : ${spec.nature.espace_principal}. Interactions caractéristiques : ${(spec.nature.interactions ?? []).join(" ; ")}.` : ""}
Collections (données) : ${(spec.collections ?? []).map((c: any) => `${c.nom} (${c.label}${c.partage === true ? ", COMMUNAUTÉ : partagée entre tous les membres" : ""}) : ${(c.champs ?? []).map((x: any) => `${x.nom} ${x.type}${x.valeurs ? ` [${x.valeurs.join("|")}]` : ""}`).join(", ")}`).join(" ; ")}${exemplesDe(spec)}
Écrans de l'application (id : titre) : ${(spec.ecrans ?? []).filter((e: any) => !e.public).map((e: any) => `${e.id} : ${e.titre}`).join(" ; ")}${(spec.ecrans ?? []).some((e: any) => e.public) ? `
Pages publiques (pour les clients de l'utilisateur, sans compte ; leur lien à partager est déjà affiché dans le menu de l'application) : ${(spec.ecrans ?? []).filter((e: any) => e.public).map((e: any) => `${e.titre} (enregistre dans ${e.ecriture ?? "rien"})`).join(" ; ")}. Dans l'application, les éléments reçus par ces pages ont le champ _public = true : signale-les (badge « Reçu en ligne »).` : ""}`;
}

// Chaque type d'interface a ses codes : une appli de sport ou un outil ne doit pas ressembler à un CRM
const GENRES_UI: Record<string, string> = {
  appli: `TYPE D'INTERFACE : APPLI DU QUOTIDIEN (comme une appli mobile soignée, PAS un logiciel de gestion).
- INTERDIT : ui.Table, rangées de 4 ui.Stat, ui.Kanban, mots « gestion », « fiches », « exporter ». La règle « tableau + graphique sur un tableau de bord » ne s'applique PAS.
- Écran d'accueil = « Aujourd'hui » : un grand titre qui salue (« Bonjour {prénom} »), LA prochaine action en grosse carte colorée (bg-[var(--c)] text-white, gros bouton), la progression du jour ou de la semaine avec ui.Anneau, puis les derniers éléments avec ui.Liste.
- Les listes : ui.Liste (lignes aérées avec emoji, titre, sous-titre, valeur à droite), jamais de tableau. Les ajouts : un gros bouton rond ou plein, une modale courte avec 2 à 4 champs.
- Mise en page étroite et centrée (max-w-2xl mx-auto), gros textes (text-2xl à text-4xl pour les chiffres clés), beaucoup d'espace, emoji pour l'ambiance.`,
  outil: `TYPE D'INTERFACE : OUTIL À UNE FONCTION (comme un bon outil en ligne, PAS un logiciel de gestion).
- INTERDIT : ui.Table, rangées de ui.Stat, ui.Kanban. La règle « tableau + graphique » ne s'applique PAS.
- Écran principal : un titre clair, UNE grande zone de saisie (ui.Textarea ou quelques champs) et un gros bouton d'action, puis le résultat en grand dans une belle carte (bouton Copier, Recommencer). L'historique des résultats passés en ui.Liste plus bas ou sur un autre écran.
- Mise en page centrée (max-w-3xl mx-auto), généreuse, focalisée sur l'action.`,
  contenu: `TYPE D'INTERFACE : CONTENU ET CATALOGUE (comme une belle bibliothèque, PAS un logiciel de gestion).
- INTERDIT : ui.Table comme vue principale, rangées de ui.Stat. La règle « tableau + graphique » ne s'applique PAS.
- Vue principale : ui.Galerie (grille de cartes avec grand emoji ou image, titre, sous-titre, étiquette), une barre de recherche et des filtres en pastilles au-dessus. Un clic ouvre une fiche détaillée en grand (modale ou écran), mise en page éditoriale.`,
  communaute: `TYPE D'INTERFACE : COMMUNAUTÉ (comme un réseau social simple, PAS un logiciel de gestion).
- INTERDIT : ui.Table, rangées de ui.Stat. La règle « tableau + graphique » ne s'applique PAS.
- Vue principale : ui.Fil (publications avec auteur, date, texte, réactions), une zone « Quoi de neuf ? » en haut pour publier, ui.Classement pour les défis. Mise en page centrée (max-w-2xl mx-auto).`,
  apprentissage: `TYPE D'INTERFACE : APPRENTISSAGE (comme une appli d'apprentissage ludique, PAS un logiciel de gestion).
- INTERDIT : ui.Table, rangées de ui.Stat. La règle « tableau + graphique » ne s'applique PAS.
- Accueil : la série du jour et la progression (ui.Anneau, niveaux), une grosse carte « Continuer ». Les exercices : une question à la fois en grand, réponses en gros boutons, retour immédiat (vert/rouge), score à la fin. Les leçons en ui.Galerie ou ui.Liste.`,
};
async function ecrire(spec: any, e: any, demande = "", actuel = "") {
  const consigne = actuel
    ? `Voici le code actuel de l'écran « ${e.titre} » (${e.id}) :\n\`\`\`js\n${actuel}\n\`\`\`\nModification demandée par l'utilisateur : ${demande}\nRéécris l'écran complet avec cette modification, sans rien casser du reste.`
    : `Écris l'écran « ${e.titre} » (id ${e.id}). Ce qu'il doit faire : ${e.but}\nFonctions à couvrir : ${(e.fonctions ?? []).join(" ; ")}${demande ? `\nPrécision de l'utilisateur : ${demande}` : ""}`;
  const { FAMILLES } = await import("./familles.ts");
  const guide = FAMILLES[spec.famille]?.guide ?? GENRES_UI[spec.interface] ?? FAMILLES.gestion.guide;
  const genre = !e.public ? `\n\n${guide}` : "";
  const prompt = `${DOC}${e.public ? DOC_PUBLIC(e) : ""}${genre}\n\n${contexteSpec(spec)}\n\n${consigne}\n\nRéponds uniquement avec le code dans un bloc \`\`\`js.`;
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
// L'IA ne peut pas héberger d'images : un lien d'image inventé (exemple.fr, photo.jpg…) s'afficherait cassé dans la démo
function sansFaussesImages(v: any): any {
  if (typeof v === "string") return /^https?:\/\/\S+\.(jpe?g|png|webp|gif|avif)(\?\S*)?$/i.test(v) || /^https?:\/\/(www\.)?(exemple|example|placeholder|via\.placeholder|images\.exemple)\./i.test(v) ? "" : v;
  if (Array.isArray(v)) return v.map(sansFaussesImages);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sansFaussesImages(x)]));
  return v;
}

export async function saasConstruire(appId: string, lancerEcran: (ecranId: string) => Promise<void>) {
  const { data: app } = await admin.from("saas_apps").select("id, projet_id").eq("id", appId).single();
  const { data: pr } = await admin.from("saas_projets").select("data").eq("id", app!.projet_id).single();
  const p = (pr?.data ?? {}) as any;
  // Le nom choisi par le membre est celui du SaaS, toujours
  if (typeof p.nom_choisi === "string" && p.nom_choisi.trim()) p.nom = p.nom_choisi.trim().slice(0, 40);
  const { data: av } = await admin.from("saas_apps").select("etape").eq("id", appId).single();
  const suffixe = /2e essai/.test(String(av?.etape ?? "")) ? " (2e essai)" : "";
  await etape(appId, `Conception des données et des écrans${suffixe}`);
  // Métier connu : modèle fait main (écrans soignés et testés), l'IA n'adapte que le vocabulaire, les offres et les textes
  const { modeleDe, FAIT, PERSO, SPEC } = await import("./modeles.ts");
  // Les projets analysés utilisent les écrans de leur fiche produit.
  // Métier reconnu (rendez-vous, devis/factures, écriture IA) : modèle fait main et testé, même après une analyse REA ;
  // les fonctions relevées en plus sont ajoutées ensuite comme écrans promis (ajouterEcransPromis)
  // Famille du produit d'origine (analyse de ses pages publiques), sinon déduite de ses mots : elle décide de l'interface
  const { FAMILLES, CHOIX_FAMILLES, familleParDefaut, MODELES_DE_FAMILLE, MODELE_DE_LA_FAMILLE } = await import("./familles.ts");
  const nature = p.scan?.nature ?? null;
  const texteProduit = [p.inspire?.categorie, p.pitch, p.cible, p.probleme, ...(p.mvp ?? []).map((m: any) => m?.fonction)].join(" ");
  const famille0 = FAMILLES[nature?.famille] ? nature.famille : familleParDefaut(texteProduit);
  // Un modèle fait main ne s'impose qu'à un produit de sa famille (avant : tout produit qui parlait de rendez-vous devenait le même logiciel)
  const modeleBrut = modeleDe(p);
  // Lancé depuis la galerie de modèles : le modèle choisi par le membre passe avant tout
  const modele = SPEC[p.modele_force] ? String(p.modele_force) : modeleBrut && (MODELES_DE_FAMILLE[famille0] ?? []).includes(modeleBrut) ? modeleBrut : (MODELE_DE_LA_FAMILLE[famille0] ?? null);
  const FAIT_MODELE = modele ? (FAIT as Record<string, string>)[modele] : "";
  // Deux SaaS construits ne doivent pas se ressembler : palette variée, et pas les couleurs ni les allures des derniers construits
  const { data: recents } = await admin.from("saas_apps").select("spec").neq("id", appId).not("statut", "in", "(remplace,retire,erreur)").order("maj", { ascending: false }).limit(8);
  const couleursPrises = (recents ?? []).map((r: any) => r.spec?.couleur).filter(Boolean);
  const allluresPrises = (recents ?? []).map((r: any) => [r.spec?.style, r.spec?.disposition].filter(Boolean).join("/")).filter(Boolean);
  const PALETTE = ["#C2410C", "#B91C1C", "#BE185D", "#7E22CE", "#4338CA", "#1D4ED8", "#0369A1", "#0E7490", "#15803D", "#4D7C0F", "#A16207", "#9A3412", "#334155", "#1E293B", "#9F1239", "#6D28D9"];
  const s = await askJson<any>(`Tu conçois la première version d'une application web (SaaS) qui va être générée automatiquement et mise en ligne. Elle peut être de tout genre : outil de gestion pour des professionnels, mais aussi appli grand public (sport et entraînement, nutrition, bien-être, apprentissage et révisions, organisation perso, famille, loisirs, finances perso), outil IA de texte, ou communauté. Pour une appli grand public, l'utilisateur est la personne elle-même (ses séances, ses objectifs, sa progression), pas une entreprise qui gère des clients.${modele ? `\n${FAIT_MODELE}` : ""}
SaaS : « ${p.nom} » — ${p.pitch}
Pour : ${p.cible}
Besoin : ${p.probleme}
Fonctionnalités (équivalentes à ${p.inspire?.nom ?? "un SaaS qui marche"}) : ${(p.equivalences ?? []).map((x: any) => x.chez_toi).join(" ; ")}
MVP dans l'ordre : ${(p.mvp ?? []).map((m: any) => m.fonction).join(" ; ")}
${p.scan?.modules?.length ? `Fiche produit de ${p.inspire?.nom ?? "l'original"} (à égaler, avec nos mots) — modules : ${p.scan.modules.map((m: any) => `${m.nom} (${m.fait} ; données : ${(m.donnees ?? []).join(", ")} ; étapes : ${(m.etapes ?? []).join(" → ")})`).join(" | ")}
Parcours d'un nouveau client : ${(p.scan.parcours ?? []).join(" → ")}
${p.scan.formules ? `Logique des formules : ${p.scan.formules}\n` : ""}Vocabulaire du métier : ${(p.scan.vocabulaire ?? []).join(", ")}
Les écrans reprennent les modules les plus importants de cette fiche (un écran par module, mêmes données, même parcours), avec nos noms et nos mots.
` : ""}${nature?.espace_principal ? `NATURE DU PRODUIT D'ORIGINE (à respecter : c'est ce qui en fait ce produit et pas un autre)
- Famille : ${nature.famille}
- Espace principal : ${nature.espace_principal}
- Interactions caractéristiques : ${(nature.interactions ?? []).join(" ; ")}
- Navigation : ${(nature.navigation ?? []).join(" → ")}${(nature.public ?? []).length ? `
- Côté visiteurs : ${nature.public.join(" ; ")}` : ""}
Le premier écran EST cet espace principal, et les interactions caractéristiques doivent exister vraiment dans les écrans. Ce n'est pas un logiciel de gestion habillé.
` : ""}
Rends un objet JSON compact :
- couleur : couleur de marque en hexadécimal (#xxxxxx), assez foncée pour du texte blanc dessus, PAS celle de ${p.inspire?.nom ?? "l'inspiration"}. Choisis-la dans cette palette, celle qui raconte le mieux le métier ou l'ambiance : ${PALETTE.join(", ")}. Couleurs déjà prises par les derniers SaaS construits, à ÉVITER ainsi que leurs voisines (surtout les verts canard et bleu-vert foncés, beaucoup trop vus) : ${couleursPrises.join(", ") || "aucune"}.
- style : l'allure de l'application, UN parmi moderne (net, Inter), doux (arrondi, chaleureux), sombre (menu foncé), editorial (titres à empattement, posé), vif (couleurs franches), rond (très amical, grand public), tech (outil technique, titres géométriques), elegant (haut de gamme, titres raffinés), sport (énergique, titres condensés), geometrique (jeune, épuré). Choisis selon le public et le métier, pas au hasard, et pas une allure déjà prise par les derniers SaaS construits (${allluresPrises.join(", ") || "aucune"}) sauf si c'est vraiment la seule qui convient.
- famille : la FAMILLE de logiciel, qui décide de tout l'aspect et de toute la logique des écrans, UNE parmi :
  ${CHOIX_FAMILLES}.
  Famille la plus probable d'après l'analyse : ${famille0}. Garde-la sauf erreur évidente. Ne choisis gestion QUE pour un logiciel qui suit des dossiers, des clients ou des stocks.
- disposition : barre (menu à gauche, outil de travail sur ordinateur), haut (menu en haut, appli simple à peu d'écrans), onglets (onglets en bas sur téléphone, appli grand public utilisée surtout sur mobile).
- forme : carre (sobre, professionnel), arrondi (équilibré), pilule (doux, grand public).
- fond : blanc, creme (chaleureux), gris (outil dense), sombre (soirée, sport, musique, tech ; à éviter pour un outil de gestion classique).
- slogan : titre du site, 8 mots au plus, percutant ; cible_courte : 5 mots (« Pour les … »).
- pitch_site : la phrase sous le titre du site, 35 mots au plus. Elle ne promet QUE ce que cette première version fait vraiment (écrans, pages publiques, IA texte) : pas de synchronisation d'agenda, d'envoi de SMS, d'intégration à un autre logiciel ni de chiffres inventés. Les atouts suivent la même règle.
- formules : reprends EXACTEMENT ces formules (même nom, même prix, même « pour ») : ${JSON.stringify((p.formules ?? []).slice(0, 3).map((f: any) => ({ nom: f.nom, prix: f.prix, pour: f.pour })))}, avec pour chacune « inclus » : 3 à 5 avantages qui ne citent QUE ce que cette première version fait vraiment (ses écrans, ses pages publiques, l'IA texte, les e-mails, le paiement par carte, le nombre d'utilisateurs). Interdits : « dès disponible », API, images, vidéo, import de fichiers, chiffrement, modèle d'IA au choix, intégrations, application mobile, recherche web.
- probleme_site : le problème des clients, en 2 phrases au plus, à la 2e personne ou sur « les » clients : AUCUN chiffre, AUCUN nom de logiciel, de marque ou de concurrent (ni le nôtre), aucune revendication de clients ou de succès.
- atouts : 6 objets titre + texte (une phrase courte), tirés des fonctionnalités.
- faq : 4 à 6 objets q + r : les questions que se posent les futurs clients avant d'acheter${p.scan?.objections?.length ? ` (inspire-toi de : ${p.scan.objections.map((o: any) => o.q).join(" ; ")})` : ""}, réponses honnêtes en 1 à 2 phrases avec nos mots, qui ne promettent que ce que fait cette version. Pas de question sur l'essai, l'engagement, la sécurité des données ni l'équipe (déjà présentes).
- collections : 2 à 5 objets nom (snake_case, pluriel), label, partage (true seulement pour une collection COMMUNAUTÉ partagée entre tous les comptes : fil d'activité, défis, classement, entraide, contenus partagés ; false sinon, c'est le cas général), champs : 4 à 8 objets nom (snake_case) + type (texte|nombre|montant|date|choix|booleen|email|telephone|lien|json : contenu structuré comme les blocs d'un document, les questions d'un formulaire, les étapes d'un scénario, une liste de cases) + valeurs (pour choix seulement). Les liens entre collections : un champ <collection>_id de type texte.
- ecrans : 5 à 8 objets id (snake_case court), titre (2 mots au plus), icone (parmi ${ICONES.join(", ")}), but (une phrase), fonctions (3 à 5 éléments courts). Le premier écran est celui de la famille choisie (voir la liste des familles : premier écran = …), c'est-à-dire l'espace principal du produit d'origine ; un « Tableau de bord » d'indicateurs n'est le premier écran QUE pour gestion et analyse. Les titres et le vocabulaire des écrans suivent la famille (pas de « Gestion des… » hors gestion). Chaque écran reprend une partie de la navigation du produit d'origine, avec ses interactions caractéristiques. Couvre TOUTES les fonctions importantes du SaaS d'origine (les modules du projet, dans l'ordre), pas seulement un MVP minimal. Si le SaaS d'origine prend des rendez-vous ou des réservations : un écran « Disponibilités » (heures d'ouverture par jour de la semaine, avec une collection disponibilites : jour 1 à 7, debut, fin) et une page publique de réservation. Pas d'écran de connexion, de paiement ni de réglages de compte (le gabarit les gère). L'application dispose d'une IA intégrée (rédiger, reformuler, résumer, analyser, générer un document) : si le SaaS d'origine repose sur l'IA, l'écran principal doit la faire fonctionner pour de vrai (saisie → résultat → sauvegarde dans une collection). Elle ne sait pas produire d'images, de vidéos ni de sons, ni se connecter à des services extérieurs. L'application sait aussi envoyer de vrais e-mails aux clients de l'utilisateur (tout de suite, planifiés ou répétés : confirmations, rappels, relances), générer des PDF (devis, factures, contrats), stocker des photos et fichiers, et publier un agenda abonnable : prévois les écrans qui s'en servent quand le SaaS d'origine le fait.
- agenda : null, ou { collection, champ_date, champ_heure (ou null), duree (nombre de minutes, ou nom du champ de durée), champs_titre (1 à 2 champs) } si l'application gère des rendez-vous, des événements, des échéances ou des interventions datées : l'utilisateur pourra s'abonner à cet agenda depuis Google Agenda ou Outlook.
- pages_publiques : 0 à 2 objets id (snake_case court), titre (3 mots au plus), but (une phrase), fonctions (3 à 5), lecture (collections que la page montre au visiteur, ex. créneaux, prestations, témoignages publiés ; peut être vide), ecriture (UNE collection où la page enregistre ce que le visiteur envoie : réservation, demande, témoignage, commande, inscription, réponse ; peut être null), ia (true si la page est un OUTIL IA gratuit utilisable sans compte : générateur, correcteur, mini-coach, simulateur de texte ; il donne envie de créer un compte). Une page publique est ouverte par les clients de l'utilisateur, sans compte, depuis un lien qu'il partage. N'en mets que si le SaaS sert à recevoir quelque chose de ces clients (prise de rendez-vous, formulaire, avis, devis, commande, inscription, sondage) ou si un outil IA gratuit sert de vitrine à l'application ; sinon une liste vide. Dans ce cas, ne crée PAS d'écran de l'application qui imite cette page : l'application affiche déjà son lien à partager.
Les données d'exemple sont produites à part : ne mets pas de clé demo.`, { maxTokens: 16000 });

  // Données d'exemple à part (modèle rapide) : la conception reste courte et ne dépasse jamais la durée d'une invocation
  // Le modèle Écriture demande aussi 7 textes d'exemple complets : plus de place, sinon la réponse est coupée
  const perso = modele ? await askJson<any>(PERSO[modele](p), { fast: true, maxTokens: modele === "ecriture" ? 7000 : ["projets", "formation", "notes", "formulaires", "support"].includes(modele) ? 6000 : ["recrutement", "reseaux", "boutique"].includes(modele) ? 4000 : 2000 }).catch(() => ({})) : null;
  // Données d'exemple : écrites dans une invocation à part (saasDemoPuisEcrans), la conception seule tient déjà près de 2 minutes
  const demo = {};
  const spec: any = {
    nom: p.nom, pitch: p.pitch, cible: p.cible, probleme: p.probleme,
    // Couleur choisie par le membre (galerie de modèles) : elle passe avant celle de la conception
    couleur: /^#[0-9a-f]{6}$/i.test(p.couleur_choisie ?? "") ? p.couleur_choisie : /^#[0-9a-f]{6}$/i.test(s.couleur ?? "") ? s.couleur : "#4F46E5",
    // Allure propre à chaque SaaS : deux SaaS construits ne doivent pas se ressembler
    ...(["moderne", "doux", "sombre", "editorial", "vif", "rond", "tech", "elegant", "sport", "geometrique", "nature"].includes(p.allure_choisie) ? { style: p.allure_choisie } : ["moderne", "doux", "sombre", "editorial", "vif", "rond", "tech", "elegant", "sport", "geometrique"].includes(s.style) ? { style: s.style } : {}),
    famille: FAMILLES[s.famille] ? s.famille : famille0,
    interface: FAMILLES[FAMILLES[s.famille] ? s.famille : famille0].interface,
    disposition: ["barre", "haut", "onglets"].includes(s.disposition) ? s.disposition : FAMILLES[FAMILLES[s.famille] ? s.famille : famille0].disposition,
    forme: ["carre", "arrondi", "pilule"].includes(s.forme) ? s.forme : "arrondi",
    fond: ["blanc", "creme", "gris", "sombre"].includes(s.fond) ? s.fond : "blanc",
    slogan: String(s.slogan ?? p.pitch ?? "").slice(0, 90), cible_courte: String(s.cible_courte ?? "").slice(0, 60),
    ...(s.pitch_site ? { pitch: String(s.pitch_site).slice(0, 300) } : {}),
    ...(s.probleme_site ? { probleme: String(s.probleme_site).slice(0, 320) } : {}),
    atouts: (s.atouts ?? []).slice(0, 6),
    faq: (Array.isArray(s.faq) ? s.faq : []).filter((x: any) => x?.q && x?.r).slice(0, 6).map((x: any) => ({ q: String(x.q).slice(0, 140), r: String(x.r).slice(0, 400) })),
    // Formules du site : avantages réécrits pour ne promettre que ce qui est construit (sinon celles du projet)
    formules: (Array.isArray(s.formules) && s.formules.length === Math.min(3, (p.formules ?? []).length) && s.formules.every((f: any) => f?.nom && Number.isFinite(Number(f.prix)) && Array.isArray(f.inclus) && f.inclus.length)
      ? s.formules.slice(0, 3).map((f: any) => ({ nom: String(f.nom).slice(0, 40), prix: Number(f.prix), pour: String(f.pour ?? "").slice(0, 120), inclus: f.inclus.slice(0, 5).map((x: unknown) => String(x).slice(0, 90)).filter((x: string) => !/dès disponible|api\b|chiffr|image|vidéo|import/i.test(x)) }))
      : (p.formules ?? []).slice(0, 3)),
    collections: (s.collections ?? []).slice(0, 8),
    ecrans: (s.ecrans ?? []).slice(0, 8).map((e: any, i: number) => ({ id: slugify(String(e.id ?? `ecran-${i}`)).replace(/-/g, "_") || `ecran_${i}`, titre: String(e.titre ?? `Écran ${i + 1}`).slice(0, 24), icone: ICONES.includes(e.icone) ? e.icone : "liste", but: e.but, fonctions: e.fonctions })),
    demo: sansFaussesImages(demo && typeof demo === "object" && !Array.isArray(demo) ? (demo.demo ?? demo) : {}) as any,
    ...(nature?.espace_principal ? { nature: { espace_principal: String(nature.espace_principal).slice(0, 300), interactions: (nature.interactions ?? []).slice(0, 6).map((x: any) => String(x).slice(0, 160)) } } : {}),
    agenda: s.agenda?.collection && s.agenda?.champ_date ? { collection: String(s.agenda.collection), champ_date: String(s.agenda.champ_date), champ_heure: s.agenda.champ_heure ? String(s.agenda.champ_heure) : null, duree: s.agenda.duree ?? 60, champs_titre: (Array.isArray(s.agenda.champs_titre) ? s.agenda.champs_titre : [s.agenda.champs_titre]).filter(Boolean).slice(0, 2) } : null,
  };
  // Pages publiques (réservation, formulaire, avis…) : écrites comme des écrans, servies sans compte
  const cols = new Set(spec.collections.map((c: any) => c.nom));
  for (const [i, x] of (s.pages_publiques ?? []).slice(0, 2).entries()) {
    const ecriture = cols.has(x?.ecriture) ? x.ecriture : null;
    // La collection d'écriture est toujours lisible (sans les coordonnées des autres visiteurs) : créneaux déjà pris, doublons…
    const lecture = [...new Set([...(Array.isArray(x?.lecture) ? x.lecture : []).filter((c: any) => cols.has(c)), ...(ecriture ? [ecriture] : [])])].slice(0, 4);
    if (!ecriture && !lecture.length && x?.ia !== true) continue;
    spec.ecrans.push({ id: `pub_${slugify(String(x.id ?? i)).replace(/-/g, "_")}`, titre: String(x.titre ?? "Page publique").slice(0, 30), icone: "carte", but: x.but, fonctions: x.fonctions, public: true, lecture, ecriture, ...(x?.ia === true ? { ia: true } : {}) });
  }
  spec.ecrans = spec.ecrans.filter((e: any, i: number) => spec.ecrans.findIndex((x: any) => x.id === e.id) === i);
  if (modele) {
    // Modèle fait main : écrans, collections, données vivantes et agenda viennent du modèle (déjà écrits et testés)
    const m = SPEC[modele](perso);
    Object.assign(spec, { ecrans: m.ecrans, collections: m.collections, demo: m.demo, demo_ancre: m.demo_ancre, agenda: m.agenda, modele, vocab: m.vocab });
    // Modèle propre à une famille (Projets) : la coque suit cette famille, quel que soit le choix de la conception
    if (m.famille && FAMILLES[m.famille]) Object.assign(spec, { famille: m.famille, interface: FAMILLES[m.famille].interface, disposition: m.disposition ?? FAMILLES[m.famille].disposition });
  }
  // Promis sur le site = construit : un écran qui fait vraiment ce que le site promet (IA, relances, PDF) s'il manque
  await ajouterEcransPromis(spec, p).catch((x) => console.error("écrans promis", x));
  // Garde-fou : rien du SaaS d'origine (nom, domaine) dans ce que verront les clients
  const { ecrans: _e, ...visible } = spec;
  Object.assign(spec, sansIdentite(visible, p.inspire ?? {}, p.nom).valeur);
  if (!spec.ecrans.length) throw new Error("La conception de l'application a échoué, réessaie");
  if (modele) {
    // Tous les écrans sont déjà écrits : on met en ligne directement (même chemin que la fin d'une construction classique)
    const e0 = spec.ecrans[0];
    const aEcrire = spec.ecrans.filter((e: any) => !e.code);
    const faits = spec.ecrans.length - aEcrire.length;
    await admin.from("saas_apps").update({ brouillon: spec, etape: `Écriture des écrans (${faits}/${spec.ecrans.length})`, maj: new Date().toISOString() }).eq("id", appId);
    const { data: fin } = await admin.rpc("saas_app_ecran_set", { p_app: appId, p_id: e0.id, p_code: e0.code, p_ok: true });
    if (fin === "pret") { await verifierPromesses(appId).catch((x) => console.error("promesses", x)); await corrigerAccroche(appId).catch((x) => console.error("accroche", x)); await demarrerVerification(appId).catch((x) => console.error("verification", x)); }
    // Écrans ajoutés au modèle pour tenir les promesses du site : écrits comme dans une construction classique
    await Promise.all(aEcrire.map((e: any) => lancerEcran(e.id)));
    return;
  }
  await admin.from("saas_apps").update({ brouillon: spec, etape: `Données d'exemple`, maj: new Date().toISOString() }).eq("id", appId);
  // Données d'exemple puis écrans : dans une autre invocation (limite de durée d'une invocation)
  await lancerEcran("__demo");
  return;
  // En parallèle : écrits un par un, 8 à 10 écrans dépassent la durée maximale d'une invocation (la construction restait bloquée)
  await Promise.all(spec.ecrans.map((e: any) => lancerEcran(e.id)));
}

/** Étape 1 bis (invocation à part) : données d'exemple de l'application, puis écriture de tous les écrans en parallèle. */
export async function saasDemoPuisEcrans(appId: string, lancerEcran: (ecranId: string) => Promise<void>) {
  const { data: app } = await admin.from("saas_apps").select("brouillon").eq("id", appId).single();
  const sp = app?.brouillon as any;
  if (!sp?.ecrans?.length) return;
  const p = { nom: sp.nom, pitch: sp.pitch };
  const s = { collections: sp.collections ?? [] };
  const demo = await askJson<any>(`Application « ${p.nom} » : ${p.pitch}
Collections : ${(s.collections ?? []).slice(0, 8).map((c: any) => `${c.nom} : ${(c.champs ?? []).map((x: any) => `${x.nom} ${x.type}${x.valeurs ? ` [${x.valeurs.join("|")}]` : ""}`).join(", ")}`).join(" ; ")}
Écris les données d'exemple de cette application. Rends un objet JSON { <collection> : 12 éléments réalistes en français (entreprises, personnes, séances ou contenus fictifs selon l'application, montants cohérents, dates réparties entre ${new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10)} et ${new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10)}, aujourd'hui = ${new Date().toISOString().slice(0, 10)}) } ; les champs <collection>_id pointent vers le champ « ref » (ex. "c1") que tu ajoutes à chaque élément.`, { fast: true, maxTokens: 12000 }).catch(() => ({}));
  const d = sansFaussesImages(demo && typeof demo === "object" && !Array.isArray(demo) ? (demo.demo ?? demo) : {}) as any;
  await admin.from("saas_apps").update({ brouillon: { ...sp, demo: d }, etape: `Écriture des écrans (0/${sp.ecrans.length})`, maj: new Date().toISOString() }).eq("id", appId);
  await Promise.all(sp.ecrans.map((e: any) => lancerEcran(e.id)));
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
  let pause = false;
  const r = await ecrire(spec, e).catch((x) => { console.error("ecran", ecranId, x); if (/plafond|pause de sécurité|crédit ia/i.test(String(x?.message ?? x))) pause = true; return { code: "", ok: false }; });
  // Plafond d'IA atteint en pleine construction : l'écran n'est PAS retiré (avant, un SaaS pouvait perdre son écran principal) ;
  // la construction se met en pause et le surveillant (saas-app-envois) la reprend dès que l'IA est de nouveau disponible
  if (pause) { await admin.from("saas_apps").update({ etape: "En pause : reprise automatique dès que possible", maj: new Date().toISOString() }).eq("id", appId); return; }
  r.code = await inspireDe(appId).then((o) => sansIdentite(r.code, o, spec.nom).valeur);
  // Contrat de données (sans IA) : champs et valeurs alignés sur les données du SaaS, première cause de blocs vides et de chiffres à 0
  if (r.code) { const ct = alignerCode(r.code, spec); r.code = ct.code; if (ct.corrections.length || ct.alertes.length) console.log("contrat", ecranId, ct.corrections, ct.alertes); }
  const { data: fin } = await admin.rpc("saas_app_ecran_set", { p_app: appId, p_id: ecranId, p_code: r.code, p_ok: r.ok });
  if (fin === "pret") { await verifierPromesses(appId).catch((x) => console.error("promesses", x)); await corrigerAccroche(appId).catch((x) => console.error("accroche", x)); await demarrerVerification(appId).catch((x) => console.error("verification", x)); }
}

/** Capacités promises par le site (accroche, atouts, formules) mais qu'aucun écran prévu n'utilise :
 *  on ajoute l'écran qui les fait fonctionner pour de vrai (au plus 2), avant l'écriture des écrans. */
async function ajouterEcransPromis(spec: any, p: any) {
  const promis = [spec.pitch, spec.slogan, ...(spec.atouts ?? []).map((a: any) => `${a?.titre ?? ""} ${a?.texte ?? ""}`), ...(spec.formules ?? []).flatMap((f: any) => f?.inclus ?? [])].map((x) => String(x ?? "")).join("\n");
  const ecrans = (spec.ecrans ?? []) as any[];
  // Ce que les écrans prévus font : leur code (modèle fait main) ou leur description (écrans à écrire)
  const fait = ecrans.map((e) => e.code ? String(e.code) : `${e.but ?? ""} ${(e.fonctions ?? []).join(" ")}`).join("\n");
  const codeOuTexte = (re: RegExp, reCode: RegExp) => ecrans.some((e) => e.code ? reCode.test(String(e.code)) : re.test(`${e.but ?? ""} ${(e.fonctions ?? []).join(" ")}`));
  const besoins: { cle: string; quoi: string }[] = [];
  const phrases = (re: RegExp) => promis.split(/\n|(?<=[.;])\s/).filter((l) => re.test(l)).slice(0, 4).join(" ; ");
  const reIa = /\bIA\b|intelligence artificielle|r[ée]dig\w* (automatiquement|par l|pour (toi|vous))/;
  const reRel = /relances?\b|e-?mails? (programm|planifi)|programm\w* .{0,20}e-?mails?/i;
  const rePdf = /\bpdf\b|quittances?\b|factures? (en|au format)|attestations?\b/i;
  if (reIa.test(promis) && !codeOuTexte(/\bIA\b|intelligence artificielle|r[ée]dig|g[ée]n[èe]r|r[ée]sum|reformul/i, /(^|[^A-Za-z0-9_.$])ia\s*\(/))
    besoins.push({ cle: "ia", quoi: `l'IA intégrée de l'application (fonction ia) pour faire pour de vrai : ${phrases(reIa)}` });
  if (reRel.test(promis) && !codeOuTexte(/relance|e-?mail/i, /(^|[^A-Za-z0-9_.$])email\s*\(/))
    besoins.push({ cle: "email", quoi: `de vrais e-mails aux clients (fonction email, avec quand pour les envois planifiés et annulerEmail) pour faire pour de vrai : ${phrases(reRel)}` });
  if (rePdf.test(promis) && !codeOuTexte(/pdf|devis|facture|document/i, /pdf\w*\s*\(/i))
    besoins.push({ cle: "pdf", quoi: `la génération de PDF (fonction pdf) pour faire pour de vrai : ${phrases(rePdf)}` });
  if (!besoins.length) return;
  const cols = (spec.collections ?? []).map((c: any) => `${c.nom} (${(c.champs ?? []).map((x: any) => x.nom).join(", ")})`).join(" ; ");
  const r = await askJson<any>(`Application « ${spec.nom} » pour ${spec.cible ?? p?.cible ?? ""}. Écrans existants : ${ecrans.map((e) => e.titre).join(", ")}. Collections : ${cols}.
Le site promet des fonctions qu'aucun écran ne fait encore. Conçois UN écran par besoin ci-dessous, qui fait vraiment la chose avec les données existantes (saisie → résultat → enregistrement) :
${besoins.map((b, i) => `${i + 1}. ${b.quoi}`).join("\n")}
Rends {"ecrans": [{ "cle": "ia|email|pdf", "id": "snake_case court, différent des écrans existants", "titre": "2 mots au plus", "icone": "parmi ${ICONES.join(", ")}", "but": "une phrase", "fonctions": ["3 à 5 éléments courts, dont l'appel à la fonction de l'application"], "collection": null ou { "nom", "label", "champs": [{ "nom", "type" }] } si l'écran doit garder ses résultats et qu'aucune collection ne convient }]}`, { fast: true, maxTokens: 1500 });
  for (const n of (Array.isArray(r?.ecrans) ? r.ecrans : []).slice(0, 2)) {
    let id = slugify(String(n.id ?? n.cle ?? "assistant")).replace(/-/g, "_") || "assistant";
    if (ecrans.some((e) => e.id === id)) id += "_2";
    if (n.collection?.nom && !(spec.collections ?? []).some((c: any) => c.nom === n.collection.nom)) spec.collections = [...(spec.collections ?? []), n.collection];
    // Placé avant les pages publiques, après les écrans de l'application
    const e = { id, titre: String(n.titre ?? "Assistant").slice(0, 24), icone: ICONES.includes(n.icone) ? n.icone : (n.cle === "email" ? "mail" : n.cle === "pdf" ? "fichier" : "message"), but: n.but, fonctions: n.fonctions };
    const k = ecrans.findIndex((x) => x.public);
    if (k < 0) ecrans.push(e); else ecrans.splice(k, 0, e);
  }
  spec.ecrans = ecrans;
}

/** Mise à niveau d'un SaaS déjà livré : si son site promet une fonction qu'aucun écran ne fait (IA, e-mails, PDF),
 *  on écrit l'écran manquant. L'application reste en ligne pendant ce temps ; la nouvelle version remplace l'ancienne à la fin. */
export async function saasMettreANiveau(appId: string, lancerEcran: (ecranId: string) => Promise<void>) {
  const { data: a } = await admin.from("saas_apps").select("spec, statut, brouillon, projet_id").eq("id", appId).single();
  if (!a || a.statut !== "pret" || a.brouillon) return { ajoutes: [] as string[] };
  const spec = structuredClone(a.spec) as any;
  const avant = new Set((spec.ecrans ?? []).map((e: any) => e.id));
  await ajouterEcransPromis(spec, {});
  const nouveaux = (spec.ecrans ?? []).filter((e: any) => !avant.has(e.id) && !e.code);
  if (!nouveaux.length) { await verifierPromesses(appId); return { ajoutes: [] as string[], relu: true }; }
  await admin.from("saas_apps").update({ brouillon: spec, maj: new Date().toISOString() }).eq("id", appId);
  for (const e of nouveaux) await lancerEcran(e.id);
  return { ajoutes: nouveaux.map((e: any) => e.titre) };
}

/** Relecture du site par l'IA : chaque atout, avantage de formule et réponse de FAQ doit correspondre à un écran réel.
 *  Ce qui n'est fait par aucun écran est retiré (les règles automatiques de la base ne voient que l'IA, les e-mails, les PDF…). */
export async function verifierPromesses(appId: string) {
  const { data: a } = await admin.from("saas_apps").select("spec").eq("id", appId).single();
  const s = a?.spec as any;
  if (!s?.ecrans?.length) return;
  const items: { k: string; t: string }[] = [];
  (s.atouts ?? []).forEach((x: any, i: number) => items.push({ k: `a${i}`, t: `${x?.titre ?? ""} : ${x?.texte ?? ""}` }));
  (s.formules ?? []).forEach((f: any, i: number) => (f?.inclus ?? []).forEach((x: any, j: number) => items.push({ k: `f${i}_${j}`, t: String(x) })));
  (s.faq ?? []).forEach((x: any, i: number) => items.push({ k: `q${i}`, t: `${x?.q ?? ""} → ${x?.r ?? ""}` }));
  if (!items.length) return;
  const ecrans = s.ecrans.map((e: any) => `- ${e.titre}${e.public ? " (page publique)" : ""} : ${e.but ?? ""}${e.fonctions?.length ? ` (${e.fonctions.join(", ")})` : ""}`).join("\n");
  const c = s.capacites ?? {};
  const sait = [c.ia && "une IA intégrée (rédiger, reformuler, résumer, analyser)", c.email && "envoyer de vrais e-mails, tout de suite ou planifiés (confirmations, rappels, relances)",
    !c.email && c.rappel && "un e-mail de confirmation puis un rappel automatique la veille quand un client réserve", !c.email && c.email_recu && "un e-mail de confirmation quand un client envoie une demande",
    c.pdf && "générer des PDF", c.agenda && "un agenda auquel on s'abonne depuis Google Agenda ou Outlook", "inviter son équipe", "exporter toutes ses données", "un essai gratuit puis un abonnement"].filter(Boolean);
  const r = await askJson<any>(`Application « ${s.nom} ». Ses écrans réels (les pages publiques sont ouvertes à ses clients, sans compte) :
${ecrans}
Elle sait aussi : ${sait.join(" ; ")}.
Voici des phrases de son site. Repère UNIQUEMENT celles qui promettent une fonction précise qu'aucun écran ni aucune capacité ci-dessus ne fait (exemples de fausses promesses : signature électronique, état des lieux, export comptable, synchronisation bancaire, application mobile native, prévisions par IA alors qu'il n'y a pas d'IA).
Un argument de prix, de simplicité, d'hébergement, de support, de nombre d'utilisateurs ou de sans-engagement est vrai. Une phrase qui décrit, même avec d'autres mots, un écran ou une capacité de la liste est vraie. Dans le doute, considère la phrase vraie.
${items.map((x) => `${x.k} : ${x.t}`).join("\n")}
Rends {"faux": ["clés des phrases fausses"]}`, { fast: true, maxTokens: 400 }).catch(() => null);
  const faux = new Set((Array.isArray(r?.faux) ? r.faux : []).map(String));
  if (!faux.size || faux.size > items.length / 2) return;
  const atouts = (s.atouts ?? []).filter((_: any, i: number) => !faux.has(`a${i}`));
  const formules = (s.formules ?? []).map((f: any, i: number) => {
    const inclus = (f?.inclus ?? []).filter((_: any, j: number) => !faux.has(`f${i}_${j}`));
    return { ...f, inclus: inclus.length ? inclus : i ? [`Tout ${s.formules[i - 1]?.nom ?? "le reste"}`] : s.ecrans.filter((e: any) => !e.public).slice(0, 3).map((e: any) => e.titre) };
  });
  const faq = (s.faq ?? []).filter((_: any, i: number) => !faux.has(`q${i}`));
  // Atouts trop peu nombreux : complétés depuis les vrais écrans (comme le fait la base)
  for (const e of s.ecrans.filter((e: any) => !e.public)) { if (atouts.length >= 3) break; if (!atouts.some((x: any) => x.titre === e.titre)) atouts.push({ titre: e.titre, texte: e.but ?? "" }); }
  await admin.from("saas_apps").update({ spec: { ...s, atouts, formules, faq } }).eq("id", appId);
}

/** Le site ne promet que ce que l'application fait : la base retire les atouts et avantages faux et signale
 *  une accroche qui promet trop (spec.capacites.pitch_ko) ; on la réécrit ici, d'après les vrais écrans. */
export async function corrigerAccroche(appId: string) {
  const { data: a } = await admin.from("saas_apps").select("spec").eq("id", appId).single();
  const s = a?.spec as any, c = s?.capacites;
  if (!c?.pitch_ko) return;
  const sait = [
    c.ia && "son IA intégrée (rédiger, reformuler, résumer, analyser)",
    c.email && "envoyer de vrais e-mails aux clients, tout de suite ou planifiés (confirmations, rappels, relances)",
    !c.email && c.rappel && "un e-mail de confirmation puis un rappel la veille quand un client réserve",
    !c.email && !c.rappel && c.email_recu && "un e-mail de confirmation quand un client envoie une demande",
    c.pdf && "générer des PDF (devis, factures, documents)",
    c.agenda && "un agenda auquel on s'abonne depuis Google Agenda ou Outlook",
  ].filter(Boolean);
  const ecrans = (s.ecrans ?? []).map((e: any) => `${e.titre}${e.public ? " (page publique pour les clients)" : ""} : ${e.but ?? ""}`).join(" ; ");
  for (let essai = 0; essai < 2; essai++) {
    const r = await askJson<any>(`Site du SaaS « ${s.nom} » (${s.cible_courte ?? s.cible ?? ""}).
Accroche actuelle : « ${s.pitch} »
Slogan actuel : « ${s.slogan} »
Elle promet des choses que l'application ne fait pas. Ce que l'application fait VRAIMENT : ses écrans — ${ecrans}.${sait.length ? ` Elle sait aussi : ${sait.join(" ; ")}.` : ""}
Elle ne fait rien d'autre${c.ia ? "" : " : pas d'IA"}${c.email ? "" : c.rappel ? ", pas de relances par e-mail" : ", pas d'e-mails programmés"}, pas de SMS, pas d'intégration ni d'import, pas d'API.
Réécris en français naturel, au même ton : pitch (35 mots au plus, garde tout ce qui est vrai dans l'accroche actuelle) et slogan (8 mots au plus, garde l'actuel s'il est vrai). Aucun chiffre inventé. Rends {"pitch": "...", "slogan": "..."}.`, { fast: true, maxTokens: 400 });
    const pitch = String(r?.pitch ?? "").trim().slice(0, 300), slogan = String(r?.slogan ?? s.slogan ?? "").trim().slice(0, 90);
    if (!pitch) continue;
    const { data: ko1 } = await admin.rpc("saas_promesse_ko", { t: pitch, caps: c });
    const { data: ko2 } = await admin.rpc("saas_promesse_ko", { t: slogan, caps: c });
    if (ko1 || ko2) continue;
    await admin.from("saas_apps").update({ spec: { ...s, pitch, slogan } }).eq("id", appId);
    return;
  }
}

/** Modifie un écran à la demande (ou en ajoute un si ecranId = "nouveau"). */
// La modification s'écrit dans le brouillon (aperçu) : le créateur la voit, puis la met en ligne ou l'abandonne.
// Mêmes polices que POLICES dans src/lib/appShell.js (la coque les charge)
const POLICES_ALLURE: Record<string, [string, string]> = { moderne: ["Inter", "Inter"], doux: ["Plus Jakarta Sans", "Plus Jakarta Sans"], sombre: ["Manrope", "Manrope"], editorial: ["Inter", "Fraunces"], vif: ["DM Sans", "DM Sans"], rond: ["Nunito", "Nunito"], tech: ["Inter", "Space Grotesk"], elegant: ["Inter", "Playfair Display"], sport: ["Barlow", "Barlow Condensed"], geometrique: ["Outfit", "Outfit"] };
const POLICES_ATELIER = ["Inter", "Plus Jakarta Sans", "Manrope", "DM Sans", "Nunito", "Space Grotesk", "Outfit", "Poppins", "Montserrat", "Raleway", "Lato", "Open Sans", "Roboto", "Work Sans", "Sora", "Lexend", "Barlow", "Barlow Condensed", "Rubik", "Quicksand", "Fraunces", "Playfair Display", "Lora", "Merriweather", "DM Serif Display", "Cormorant Garamond", "Bebas Neue", "Oswald", "Archivo", "Urbanist"];
/** Atelier, « modifier un texte » : le texte cliqué dans l'aperçu est remplacé tel quel, sans IA (gratuit, instantané).
 *  Ordre : textes du site, puis l'écran où il a été cliqué, puis les autres écrans, puis les données d'exemple.
 *  Rend { ok: false } s'il n'est pas trouvé (texte calculé à l'affichage) : l'atelier passe alors par l'IA. */
export async function saasModifierTexte(appId: string, avant0: string, apres0: string, ecranId: string | null) {
  const net = (x: unknown) => String(x ?? "").replace(/\s+/g, " ").trim();
  const avant = net(avant0).slice(0, 500);
  // Le nouveau texte ne doit rien casser dans le code de l'écran : pas de guillemets droits, accents graves, accolades, chevrons ni barres obliques inverses
  const apres = net(apres0).slice(0, 500).replace(/'/g, "’").replace(/"/g, "”").replace(/[`$<>{}\\]/g, "");
  if (avant.length < 2 || avant === apres) return { ok: true, n: 0 };
  const { data: app } = await admin.from("saas_apps").select("spec, brouillon, version").eq("id", appId).single();
  const spec = structuredClone(app?.spec ?? {}) as any;
  let n = 0;
  const profond = (v: any): any => typeof v === "string" ? (v.includes(avant) ? (n++, v.split(avant).join(apres)) : v) : Array.isArray(v) ? v.map(profond) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, y]) => [k, profond(y)])) : v;
  for (const k of ["nom", "slogan", "pitch", "probleme", "cible_courte", "cible", "atouts", "faq", "formules"]) if (spec[k] != null) spec[k] = profond(spec[k]);
  if (!n) {
    const ident = (c: string | undefined) => !!c && /[A-Za-z0-9_$]/.test(c);
    const dansCode = (code: string) => { let out = "", i = 0, k = 0; while ((k = code.indexOf(avant, i)) >= 0) { if (!ident(code[k - 1]) && !ident(code[k + avant.length])) { out += code.slice(i, k) + apres; n++; } else out += code.slice(i, k + avant.length); i = k + avant.length; } return out + code.slice(i); };
    const ordre = [...(spec.ecrans ?? [])].sort((a: any, b: any) => (b.id === ecranId ? 1 : 0) - (a.id === ecranId ? 1 : 0));
    for (const e of ordre) { if (typeof e.code !== "string") continue; const c = dansCode(e.code); if (n) { e.code = c; e.modifie = true; break; } }
  }
  if (!n && spec.demo) spec.demo = profond(spec.demo);
  if (!n) return { ok: false, n: 0 };
  const b = app?.brouillon as any;
  await admin.from("saas_apps").update({ spec, ...(b?._modif ? { brouillon: { ...spec, _modif: b._modif } } : {}), version: (app?.version ?? 0) + 1, maj: new Date().toISOString() }).eq("id", appId);
  return { ok: true, n };
}

/** Atelier : une demande en langage courant, exécutée en entier (réglages, textes du site, prix, écrans à modifier, ajouter,
 *  supprimer, renommer, réordonner). Le premier écran écrit est compris dans la modification ; chaque écran en plus est payé
 *  par « payer » (modification du mois ou 1 crédit). S'il n'y a plus de quoi payer, Bingoo! s'arrête et le dit. */
export async function saasModifierEcran(appId: string, ecranId: string, demande: string, suggestion: string | null = null, payer: (() => Promise<boolean>) | null = null, extra: { images?: string[]; element?: string | null } = {}) {
  const images = (extra.images ?? []).slice(0, 4), element = extra.element ? String(extra.element).slice(0, 400) : null;
  // Une modification déjà en attente d'aperçu : la nouvelle s'ajoute par-dessus (on met en ligne le tout)
  const { data: app } = await admin.from("saas_apps").select("spec, brouillon, version").eq("id", appId).single();
  const enAttente = (app?.brouillon as any)?._modif ? (app!.brouillon as any) : null;
  const spec = structuredClone(enAttente ?? (app?.spec ?? {})) as any;
  const avant = enAttente?._modif?.liste ?? (enAttente?._modif ? [enAttente._modif] : []);
  delete spec._modif;
  const ecrans0 = (spec.ecrans ?? []) as any[];
  const plan = await askJson<any>(`Tu es l'atelier de Bingoo! : tu transformes la demande d'un utilisateur sur SON SaaS en actions précises.
SaaS « ${spec.nom} » — ${spec.pitch ?? ""}
Réglages actuels : police du texte ${spec.police ?? (POLICES_ALLURE[spec.style] ?? POLICES_ALLURE.moderne)[0]}, police des titres ${spec.police_titres ?? spec.police ?? (POLICES_ALLURE[spec.style] ?? POLICES_ALLURE.moderne)[1]}, couleur ${spec.couleur}, style ${spec.style ?? "moderne"}, fond ${spec.fond ?? "blanc"}, forme ${spec.forme ?? "arrondi"}, disposition ${spec.disposition ?? "barre"}, slogan « ${spec.slogan ?? ""} », cible « ${spec.cible_courte ?? ""} ».
Site : problème « ${spec.probleme ?? ""} » ; atouts ${JSON.stringify((spec.atouts ?? []).slice(0, 6))} ; FAQ ${JSON.stringify((spec.faq ?? []).slice(0, 6))} ; formules ${JSON.stringify((spec.formules ?? []).slice(0, 3))}.
Écrans (dans l'ordre) : ${ecrans0.map((x) => `${x.id} « ${x.titre} »${x.public ? " (page publique)" : ""}`).join(", ")}.
${ecranId !== "nouveau" ? `L'utilisateur a désigné l'écran : ${ecranId}.\n` : ""}${element ? `L'utilisateur a POINTÉ cet élément dans l'aperçu, la demande porte sur lui : ${element}\n` : ""}${images.length ? `Images jointes par l'utilisateur (tu les vois, dans cet ordre) : ${images.map((u, i) => `${i + 1}) ${u}`).join(" ; ")}.
Selon la demande : son logo → reglages.logo = l'adresse ; une image à afficher en haut de la page d'accueil → site.image_accueil = l'adresse ; une image à mettre dans un écran → la consigne de cet écran avec l'adresse exacte à utiliser dans une balise img ; une capture d'un modèle à imiter → traduis-la en réglages précis (couleur hexadécimale, police, fond, allure, menu) et en consignes d'écrans détaillées (disposition, éléments, ordre).\n` : ""}Demande : « ${demande} »
Rends un objet JSON avec SEULEMENT ce que la demande change :
- reglages : { couleur (#xxxxxx assez foncé pour du texte blanc ; rose = #BE185D), style (moderne|doux|sombre|editorial|vif|rond|tech|elegant|sport|geometrique), fond (blanc|creme|gris|sombre), forme (carre|arrondi|pilule), disposition (barre|haut|onglets), police (police du texte, parmi ${POLICES_ATELIER.join(", ")}), police_titres (police des titres, même liste ; si l'utilisateur demande juste « une autre police », choisis-en une nettement différente des DEUX actuelles et mets la même dans police et police_titres), nom (40 car.), slogan (8 mots), pitch (35 mots), cible_courte (5 mots) }
- site : { image_accueil (adresse d'une image jointe, ou null pour la retirer), probleme (2 phrases), atouts (liste COMPLÈTE de 3 à 6 { titre, texte }), faq (liste COMPLÈTE de { q, r }), formules (liste COMPLÈTE de 1 à 3 { nom, prix (nombre, euros par mois), pour, inclus (3 à 5) }) }
- supprimer : ids d'écrans à retirer
- renommer : [{ id, titre (2 mots), icone (parmi ${ICONES.join(", ")}) }]
- ordre : la liste complète des ids dans le nouvel ordre, ou null
- ecrans : écrans à écrire, au plus 4 : [{ id (id existant à modifier, ou "nouveau"), consigne (ce qu'il faut faire sur cet écran, précis) }]
- impossible : [{ demande (la partie de la demande qui ne peut pas être faite), alternative (ce que tu fais à la place, et que tu mets dans les écrans) }], ou []
LIMITES : les SaaS de Bingoo! envoient de vrais e-mails (tout de suite ou programmés), font des PDF, utilisent l'IA, stockent des fichiers et des images, ont des pages publiques et l'abonnement au SaaS par Stripe. Ils ne savent PAS : envoyer des SMS ou passer des appels, envoyer des notifications sur téléphone, encaisser un paiement par carte dans un écran (paiement des clients de l'utilisateur), faire de la visioconférence, se connecter à un autre service (Google Agenda, réseaux sociaux, logiciel comptable, WhatsApp…), publier automatiquement sur les réseaux, lire un code-barres. Si la demande en touche une, ne fais jamais semblant : mets-la dans impossible et fais l'alternative la plus proche (ex. rappel par SMS → rappel par e-mail programmé ; paiement en ligne → lien de paiement saisi par l'utilisateur et statut « payé »).
Un changement de couleur, de police, d'allure, de nom, de textes du site ou de prix ne demande AUCUN écran. Rends {} pour ce qui ne change pas.`, { fast: true, maxTokens: 2500, images }).catch((x) => { console.error("atelier plan", x?.message ?? x); if (/pause|plafond|crédit/i.test(String(x?.message ?? x))) throw x; return { ecrans: [{ id: ecranId, consigne: demande }] }; });
  const faits: string[] = [], rates: string[] = [];
  // 0. Limites : ce que Bingoo! ne sait pas faire est dit clairement, avec l'alternative faite à la place
  for (const x of (Array.isArray(plan?.impossible) ? plan.impossible : []).slice(0, 3)) if (x?.demande) rates.push(`${String(x.demande).slice(0, 120)} : impossible dans un SaaS Bingoo!${x.alternative ? ` ; à la place : ${String(x.alternative).slice(0, 160)}` : ""}`);
  // 1. Réglages globaux
  const R = plan?.reglages && typeof plan.reglages === "object" ? plan.reglages : {};
  const ENUM: Record<string, string[]> = { style: ["moderne", "doux", "sombre", "editorial", "vif", "rond", "tech", "elegant", "sport", "geometrique", "nature"], fond: ["blanc", "creme", "gris", "sombre"], forme: ["carre", "arrondi", "pilule"], disposition: ["barre", "haut", "onglets"] };
  if (/^#[0-9a-f]{6}$/i.test(String(R.couleur ?? "")) && String(R.couleur).toLowerCase() !== String(spec.couleur ?? "").toLowerCase()) { spec.couleur = R.couleur; faits.push("couleur"); }
  for (const k of Object.keys(ENUM)) if (ENUM[k].includes(R[k]) && R[k] !== spec[k]) { spec[k] = R[k]; faits.push(k === "style" ? "allure" : k); }
  for (const [k, l] of [["police", "police du texte"], ["police_titres", "police des titres"]] as [string, string][]) if (POLICES_ATELIER.includes(R[k]) && R[k] !== spec[k]) { spec[k] = R[k]; faits.push(l + " : " + R[k]); }
  for (const [k, n, l] of [["nom", 40, "nom"], ["slogan", 90, "slogan"], ["pitch", 300, "accroche"], ["cible_courte", 60, "cible"]] as [string, number, string][]) if (typeof R[k] === "string" && R[k].trim() && R[k].trim().slice(0, n) !== spec[k]) { spec[k] = R[k].trim().slice(0, n); faits.push(l); }
  if (typeof R.logo === "string" && images.includes(R.logo) && R.logo !== spec.logo) { spec.logo = R.logo; faits.push("logo"); }
  // 2. Textes et prix du site
  const S = plan?.site && typeof plan.site === "object" ? plan.site : {};
  if (typeof S.image_accueil === "string" && images.includes(S.image_accueil) && S.image_accueil !== spec.image_accueil) { spec.image_accueil = S.image_accueil; faits.push("image de l'accueil"); }
  else if (S.image_accueil === null && spec.image_accueil) { delete spec.image_accueil; faits.push("image de l'accueil retirée"); }
  if (typeof S.probleme === "string" && S.probleme.trim() && S.probleme.trim().slice(0, 320) !== spec.probleme) { spec.probleme = S.probleme.trim().slice(0, 320); faits.push("texte du site"); }
  if (Array.isArray(S.atouts) && S.atouts.length && JSON.stringify(S.atouts) !== JSON.stringify(spec.atouts)) { spec.atouts = S.atouts.filter((x: any) => x?.titre).slice(0, 6).map((x: any) => ({ titre: String(x.titre).slice(0, 60), texte: String(x.texte ?? "").slice(0, 200) })); faits.push("atouts"); }
  if (Array.isArray(S.faq) && S.faq.length && JSON.stringify(S.faq) !== JSON.stringify(spec.faq)) { spec.faq = S.faq.filter((x: any) => x?.q && x?.r).slice(0, 8).map((x: any) => ({ q: String(x.q).slice(0, 140), r: String(x.r).slice(0, 400) })); faits.push("questions fréquentes"); }
  if (Array.isArray(S.formules) && S.formules.length) { const f = S.formules.filter((x: any) => x?.nom && Number.isFinite(Number(x.prix))).slice(0, 3).map((x: any) => ({ nom: String(x.nom).slice(0, 40), prix: Math.max(0, Number(x.prix)), pour: String(x.pour ?? "").slice(0, 120), inclus: (Array.isArray(x.inclus) ? x.inclus : []).slice(0, 5).map((y: unknown) => String(y).slice(0, 90)) })); const cle = (xs: any[]) => JSON.stringify((xs ?? []).map((x: any) => [x.nom, Number(x.prix), x.pour ?? "", x.inclus ?? []])); if (f.length && cle(f) !== cle(spec.formules)) { spec.formules = f; faits.push("formules et prix"); } }
  // 3. Structure : supprimer, renommer, réordonner (jamais le dernier écran privé)
  for (const id of (Array.isArray(plan?.supprimer) ? plan.supprimer : []).map(String)) {
    const e = spec.ecrans.find((x: any) => x.id === id);
    if (!e || (!e.public && spec.ecrans.filter((x: any) => !x.public).length <= 1)) continue;
    spec.ecrans = spec.ecrans.filter((x: any) => x.id !== id); faits.push(`« ${e.titre} » retiré`);
  }
  for (const r of Array.isArray(plan?.renommer) ? plan.renommer : []) {
    const e = spec.ecrans.find((x: any) => x.id === String(r?.id ?? "")); if (!e) continue;
    if (r.titre) { faits.push(`« ${e.titre} » renommé « ${String(r.titre).slice(0, 24)} »`); e.titre = String(r.titre).slice(0, 24); }
    if (ICONES.includes(r.icone)) e.icone = r.icone;
  }
  if (Array.isArray(plan?.ordre) && plan.ordre.length) {
    const rang = new Map(plan.ordre.map((id: unknown, i: number) => [String(id), i]));
    const avantOrdre = spec.ecrans.map((x: any) => x.id).join();
    spec.ecrans = [...spec.ecrans].sort((x: any, y: any) => (rang.get(x.id) ?? 99) - (rang.get(y.id) ?? 99));
    if (spec.ecrans.map((x: any) => x.id).join() !== avantOrdre) faits.push("ordre des écrans");
  }
  // 4. Écrans à écrire : le premier est compris, chaque écran en plus est payé (modification du mois ou crédit)
  let aEcrire = (Array.isArray(plan?.ecrans) ? plan.ecrans : []).filter((x: any) => x?.consigne).slice(0, 4).map((x: any) => ({ id: String(x.id ?? "nouveau"), consigne: String(x.consigne).slice(0, 1200) }));
  if (!faits.length && !aEcrire.length) aEcrire = [{ id: ecranId, consigne: (element ? `Sur l'élément ${element} : ` : "") + demande }];
  let dernier: any = null;
  for (const [i, t] of aEcrire.entries()) {
    if (i > 0 && payer && !(await payer())) { rates.push(`${aEcrire.length - i} écran(s) non faits : plus de modifications ni de crédits`); break; }
    let e = spec.ecrans.find((x: any) => x.id === t.id);
    try {
      if (!e) {
        const n = await askJson<any>(`${contexteSpec(spec)}\nL'utilisateur veut un nouvel écran : ${t.consigne}\nRends un objet JSON id (snake_case court, différent des écrans existants), titre (2 mots au plus), icone (parmi ${ICONES.join(", ")}), but, fonctions (3 à 6), collection (null, ou un nouvel objet nom + label + champs [{ nom, type }] si l'écran a besoin de nouvelles données).`, { fast: true, maxTokens: 1200 });
        e = { id: slugify(String(n.id ?? "ecran")).replace(/-/g, "_") || "ecran", titre: String(n.titre ?? "Nouvel écran").slice(0, 24), icone: ICONES.includes(n.icone) ? n.icone : "liste", but: n.but, fonctions: n.fonctions };
        while (spec.ecrans.some((x: any) => x.id === e.id)) e.id += "_2";
        if (n.collection?.nom && !(spec.collections ?? []).some((c: any) => c.nom === n.collection.nom)) spec.collections = [...(spec.collections ?? []), n.collection];
        const r = await ecrire(spec, e);
        if (!r.ok || !r.code) throw new Error("écrit incorrectement");
        Object.assign(e, r); spec.ecrans = [...spec.ecrans, e]; faits.push(`écran « ${e.titre} » ajouté`);
      } else {
        const r = await ecrire(spec, e, t.consigne, e.code);
        if (!r.ok) throw new Error("écrit incorrectement");
        // Écran personnalisé à la demande de l'utilisateur : les mises à jour du modèle ne l'écraseront plus
        Object.assign(e, r, { modifie: true }); faits.push(`écran « ${e.titre} » modifié`);
      }
      e.code = sansIdentite(e.code, await inspireDe(appId), spec.nom).valeur;
      dernier = e;
    } catch (x) { console.error("atelier écran", (x as any)?.message ?? x); if (/pause|plafond|crédit/i.test(String((x as any)?.message ?? x))) throw x; rates.push(`écran « ${e?.titre ?? t.consigne.slice(0, 30)} » : à reformuler`); }
  }
  if (!faits.length) throw new Error(rates[0] ? `Rien n'a pu être fait (${rates.join(" ; ")}). Reformule ta demande.` : "La modification n'a pas pu être écrite correctement, reformule ta demande");
  const m = { demande, ecran: dernier?.id ?? null, titre: faits.join(", ").slice(0, 300), faits, rates, nouveau: false, suggestion, at: new Date().toISOString() };
  spec._modif = { ...m, liste: [...avant.map(({ liste: _l, ...x }: any) => x), m] };
  await admin.from("saas_apps").update({ brouillon: spec, statut: "pret", etape: null, erreur: null, maj: new Date().toISOString() }).eq("id", appId);
}

/** Réparation après la vérification : l'écran plante ou n'a pas été écrit ; on le réécrit avec l'erreur constatée. */
/** Fin de l'écriture : Bingoo! ne dit pas encore « prêt ». La boucle tester → corriger commence (robot, puis saas-app-verif),
 *  et le journal ne contient que de vrais événements, affichés au membre en direct. */
export async function demarrerVerification(appId: string) {
  const { data: a } = await admin.from("saas_apps").select("spec, version, projet_id").eq("id", appId).single();
  const sp = (a?.spec ?? {}) as any;
  // Par où le membre est entré (idée libre, galerie de modèles, exploration des SaaS) : mesuré pour savoir quel parcours pousser
  const { data: pj } = await admin.from("saas_projets").select("data").eq("id", a?.projet_id ?? "").maybeSingle();
  const entree = (pj?.data as any)?.entree ?? ((pj?.data as any)?.modele_force ? "modele" : "explorer");
  const n = (sp.ecrans ?? []).length;
  const maintenant = new Date().toISOString();
  await admin.from("saas_apps").update({ verif: {
    phase: "en_cours", version: null, essais: {}, en_reparation: [], passages: 0, ok: false,
    journal: [{ at: maintenant, t: `Les ${n} écrans sont écrits. Je les teste un par un, comme un vrai utilisateur.`, type: "info" }],
    mesure: { debut: maintenant, famille: sp.famille ?? null, modele: sp.modele ?? null, entree, ecrans: n, essais: 0, cout: 0 },
  } }).eq("id", appId);
}

export async function saasReparerEcran(appId: string, ecranId: string, erreur: string) {
  const { data: app } = await admin.from("saas_apps").select("spec").eq("id", appId).single();
  const spec = app?.spec as any;
  const e = spec?.ecrans?.find((x: any) => x.id === ecranId);
  if (!e) return false;
  // Écran d'un modèle fait main : jamais réécrit par l'IA (il est testé ; un souci vient alors des données, pas du code)
  if (e.modele) return false;
  const r = e.code
    ? await ecrire(spec, e, `À l'ouverture, avec les données d'exemple, l'écran a ce problème : « ${erreur.slice(0, 650)} ». Trouve la cause (donnée absente, nom de champ ou valeur de statut différents de ceux des données d'exemple, champ d'un autre type que prévu, composant ui mal utilisé, variable non définie) et corrige-la sans changer ce que fait l'écran. Protège chaque accès aux données (valeurs absentes, listes vides).`, e.code)
    : await ecrire(spec, e);
  if (!r.ok) return false;
  await admin.rpc("saas_app_code_set", { p_app: appId, p_id: ecranId, p_code: sansIdentite(r.code, await inspireDe(appId), spec.nom).valeur });
  return true;
}
