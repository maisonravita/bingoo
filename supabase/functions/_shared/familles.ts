// Familles de produits : chaque catégorie de logiciel a sa logique d'interface, ses composants et ses interactions.
// Ce ne sont pas des gabarits figés : ce sont des guides que le générateur adapte au produit d'origine analysé.
// Un SaaS de prise de notes doit ressembler à un outil de prise de notes, pas à un logiciel de gestion.
// deno-lint-ignore-file no-explicit-any

export type Famille = {
  label: string;
  quand: string;            // pour reconnaître la famille du produit d'origine
  interface: string;        // aspect général pour la coque (gestion = outil de travail ; sinon appli, outil, contenu…)
  disposition: string;      // barre | haut | onglets
  accueil: string;          // ce qu'est le premier écran
  guide: string;            // consignes d'écriture des écrans de cette famille
};

const SANS_GESTION = "INTERDIT sur l'écran principal : ui.Table, une rangée de ui.Stat, un « Tableau de bord » d'indicateurs. Les mots « gestion », « fiches », « exporter » sont à éviter.";

export const FAMILLES: Record<string, Famille> = {
  gestion: {
    label: "Gestion et administration", quand: "logiciel de travail qui suit des dossiers, des clients, des stocks, des factures, des biens",
    interface: "gestion", disposition: "barre", accueil: "« Tableau de bord » : indicateurs calculés, activité récente, ce qui demande une action",
    guide: `FAMILLE : GESTION ET ADMINISTRATION (outil de travail pour des pros).
- Tableau de bord : 3 ou 4 ui.Stat calculés, au moins un graphique, et la liste de ce qui demande une action aujourd'hui.
- Listes en ui.Table (recherche, tri, export déjà inclus), fiche détaillée en ui.Modal, statuts en ui.Badge, ce qui avance par étapes en ui.Kanban, ce qui est daté en ui.Calendrier.`,
  },
  reservation: {
    label: "Réservation et calendrier", quand: "prise de rendez-vous, réservation de créneaux, d'activités ou de ressources",
    interface: "gestion", disposition: "barre", accueil: "« Agenda » ou « Mes rendez-vous » : la semaine à venir et les demandes à traiter",
    guide: `FAMILLE : RÉSERVATION ET CALENDRIER.
- Le cœur : un vrai calendrier (ui.Calendrier) des réservations, des types de rendez-vous avec durée et prix, des disponibilités par jour de la semaine, et la page publique de réservation avec ui.Creneaux (vrais créneaux libres).
- Accueil : les prochains rendez-vous en grand, les demandes à confirmer avec boutons Confirmer et Refuser, puis un lien « Copier mon lien de réservation ».
- Confirmation et rappel par e-mail à chaque réservation (email avec quand, rappel_id gardé et annulé si le rendez-vous change).`,
  },
  crm: {
    label: "CRM et relation client", quand: "suivi de prospects, d'affaires, de relances commerciales, de la relation avec les clients",
    interface: "gestion", disposition: "barre", accueil: "« Pipeline » : les affaires en colonnes par étape, à faire glisser",
    guide: `FAMILLE : CRM ET RELATION CLIENT.
- Le cœur : un pipeline ui.Kanban (étapes de vente, cartes avec montant et contact, glisser-déposer), une fiche contact avec son historique d'échanges, des tâches et relances datées, l'envoi d'un vrai e-mail depuis la fiche.
- Accueil : le pipeline, ou les relances du jour et ce qui est en retard.`,
  },
  projets: {
    label: "Gestion de projets", quand: "tableaux de tâches, projets, sprints, suivi d'équipe, listes et cartes",
    interface: "appli", disposition: "barre", accueil: "« Tableaux » : la liste des tableaux, puis le tableau ouvert en colonnes",
    guide: `FAMILLE : GESTION DE PROJETS (façon tableau de cartes, PAS un logiciel de gestion).
- Le cœur : des TABLEAUX (collection tableaux), chacun avec SES COLONNES personnalisables (collection colonnes : tableau_id, nom, ordre) que l'utilisateur ajoute, renomme, réordonne et supprime, et des CARTES (collection cartes : tableau_id, colonne_id, titre, description, responsable, echeance, etiquettes, ordre, cases).
- ui.Kanban avec colonnes = les colonnes du tableau ouvert (pas une liste de statuts figée), champ "colonne_id", glisser-déposer qui enregistre la colonne.
- Une carte s'ouvre en grand (ui.Modal) : description, responsable, échéance, étiquettes de couleur, liste de cases à cocher avec progression, commentaires.
- Filtres en pastilles (responsable, étiquette, en retard), et une seconde vue : liste ou calendrier des échéances.
- ${SANS_GESTION}`,
  },
  edition: {
    label: "Édition et création", quand: "prise de notes, documents, wiki, pages, création de contenu, éditeur de texte ou de pages",
    interface: "appli", disposition: "barre", accueil: "l'espace de travail : la liste des pages ou documents et le document ouvert dans l'éditeur",
    guide: `FAMILLE : ÉDITION ET CRÉATION (façon éditeur de documents, PAS un logiciel de gestion).
- Le cœur : un VRAI ÉDITEUR. Utilise ui.Editeur({ value, onChange }) : éditeur en blocs (titres, paragraphes, listes, cases à cocher, citations, séparateurs, menu « / »), la valeur est un tableau de blocs à enregistrer tel quel dans un champ de l'élément (type json). Enregistre automatiquement (onChange différé), affiche « Enregistré ».
- Mise en page en deux parties : à gauche l'arborescence des pages ou documents (créer, renommer, ranger, favoris, recherche), à droite le document ouvert en grand, avec un titre éditable et une icône emoji.
- Modèles de pages pour démarrer, aperçu, export PDF (pdf) ou copie du texte.
- Création graphique (visuels, posts, affiches, présentations) : l'espace principal est ui.Toile ; à côté, la galerie des designs (ui.Galerie) avec « Nouveau design » par format, et des modèles de départ.
- Constructeur de formulaires ou de sondages (façon formulaire interactif) : ui.ConstructeurFormulaire pour créer, un aperçu avec ui.Questionnaire apercu, la page publique qui affiche ui.Questionnaire et enregistre chaque réponse, et l'écran des réponses (une par une et en synthèse par question).
- ${SANS_GESTION}`,
  },
  ia: {
    label: "Intelligence artificielle", quand: "outil dont le cœur est l'IA : assistant, générateur, réécriture, analyse de texte ou de documents",
    interface: "outil", disposition: "haut", accueil: "l'outil IA lui-même : la zone de saisie ou la conversation, et le résultat en grand",
    guide: `FAMILLE : INTELLIGENCE ARTIFICIELLE (façon outil IA, PAS un logiciel de gestion).
- Le cœur : l'interaction IA du produit d'origine. Conversation → ui.Chat({ messages, onEnvoyer, enCours }) avec l'historique enregistré ; génération ou réécriture → une grande zone de saisie, les options du produit (ton, longueur, style, langue) en pastilles, un gros bouton, le résultat en grand avec Copier, Régénérer, Ajuster.
- Les réglages propres au produit (profils de ton, consignes enregistrées, modèles de prompt) dans un écran à part. L'historique des résultats en ui.Liste.
- ${SANS_GESTION}`,
  },
  communaute: {
    label: "Communauté", quand: "réseau, forum, groupe, membres qui publient, échangent, se lancent des défis",
    interface: "communaute", disposition: "onglets", accueil: "« Fil » : publier en haut, les publications des membres en dessous",
    guide: `FAMILLE : COMMUNAUTÉ (façon réseau social, PAS un logiciel de gestion).
- Le cœur : ui.Fil avec réactions et commentaires, une zone « Quoi de neuf ? » pour publier (texte, photo avec ui.Fichier), des profils de membres, des espaces ou sujets, ui.Classement pour les défis. Collections COMMUNAUTÉ partagées.
- Mise en page centrée (max-w-2xl mx-auto). ${SANS_GESTION}`,
  },
  apprentissage: {
    label: "Apprentissage", quand: "cours, leçons, révisions, quiz, cartes mémoire, progression",
    interface: "apprentissage", disposition: "onglets", accueil: "« Apprendre » : la série du jour, la progression et une grosse carte « Continuer »",
    guide: `FAMILLE : APPRENTISSAGE (façon appli ludique).
- Le cœur : des exercices une question à la fois en grand, réponses en gros boutons, retour immédiat vert ou rouge, score et série ; des leçons en ui.Galerie ; la progression avec ui.Anneau et des niveaux.
- ${SANS_GESTION}`,
  },
  perso: {
    label: "Application personnelle", quand: "appli du quotidien pour une personne : sport, santé, habitudes, budget perso, famille, organisation perso",
    interface: "appli", disposition: "onglets", accueil: "« Aujourd'hui » : la prochaine action en grosse carte et la progression du jour",
    guide: `FAMILLE : APPLICATION PERSONNELLE (façon appli mobile soignée).
- Accueil « Aujourd'hui » : salutation, LA prochaine action en grosse carte colorée (bg-[var(--c)] text-white), ui.Anneau pour la progression, puis ui.Liste des derniers éléments. Ajouts en 2 à 4 champs dans une modale courte.
- Mise en page étroite (max-w-2xl mx-auto), gros chiffres, emoji. ${SANS_GESTION}`,
  },
  automatisation: {
    label: "Automatisation", quand: "enchaîner des actions automatiquement, scénarios « quand… alors… », rappels et envois programmés, veille",
    interface: "outil", disposition: "barre", accueil: "« Mes automatisations » : chaque scénario sur une carte avec son déclencheur, ses actions et un interrupteur",
    guide: `FAMILLE : AUTOMATISATION.
- Le cœur : des SCÉNARIOS lisibles « Quand [déclencheur] → alors [actions] », construits pas à pas (choix du déclencheur, puis des actions dans l'ordre, chacune avec ses réglages), avec un interrupteur actif ou en pause et l'historique des exécutions.
- Seuls des déclencheurs et des actions réellement disponibles : une date ou une répétition (email avec quand et repeter), un changement de page web surveillée (url_surveillee), un élément ajouté par une page publique ; actions : e-mail, document PDF, texte écrit par l'IA, élément ajouté dans une collection. Tout autre déclencheur (logiciel externe) est affiché « Bientôt », jamais simulé.
- ${SANS_GESTION}`,
  },
  analyse: {
    label: "Analyse et tableaux de bord", quand: "suivre des chiffres, des indicateurs, des rapports, des sondages, des statistiques",
    interface: "gestion", disposition: "barre", accueil: "le tableau de bord lui-même : indicateurs, graphiques et filtres de période",
    guide: `FAMILLE : ANALYSE ET TABLEAUX DE BORD.
- Le cœur : des indicateurs calculés depuis les données saisies ou importées, des graphiques (ui.Ligne, ui.Bar, ui.Donut) avec filtre de période en pastilles, comparaison à la période précédente, et des rapports exportables en PDF.
- Aucune donnée inventée : chaque chiffre vient des collections.`,
  },
  contenu: {
    label: "Contenu, catalogue et vitrine", quand: "catalogue, bibliothèque, recettes, annonces, boutique de créateur, page vitrine, lien unique",
    interface: "contenu", disposition: "haut", accueil: "la galerie elle-même ou la vitrine publique telle que les visiteurs la voient",
    guide: `FAMILLE : CONTENU, CATALOGUE ET VITRINE.
- Le cœur : ui.Galerie (cartes avec grande image ou emoji, titre, sous-titre, étiquette), recherche et filtres en pastilles, fiche détaillée en grand, mise en page éditoriale. Pour une boutique ou une vitrine de créateur (page de liens, offres, produits numériques) : l'écran principal est ui.EditeurVitrine (aperçu en direct), la page publique affiche ui.Vitrine, et un écran suit les clics et les ventes.
- ${SANS_GESTION}`,
  },
};

/** Le texte de choix de famille pour la conception. */
export const CHOIX_FAMILLES = Object.entries(FAMILLES).map(([k, f]) => `${k} (${f.label} : ${f.quand} ; premier écran = ${f.accueil})`).join(",\n  ");

/** Famille la plus probable sans IA (repli), à partir de la catégorie et des mots du produit. */
export function familleParDefaut(t: string): string {
  const x = t.toLowerCase();
  if (/\b(notes?|wiki|documents? collaboratif|éditeur|editeur|pages? de connaissance|knowledge)/.test(x)) return "edition";
  if (/kanban|gestion de projets?|project management|tâches d'équipe|sprints?/.test(x)) return "projets";
  if (/\bcrm\b|prospect|pipeline|leads?\b/.test(x)) return "crm";
  if (/r[ée]serv|rendez-vous|booking|scheduling|cr[ée]neau/.test(x)) return "reservation";
  if (/\bia\b|\bai\b|gpt|g[ée]n[ée]rat|assistant|chatbot|r[ée][ée]cri/.test(x)) return "ia";
  if (/communaut|forum|r[ée]seau social|membres/.test(x)) return "communaute";
  if (/cours|quiz|r[ée]vision|apprend|flashcard|langue/.test(x)) return "apprentissage";
  if (/automati|workflow|zap|sc[ée]nario/.test(x)) return "automatisation";
  if (/analytics|statisti|reporting|tableau de bord|dashboard|sondage/.test(x)) return "analyse";
  if (/catalogue|boutique|vitrine|link.?in.?bio|recettes?|annonces?/.test(x)) return "contenu";
  if (/sport|habitude|sant[ée]|budget perso|journal|m[ée]ditation|nutrition/.test(x)) return "perso";
  return "gestion";
}

/** Modèles faits main compatibles avec chaque famille : un modèle ne s'impose plus à un produit d'une autre famille. */
export const MODELES_DE_FAMILLE: Record<string, string[]> = {
  reservation: ["reservation"], gestion: ["devis", "reservation"], crm: ["crm"], ia: ["ecriture"], edition: ["ecriture"],
};
