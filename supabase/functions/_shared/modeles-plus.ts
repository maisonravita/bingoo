// Modèles faits main, deuxième série : support client, boutique, formation, recrutement, réseaux sociaux, formulaires, notes.
// Même principe que modeles.ts : écrans écrits et testés à l'avance, l'IA (modèle rapide) n'adapte que le vocabulaire et les exemples.
// deno-lint-ignore-file no-explicit-any
import { MODELES_CODE } from "./modeles-code.ts";

const NOMS = ["Claire Martin", "Thomas Bernard", "Sophie Dubois", "Lucas Moreau", "Camille Laurent", "Julien Simon", "Emma Michel", "Hugo Lefebvre", "Léa Garcia", "Nathan Roux", "Chloé David", "Louis Bertrand", "Manon Fournier", "Arthur Girard", "Inès Bonnet", "Paul Dupont", "Sarah Lambert", "Maxime Fontaine"];
const court = (x: unknown, n: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const liste = (x: unknown) => (Array.isArray(x) ? x : []);
const mel = (n: string) => n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, ".") + "@exemple.fr";
const jour = (d: number) => { const x = new Date(); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const instant = (d: number, h = 10) => jour(d) + "T" + String(h).padStart(2, "0") + ":" + String((((d * 17 + h * 7) % 60) + 60) % 60).padStart(2, "0") + ":00Z";
const hasardDe = (g: number) => () => { g = (g * 9301 + 49297) % 233280; return g / 233280; };
const emoji = (x: unknown, d: string) => { const e = String(x ?? "").trim(); return e && e.length <= 8 && !/[a-z0-9]/i.test(e) ? e : d; };
/** Écrans d'un modèle : le code fait main (avec l'en-tête de vocabulaire), ou l'IA l'écrira s'il manque. */
const avecCode = (modele: string, V: any, ecrans: any[]) => { const code = MODELES_CODE[modele] ?? {}, tete = `const V = ${JSON.stringify(V)};\n`; return ecrans.map((e) => code[e.id] ? ({ ...e, code: tete + code[e.id], ok: true, modele }) : e); };

// ---------------------------------------------------------------- Support client (tickets, réponses par e-mail, centre d'aide)
export const PERSO_SUPPORT = (p: any) => `Un logiciel de support client (tickets et centre d'aide) va être livré pour ce produit : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rendez un objet JSON :
- vocab : { client: comment ce métier appelle ses clients au singulier (« Client », « Utilisateur », « Locataire »…), clients: au pluriel }
- equipe : 3 prénoms et noms français (l'équipe support)
- tickets : 12 demandes réalistes reçues par ce métier : { sujet (60 caractères max), message (2 ou 3 phrases du client), categorie (un mot), priorite (« basse », « normale » ou « haute ») }
- articles : 6 articles d'aide utiles pour ce métier : { titre (60 caractères max), categorie (un mot), contenu (3 courts paragraphes séparés par une ligne vide) }
- reponses : 4 réponses types : { titre (3 mots), texte (2 phrases) }
Tout en français, sans nom de marque réelle. Majuscule au début de chaque mot de vocab.`;

export function specSupport(perso: any) {
  const V: any = { client: court(perso?.vocab?.client, 24) || "Client", clients: court(perso?.vocab?.clients, 24) || "Clients" };
  V.reponses = liste(perso?.reponses).slice(0, 6).map((r: any) => ({ titre: court(r?.titre, 30), texte: court(r?.texte, 400) })).filter((r: any) => r.titre && r.texte);
  if (!V.reponses.length) V.reponses = [{ titre: "Bien reçu", texte: "Merci pour votre message, nous l'avons bien reçu. Nous revenons vers vous dans la journée." }, { titre: "Problème résolu", texte: "Bonne nouvelle : le problème est corrigé de notre côté. N'hésitez pas à nous dire si tout fonctionne bien chez vous." }, { titre: "Besoin de précisions", texte: "Pour vous aider au mieux, pourriez-vous nous envoyer une capture d'écran et l'heure à laquelle le problème est apparu ?" }];
  const ecrans = avecCode("support", V, [
    { id: "tableau_bord", titre: "Tableau de bord", icone: "graphique", but: "Les demandes ouvertes, le temps de réponse et ce qui attend une réponse aujourd'hui." },
    { id: "tickets", titre: "Tickets", icone: "message", but: "Toutes les demandes de vos " + V.clients.toLowerCase() + " : répondez par e-mail, changez le statut, assignez." },
    { id: "articles", titre: "Centre d'aide", icone: "fichier", but: "Les articles d'aide que vos " + V.clients.toLowerCase() + " lisent seuls, avant de vous écrire." },
    { id: "pub_aide", titre: "Aide en ligne", icone: "carte", but: "La page publique : vos articles d'aide, et un formulaire qui crée un ticket.", public: true, lecture: ["articles"], ecriture: "tickets" },
  ]);
  const collections = [
    { nom: "tickets", label: "Tickets", champs: [{ nom: "sujet", type: "texte" }, { nom: "nom", type: "texte" }, { nom: "email", type: "email" }, { nom: "message", type: "texte" }, { nom: "statut", type: "choix", valeurs: ["ouvert", "attente", "resolu"] }, { nom: "priorite", type: "choix", valeurs: ["basse", "normale", "haute"] }, { nom: "categorie", type: "texte" }, { nom: "assigne", type: "texte" }, { nom: "echanges", type: "json" }, { nom: "repondu_le", type: "date" }, { nom: "resolu_le", type: "date" }] },
    { nom: "articles", label: "Articles d'aide", champs: [{ nom: "titre", type: "texte" }, { nom: "categorie", type: "texte" }, { nom: "contenu", type: "texte" }, { nom: "publie", type: "booleen" }, { nom: "vues", type: "nombre" }, { nom: "utile", type: "nombre" }] },
  ];
  const h = hasardDe(41);
  const equipe = liste(perso?.equipe).map((x: any) => court(typeof x === "string" ? x : x?.nom, 40)).filter(Boolean).slice(0, 4);
  const eq = equipe.length >= 2 ? equipe : ["Sophie Martin", "Hugo Lefebvre", "Inès Bonnet"];
  const T = liste(perso?.tickets).length ? liste(perso.tickets) : [
    { sujet: "Impossible de me connecter", message: "Bonjour, depuis ce matin je n'arrive plus à me connecter à mon compte. J'ai pourtant le bon mot de passe.", categorie: "Compte", priorite: "haute" },
    { sujet: "Question sur ma facture", message: "Je vois deux prélèvements ce mois-ci, est-ce normal ? Merci de vérifier.", categorie: "Facturation", priorite: "normale" },
    { sujet: "Modifier mon rendez-vous", message: "Est-il possible de décaler mon rendez-vous de jeudi à vendredi ?", categorie: "Planning", priorite: "normale" },
    { sujet: "Demande de renseignements", message: "Bonjour, proposez-vous une formule pour les associations ?", categorie: "Commercial", priorite: "basse" },
    { sujet: "Problème de paiement", message: "Ma carte est refusée au moment de payer, que faire ?", categorie: "Facturation", priorite: "haute" },
    { sujet: "Conseil d'utilisation", message: "Comment exporter mes données au format Excel ?", categorie: "Utilisation", priorite: "basse" },
    { sujet: "Changer d'adresse e-mail", message: "Je souhaite remplacer l'adresse e-mail de mon compte.", categorie: "Compte", priorite: "normale" },
    { sujet: "Remboursement", message: "Je n'ai pas pu venir à la séance, puis-je être remboursé ?", categorie: "Facturation", priorite: "normale" },
    { sujet: "Le site est très lent", message: "Les pages mettent longtemps à s'afficher depuis hier soir.", categorie: "Technique", priorite: "haute" },
    { sujet: "Merci !", message: "Juste un mot pour vous remercier de votre réactivité la semaine dernière.", categorie: "Autre", priorite: "basse" },
    { sujet: "Ajouter un collègue", message: "Comment donner l'accès à un collègue de mon équipe ?", categorie: "Compte", priorite: "normale" },
    { sujet: "Erreur dans ma commande", message: "J'ai reçu un article qui ne correspond pas à ma commande.", categorie: "Commande", priorite: "haute" },
  ];
  const tickets = T.slice(0, 16).map((t: any, i: number) => {
    const nom = NOMS[i % NOMS.length], statut = i < 5 ? "ouvert" : i < 7 ? "attente" : "resolu", d = -Math.round(i < 5 ? i * 0.5 : 1 + i * 1.4 + h() * 2), hc = 8 + (i % 6), hr = Math.min(22, hc + 1 + (i % 4));
    const echanges: any[] = [{ de: "client", nom, texte: court(t?.message, 600), at: instant(d, hc) }];
    if (statut !== "ouvert") echanges.push({ de: "equipe", nom: eq[i % eq.length], texte: V.reponses[i % V.reponses.length].texte, at: instant(d, hr) });
    if (statut === "attente") echanges.push({ de: "equipe", nom: eq[i % eq.length], texte: "Pourriez-vous nous confirmer si cela fonctionne maintenant ?", at: instant(d + 1, 10) });
    return { sujet: court(t?.sujet, 80) || "Demande " + (i + 1), nom, email: mel(nom), message: court(t?.message, 600), statut, priorite: ["basse", "normale", "haute"].includes(t?.priorite) ? t.priorite : "normale", categorie: court(t?.categorie, 24) || "Autre", assigne: i % 4 === 3 ? "" : eq[i % eq.length], echanges, ...(statut !== "ouvert" ? { repondu_le: jour(d) } : {}), ...(statut === "resolu" ? { resolu_le: jour(Math.min(0, d + 1)) } : {}), cree_le: instant(d, hc) };
  });
  const A = liste(perso?.articles).length ? liste(perso.articles) : [
    { titre: "Créer votre compte en 2 minutes", categorie: "Démarrer", contenu: "Rendez-vous sur la page d'inscription et indiquez votre adresse e-mail.\n\nChoisissez un mot de passe d'au moins 8 caractères.\n\nVous recevez un e-mail de confirmation : cliquez sur le lien, c'est prêt." },
    { titre: "Réinitialiser votre mot de passe", categorie: "Compte", contenu: "Sur la page de connexion, cliquez sur « Mot de passe oublié ».\n\nIndiquez votre adresse e-mail : un lien vous est envoyé.\n\nLe lien est valable une heure." },
    { titre: "Comprendre votre facture", categorie: "Facturation", contenu: "Votre facture est envoyée par e-mail chaque mois.\n\nElle détaille votre formule, la période et la TVA.\n\nVous la retrouvez aussi dans votre espace, rubrique Factures." },
    { titre: "Modifier ou annuler une réservation", categorie: "Planning", contenu: "Ouvrez l'e-mail de confirmation et cliquez sur « Modifier ».\n\nVous pouvez changer la date jusqu'à 24 h avant.\n\nAu-delà, contactez-nous directement." },
    { titre: "Exporter vos données", categorie: "Utilisation", contenu: "Dans chaque liste, le bouton « Exporter » télécharge un fichier compatible Excel.\n\nLe fichier contient toutes les lignes affichées.\n\nPour tout exporter, retirez d'abord les filtres." },
    { titre: "Inviter un collègue", categorie: "Compte", contenu: "Ouvrez Réglages puis Équipe.\n\nIndiquez l'adresse e-mail de votre collègue et son rôle.\n\nIl reçoit une invitation à rejoindre votre espace." },
  ];
  const articles = A.slice(0, 10).map((a: any, i: number) => ({ titre: court(a?.titre, 80) || "Article " + (i + 1), categorie: court(a?.categorie, 24) || "Aide", contenu: String(a?.contenu ?? "").slice(0, 3000), publie: i !== 5, vues: Math.round(40 + h() * 400), utile: Math.round(5 + h() * 40), cree_le: instant(-20 - i * 6) }));
  return { vocab: V, ecrans, collections, demo: { tickets, articles }, demo_ancre: jour(0), agenda: null, famille: "gestion", disposition: "barre" };
}

// ---------------------------------------------------------------- Boutique en ligne (produits, commandes, vitrine publique)
export const PERSO_BOUTIQUE = (p: any) => `Une boutique en ligne (catalogue, commandes, clients) va être livrée pour ce commerce : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rendez un objet JSON :
- produits : 10 produits réalistes de ce commerce : { nom (40 caractères max), prix (euros TTC, nombre), categorie (un ou deux mots), description (une phrase), emoji (un seul emoji qui représente le produit), stock (nombre entre 0 et 60) }
- livraison : la façon de recevoir la commande la plus logique pour ce commerce (« Retrait en boutique », « Livraison à domicile »…)
Tout en français, sans nom de marque réelle.`;

export function specBoutique(perso: any) {
  const V: any = { livraison: court(perso?.livraison, 40) || "Livraison à domicile" };
  const ecrans = avecCode("boutique", V, [
    { id: "tableau_bord", titre: "Tableau de bord", icone: "graphique", but: "Vos ventes, vos commandes à préparer et vos meilleurs produits." },
    { id: "commandes", titre: "Commandes", icone: "panier", but: "Chaque commande, de la réception à la livraison, avec un e-mail au client à chaque étape." },
    { id: "produits", titre: "Produits", icone: "boite", but: "Votre catalogue : prix, stock, catégories, en ligne ou masqué." },
    { id: "clients", titre: "Clients", icone: "contacts", but: "Vos clients, leurs commandes et ce qu'ils vous ont rapporté." },
    { id: "pub_boutique", titre: "Boutique en ligne", icone: "carte", but: "La vitrine publique : vos clients choisissent, remplissent leur panier et commandent.", public: true, lecture: ["produits"], ecriture: "commandes" },
  ]);
  const collections = [
    { nom: "produits", label: "Produits", champs: [{ nom: "nom", type: "texte" }, { nom: "prix", type: "montant" }, { nom: "categorie", type: "texte" }, { nom: "description", type: "texte" }, { nom: "emoji", type: "texte" }, { nom: "image", type: "texte" }, { nom: "stock", type: "nombre" }, { nom: "actif", type: "booleen" }] },
    { nom: "commandes", label: "Commandes", champs: [{ nom: "numero", type: "texte" }, { nom: "client_nom", type: "texte" }, { nom: "email", type: "email" }, { nom: "telephone", type: "telephone" }, { nom: "adresse", type: "texte" }, { nom: "lignes", type: "json" }, { nom: "total", type: "montant" }, { nom: "statut", type: "choix", valeurs: ["nouvelle", "preparation", "expediee", "livree", "annulee"] }, { nom: "paye", type: "booleen" }, { nom: "note", type: "texte" }] },
  ];
  const h = hasardDe(57);
  const P = liste(perso?.produits).length ? liste(perso.produits) : [
    { nom: "Bougie figue et cèdre", prix: 24, categorie: "Bougies", description: "Cire végétale, 40 heures de combustion.", emoji: "🕯️", stock: 18 },
    { nom: "Savon surgras à l'avoine", prix: 8.5, categorie: "Soins", description: "Pour les peaux sensibles, fabriqué à froid.", emoji: "🧼", stock: 42 },
    { nom: "Diffuseur fleur d'oranger", prix: 32, categorie: "Maison", description: "Bâtonnets en rotin, 3 mois de parfum.", emoji: "🌼", stock: 9 },
    { nom: "Coffret découverte", prix: 45, categorie: "Coffrets", description: "Trois mini-bougies et un savon, prêt à offrir.", emoji: "🎁", stock: 6 },
    { nom: "Huile de massage relaxante", prix: 19, categorie: "Soins", description: "Amande douce et lavande fine.", emoji: "🌿", stock: 25 },
    { nom: "Bougie ambre et vanille", prix: 24, categorie: "Bougies", description: "Notes chaudes, idéale l'hiver.", emoji: "🕯️", stock: 0 },
    { nom: "Brume d'oreiller", prix: 16, categorie: "Maison", description: "Camomille et lavande pour mieux dormir.", emoji: "🌙", stock: 31 },
    { nom: "Carte cadeau 50 €", prix: 50, categorie: "Coffrets", description: "Valable un an sur toute la boutique.", emoji: "💌", stock: 99 },
  ];
  const produits = P.slice(0, 12).map((x: any, i: number) => ({ ref: "p" + (i + 1), nom: court(x?.nom, 60) || "Produit " + (i + 1), prix: Math.max(1, Math.round((Number(x?.prix) || 20) * 100) / 100), categorie: court(x?.categorie, 24) || "Divers", description: court(x?.description, 200), emoji: emoji(x?.emoji, "🛍️"), stock: Math.max(0, Math.round(Number(x?.stock ?? 20))), actif: true }));
  const clientsN = NOMS.slice(0, 12);
  const commandes: any[] = [];
  for (let i = 0; i < 46; i++) {
    const d = i < 4 ? -Math.floor(i / 2) : -Math.round(Math.pow(h(), 1.5) * 60), nom = clientsN[Math.floor(Math.pow(h(), 1.6) * clientsN.length)];
    const n = 1 + Math.floor(h() * 3), lignes = Array.from({ length: n }, () => { const p = produits[Math.floor(Math.pow(h(), 1.3) * produits.length)]; return { produit_id: p.ref, nom: p.nom, prix: p.prix, quantite: 1 + Math.floor(h() * 2) }; });
    const total = Math.round(lignes.reduce((a, l) => a + l.prix * l.quantite, 0) * 100) / 100;
    const statut = d > -1 ? "nouvelle" : d > -3 ? (h() < 0.5 ? "nouvelle" : "preparation") : d > -6 ? "expediee" : h() < 0.06 ? "annulee" : "livree";
    commandes.push({ numero: "C-" + String(1000 + i), client_nom: nom, email: mel(nom), telephone: "06 " + String(10 + i).slice(-2) + " 45 12 " + String(30 + i).slice(-2), adresse: (12 + i) + " rue des Lilas, 69003 Lyon", lignes, total, statut, paye: statut !== "nouvelle" || h() < 0.5, note: i === 2 ? "Paquet cadeau s'il vous plaît" : "", cree_le: instant(d, 8 + (i % 12)) });
  }
  return { vocab: V, ecrans, collections, demo: { produits, commandes }, demo_ancre: jour(0), agenda: null, famille: "gestion", disposition: "barre" };
}

// ---------------------------------------------------------------- Formation en ligne (cours, leçons, élèves)
export const PERSO_FORMATION = (p: any) => `Une plateforme de formation en ligne va être livrée pour ce formateur : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rendez un objet JSON :
- vocab : { eleve: comment il appelle un apprenant au singulier (« Élève », « Stagiaire », « Membre »…), eleves: au pluriel }
- cours : 3 formations réalistes : { titre (50 caractères max), sous_titre (une phrase), prix (euros, nombre, 0 si gratuit), niveau (« Débutant », « Intermédiaire » ou « Avancé »), emoji (un seul), lecons : 5 objets { titre (50 caractères max), duree (minutes), resume (une phrase), contenu (3 courts paragraphes séparés par une ligne vide) } }
Tout en français, sans nom de marque réelle. Majuscule au début de chaque mot de vocab.`;

export function specFormation(perso: any) {
  const V: any = { eleve: court(perso?.vocab?.eleve, 24) || "Élève", eleves: court(perso?.vocab?.eleves, 24) || "Élèves" };
  const ecrans = avecCode("formation", V, [
    { id: "tableau_bord", titre: "Tableau de bord", icone: "graphique", but: "Vos inscriptions, vos revenus et la progression de vos " + V.eleves.toLowerCase() + "." },
    { id: "cours", titre: "Mes formations", icone: "fichier", but: "Vos formations et leurs leçons : écrivez, réordonnez, publiez." },
    { id: "eleves", titre: V.eleves.slice(0, 24), icone: "contacts", but: "Qui suit quoi, où en est chacun, et un e-mail pour envoyer la leçon suivante." },
    { id: "pub_catalogue", titre: "Catalogue", icone: "carte", but: "La page publique de vos formations : programme, prix et inscription.", public: true, lecture: ["cours"], ecriture: "inscriptions" },
  ]);
  const collections = [
    { nom: "cours", label: "Formations", champs: [{ nom: "titre", type: "texte" }, { nom: "sous_titre", type: "texte" }, { nom: "prix", type: "montant" }, { nom: "niveau", type: "texte" }, { nom: "emoji", type: "texte" }, { nom: "programme", type: "json" }, { nom: "publie", type: "booleen" }] },
    { nom: "lecons", label: "Leçons", champs: [{ nom: "cours_id", type: "texte" }, { nom: "titre", type: "texte" }, { nom: "duree", type: "nombre" }, { nom: "resume", type: "texte" }, { nom: "contenu", type: "texte" }, { nom: "video", type: "texte" }, { nom: "ordre", type: "nombre" }] },
    { nom: "inscriptions", label: "Inscriptions", champs: [{ nom: "nom", type: "texte" }, { nom: "email", type: "email" }, { nom: "cours_id", type: "texte" }, { nom: "cours_titre", type: "texte" }, { nom: "montant", type: "montant" }, { nom: "statut", type: "choix", valeurs: ["a_valider", "actif", "termine"] }, { nom: "lecons_faites", type: "nombre" }, { nom: "derniere_lecon", type: "date" }] },
  ];
  const h = hasardDe(67);
  const C = liste(perso?.cours).length ? liste(perso.cours) : [
    { titre: "Bien démarrer en photographie", sous_titre: "Maîtrisez votre appareil en une semaine.", prix: 79, niveau: "Débutant", emoji: "📷", lecons: ["Comprendre l'exposition", "La règle des tiers", "Jouer avec la lumière naturelle", "Réussir ses portraits", "Retoucher simplement"].map((t) => ({ titre: t })) },
    { titre: "Photo de produits pour vendre", sous_titre: "Des photos qui donnent envie d'acheter.", prix: 129, niveau: "Intermédiaire", emoji: "🛍️", lecons: ["Le matériel minimum", "Fond et éclairage", "Mettre en scène", "Photos pour les réseaux", "Retouche et export"].map((t) => ({ titre: t })) },
    { titre: "Les bases en 30 minutes", sous_titre: "Le mini-cours gratuit pour se lancer.", prix: 0, niveau: "Débutant", emoji: "✨", lecons: ["Tenir son appareil", "Faire la mise au point", "Trois erreurs à éviter"].map((t) => ({ titre: t })) },
  ];
  const cours: any[] = [], lecons: any[] = [];
  C.slice(0, 4).forEach((c: any, ci: number) => {
    const ref = "f" + (ci + 1), L = liste(c?.lecons).slice(0, 8);
    const programme = L.map((l: any, li: number) => ({ titre: court(l?.titre ?? l, 60) || "Leçon " + (li + 1), duree: Math.max(3, Math.round(Number(l?.duree) || 8 + ((li * 7) % 15))) }));
    cours.push({ ref, titre: court(c?.titre, 70) || "Formation " + (ci + 1), sous_titre: court(c?.sous_titre, 160), prix: Math.max(0, Math.round(Number(c?.prix ?? 49))), niveau: court(c?.niveau, 20) || "Débutant", emoji: emoji(c?.emoji, "🎓"), programme, publie: true });
    L.forEach((l: any, li: number) => lecons.push({ cours_id: ref, titre: programme[li].titre, duree: programme[li].duree, resume: court(l?.resume, 200), contenu: String(l?.contenu ?? "").slice(0, 4000) || "Dans cette leçon, nous voyons pas à pas « " + programme[li].titre + " ».\n\nPrenez le temps de refaire chaque exercice.\n\nÀ la fin, notez ce que vous avez appris : cela vous servira pour la suite.", video: "", ordre: li + 1 }));
  });
  const inscriptions: any[] = [];
  for (let i = 0; i < 34; i++) {
    const nom = NOMS[i % NOMS.length] + (i >= NOMS.length ? " " : ""), c = cours[Math.floor(Math.pow(h(), 1.4) * cours.length)], n = c.programme.length, d = -Math.round(Math.pow(h(), 1.15) * 75);
    const faites = Math.min(n, Math.floor(h() * (n + 2))), statut = i < 3 ? "a_valider" : faites >= n ? "termine" : "actif";
    inscriptions.push({ nom: nom.trim(), email: mel(nom.trim()), cours_id: c.ref, cours_titre: c.titre, montant: c.prix, statut, lecons_faites: statut === "a_valider" ? 0 : faites, ...(faites && statut !== "a_valider" ? { derniere_lecon: jour(Math.min(0, d + Math.round(h() * 20))) } : {}), cree_le: instant(i < 3 ? -i : d) });
  }
  return { vocab: V, ecrans, collections, demo: { cours, lecons, inscriptions }, demo_ancre: jour(0), agenda: null, famille: "gestion", disposition: "barre" };
}

// ---------------------------------------------------------------- Recrutement (offres, candidats par étape, page carrières)
export const PERSO_RECRUTEMENT = (p: any) => `Un logiciel de recrutement va être livré pour : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rendez un objet JSON :
- offres : 4 postes réalistes que recrute ce type d'entreprise : { titre (50 caractères max), lieu (ville française), contrat (« CDI », « CDD », « Stage », « Alternance » ou « Freelance »), salaire (ex. « 32 à 38 k€ »), description (3 courts paragraphes séparés par une ligne vide : la mission, le profil, ce que l'on offre) }
- equipe : 3 prénoms et noms français (les recruteurs)
Tout en français, sans nom de marque réelle.`;

export function specRecrutement(perso: any) {
  const V: any = {};
  const ecrans = avecCode("recrutement", V, [
    { id: "tableau_bord", titre: "Tableau de bord", icone: "graphique", but: "Vos postes ouverts, les candidatures de la semaine et les entretiens à venir." },
    { id: "candidats", titre: "Candidats", icone: "contacts", but: "Chaque candidat étape par étape, de la candidature à l'embauche, avec un e-mail en un clic." },
    { id: "offres", titre: "Offres", icone: "fichier", but: "Vos offres d'emploi : rédigez, publiez sur votre page carrières, fermez." },
    { id: "pub_carrieres", titre: "Page carrières", icone: "carte", but: "La page publique de vos offres : les candidats postulent en deux minutes.", public: true, lecture: ["offres"], ecriture: "candidats" },
  ]);
  const collections = [
    { nom: "offres", label: "Offres", champs: [{ nom: "titre", type: "texte" }, { nom: "lieu", type: "texte" }, { nom: "contrat", type: "texte" }, { nom: "salaire", type: "texte" }, { nom: "description", type: "texte" }, { nom: "statut", type: "choix", valeurs: ["brouillon", "publiee", "fermee"] }] },
    { nom: "candidats", label: "Candidats", champs: [{ nom: "nom", type: "texte" }, { nom: "email", type: "email" }, { nom: "telephone", type: "telephone" }, { nom: "offre_id", type: "texte" }, { nom: "offre_titre", type: "texte" }, { nom: "etape", type: "choix", valeurs: ["nouveau", "preselection", "entretien", "offre", "embauche", "refuse"] }, { nom: "note", type: "nombre" }, { nom: "lien", type: "texte" }, { nom: "motivation", type: "texte" }, { nom: "entretien_le", type: "date" }, { nom: "commentaires", type: "texte" }, { nom: "source", type: "texte" }] },
  ];
  const h = hasardDe(73);
  const O = liste(perso?.offres).length ? liste(perso.offres) : [
    { titre: "Développeur web confirmé", lieu: "Lyon", contrat: "CDI", salaire: "42 à 50 k€", description: "Vous rejoignez une équipe de 6 personnes pour faire grandir notre produit.\n\nTrois ans d'expérience minimum, goût du travail bien fait et de l'entraide.\n\nTélétravail deux jours par semaine, mutuelle prise en charge à 100 %." },
    { titre: "Chargé(e) de clientèle", lieu: "Nantes", contrat: "CDI", salaire: "28 à 32 k€", description: "Vous êtes la voix de l'entreprise auprès de nos clients.\n\nExcellent relationnel et goût du service.\n\nFormation complète à l'arrivée, primes trimestrielles." },
    { titre: "Assistant(e) marketing", lieu: "Paris", contrat: "Alternance", salaire: "Selon la grille", description: "Vous participez aux campagnes et aux réseaux sociaux.\n\nEn école de commerce ou de communication.\n\nUne vraie autonomie et un tuteur dédié." },
    { titre: "Comptable", lieu: "Bordeaux", contrat: "CDD", salaire: "35 k€", description: "Remplacement de 9 mois au sein du service financier.\n\nBTS ou DCG, à l'aise avec les outils numériques.\n\nPoste à pourvoir rapidement." },
  ];
  const offres = O.slice(0, 6).map((o: any, i: number) => ({ ref: "o" + (i + 1), titre: court(o?.titre, 70) || "Poste " + (i + 1), lieu: court(o?.lieu, 40) || "Paris", contrat: court(o?.contrat, 20) || "CDI", salaire: court(o?.salaire, 40), description: String(o?.description ?? "").slice(0, 3000), statut: i === 3 ? "fermee" : "publiee", cree_le: instant(-12 - i * 9) }));
  const SOURCES = ["Page carrières", "LinkedIn", "Recommandation", "Indeed", "Candidature spontanée"];
  const ETAPES = ["nouveau", "nouveau", "nouveau", "preselection", "preselection", "entretien", "entretien", "offre", "embauche", "refuse", "refuse", "refuse"];
  const candidats = Array.from({ length: 26 }, (_, i) => {
    const nom = NOMS[(i * 5) % NOMS.length], o = offres[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : (i % 2 ? 2 : 3)], etape = ETAPES[i % ETAPES.length], d = -Math.round(1 + h() * 30);
    return { nom, email: mel(nom), telephone: "06 " + String(20 + i).slice(-2) + " 33 41 " + String(10 + i).slice(-2), offre_id: o.ref, offre_titre: o.titre, etape, note: etape === "nouveau" ? 0 : 2 + Math.floor(h() * 4), lien: "https://www.linkedin.com/in/" + mel(nom).split("@")[0].replace(/\./g, "-"), motivation: ["Votre projet me parle beaucoup, et j'ai mené une mission très proche l'an dernier.", "Je cherche une équipe où apprendre et transmettre.", "Disponible rapidement, je serais ravi d'en discuter."][i % 3], ...(etape === "entretien" ? { entretien_le: jour(1 + (i % 6)) } : {}), commentaires: etape === "refuse" ? "Profil intéressant mais trop junior pour ce poste." : etape === "offre" ? "Très bon entretien, proposition envoyée." : "", source: SOURCES[i % SOURCES.length], cree_le: instant(d) };
  });
  return { vocab: V, ecrans, collections, demo: { offres, candidats }, demo_ancre: jour(0), agenda: { collection: "candidats", champ_date: "entretien_le", champ_heure: null, duree: 45, champs_titre: ["nom", "offre_titre"] }, famille: "gestion", disposition: "barre" };
}

// ---------------------------------------------------------------- Réseaux sociaux (calendrier éditorial, posts, idées, résultats)
export const PERSO_RESEAUX = (p: any) => `Un outil de planification de publications sur les réseaux sociaux va être livré pour : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rendez un objet JSON :
- posts : 12 publications réalistes pour ce public : { texte (2 à 4 phrases, avec 1 ou 2 émojis et 2 hashtags à la fin), reseau (« instagram », « linkedin », « facebook » ou « tiktok ») }
- idees : 6 idées de publications courtes (60 caractères max)
Tout en français, sans nom de marque réelle.`;

export function specReseaux(perso: any) {
  const V: any = { reseaux: [["instagram", "Instagram"], ["linkedin", "LinkedIn"], ["facebook", "Facebook"], ["tiktok", "TikTok"]] };
  const ecrans = avecCode("reseaux", V, [
    { id: "calendrier", titre: "Calendrier", icone: "agenda", but: "Toutes vos publications du mois, réseau par réseau : planifiez, déplacez, ne ratez aucune date." },
    { id: "publications", titre: "Publications", icone: "message", but: "Écrivez une publication (l'IA peut vous aider), choisissez les réseaux et la date : un rappel prêt à copier arrive le jour J." },
    { id: "idees", titre: "Idées", icone: "etoile", but: "Votre réserve d'idées, à transformer en publication en un clic." },
    { id: "resultats", titre: "Résultats", icone: "graphique", but: "Ce qui marche : mentions j'aime, commentaires et partages, par réseau et par publication." },
  ]);
  const collections = [
    { nom: "posts", label: "Publications", champs: [{ nom: "texte", type: "texte" }, { nom: "reseaux", type: "json" }, { nom: "date", type: "date" }, { nom: "heure", type: "texte" }, { nom: "statut", type: "choix", valeurs: ["brouillon", "programme", "publie"] }, { nom: "image", type: "texte" }, { nom: "jaime", type: "nombre" }, { nom: "commentaires", type: "nombre" }, { nom: "partages", type: "nombre" }, { nom: "rappel_id", type: "texte" }] },
    { nom: "idees", label: "Idées", champs: [{ nom: "texte", type: "texte" }, { nom: "theme", type: "texte" }, { nom: "utilisee", type: "booleen" }] },
  ];
  const h = hasardDe(83);
  const P = liste(perso?.posts).length ? liste(perso.posts) : [
    { texte: "Nouvelle semaine, nouveaux objectifs 💪 Quel est le vôtre ? Dites-le-nous en commentaire ! #motivation #lundi", reseau: "instagram" },
    { texte: "3 conseils pour gagner une heure par jour : 1) une seule liste, 2) les e-mails deux fois par jour, 3) dire non. #productivite #conseils", reseau: "linkedin" },
    { texte: "Les coulisses de notre atelier ce matin ☕ Qui veut voir la suite ? #coulisses #artisanat", reseau: "instagram" },
    { texte: "Merci à nos 1 000 abonnés 🎉 Un petit cadeau arrive vendredi… #merci #communaute", reseau: "facebook" },
    { texte: "Avant / après : regardez la différence en 30 secondes ⏱️ #avantapres #astuce", reseau: "tiktok" },
    { texte: "Ce que nous avons appris en lançant notre offre : écouter les premiers clients avant tout. #entrepreneuriat #retourdexperience", reseau: "linkedin" },
    { texte: "Le produit du mois est arrivé 😍 Disponible dès aujourd'hui. #nouveaute #shopping", reseau: "instagram" },
    { texte: "Question du jour : plutôt matin ou soir pour travailler ? 🌅🌙 #question #team", reseau: "facebook" },
  ];
  const posts = Array.from({ length: 26 }, (_, i) => {
    const x = P[i % P.length], d = -44 + Math.round(i * 2.3 + h() * 2), r = ["instagram", "linkedin", "facebook", "tiktok"].includes(x?.reseau) ? x.reseau : "instagram";
    const res = h() < 0.3 ? [r, r === "instagram" ? "facebook" : "instagram"] : [r], statut = d < 0 ? "publie" : d < 9 ? "programme" : "brouillon";
    const base = r === "tiktok" ? 300 : r === "instagram" ? 120 : 60;
    return { texte: court(x?.texte, 1200), reseaux: res, date: jour(d), heure: ["09:00", "12:30", "18:00", "19:30"][i % 4], statut, ...(statut === "publie" ? { jaime: Math.round(base * (0.4 + h() * 1.6)), commentaires: Math.round(base * (0.02 + h() * 0.12)), partages: Math.round(base * (0.01 + h() * 0.08)) } : {}), cree_le: instant(d - 4) };
  });
  const I = liste(perso?.idees).length ? liste(perso.idees) : ["Présenter un membre de l'équipe", "Répondre à la question la plus posée", "Un avant / après", "Le bilan du mois en chiffres", "Une erreur à éviter", "Un témoignage client"];
  const idees = I.slice(0, 10).map((t: any, i: number) => ({ texte: court(typeof t === "string" ? t : t?.texte, 120), theme: ["Coulisses", "Conseil", "Preuve", "Communauté"][i % 4], utilisee: i === 5 }));
  return { vocab: V, ecrans, collections, demo: { posts, idees }, demo_ancre: jour(0), agenda: { collection: "posts", champ_date: "date", champ_heure: "heure", duree: 15, champs_titre: ["texte"] }, famille: "gestion", disposition: "barre" };
}

// ---------------------------------------------------------------- Formulaires et sondages (constructeur, page publique, réponses)
export const PERSO_FORMULAIRES = (p: any) => `Un outil de formulaires et de sondages va être livré pour : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rendez un objet JSON :
- formulaires : 3 formulaires utiles pour ce public : { titre (50 caractères max), intro (une phrase), emoji (un seul), questions : 5 objets { titre (la question), type (« texte », « long », « choix », « multiple », « note », « nps », « oui_non », « email » ou « date »), options (3 ou 4 choix si type choix ou multiple, sinon []), obligatoire (true ou false) } }
Tout en français, sans nom de marque réelle.`;

export function specFormulaires(perso: any) {
  const V: any = {};
  const ecrans = avecCode("formulaires", V, [
    { id: "formulaires", titre: "Formulaires", icone: "fichier", but: "Créez vos formulaires question par question, voyez l'aperçu, partagez le lien." },
    { id: "reponses", titre: "Réponses", icone: "graphique", but: "Les réponses reçues, une par une ou en synthèse par question, exportables." },
    { id: "pub_formulaire", titre: "Répondre", icone: "carte", but: "La page publique où l'on répond à vos formulaires, une question à la fois.", public: true, lecture: ["formulaires"], ecriture: "reponses" },
  ]);
  const collections = [
    { nom: "formulaires", label: "Formulaires", champs: [{ nom: "titre", type: "texte" }, { nom: "intro", type: "texte" }, { nom: "emoji", type: "texte" }, { nom: "questions", type: "json" }, { nom: "merci", type: "texte" }, { nom: "ouvert", type: "booleen" }] },
    { nom: "reponses", label: "Réponses", champs: [{ nom: "formulaire_id", type: "texte" }, { nom: "formulaire_titre", type: "texte" }, { nom: "reponses", type: "json" }, { nom: "email", type: "email" }] },
  ];
  const h = hasardDe(97);
  const TYPES = ["texte", "long", "choix", "multiple", "note", "nps", "oui_non", "email", "nombre", "date"];
  const F = liste(perso?.formulaires).length ? liste(perso.formulaires) : [
    { titre: "Votre avis compte", intro: "Deux minutes pour nous aider à faire mieux.", emoji: "⭐", questions: [{ titre: "Quelle note donneriez-vous à votre expérience ?", type: "note", obligatoire: true }, { titre: "Nous recommanderiez-vous à un proche ?", type: "nps", obligatoire: true }, { titre: "Qu'avez-vous préféré ?", type: "choix", options: ["L'accueil", "La qualité", "Le prix", "La rapidité"] }, { titre: "Que pourrions-nous améliorer ?", type: "long" }, { titre: "Votre e-mail (facultatif)", type: "email" }] },
    { titre: "Inscription à l'atelier", intro: "Réservez votre place pour le prochain atelier.", emoji: "📝", questions: [{ titre: "Votre nom", type: "texte", obligatoire: true }, { titre: "Votre e-mail", type: "email", obligatoire: true }, { titre: "Quelle session ?", type: "choix", options: ["Samedi matin", "Samedi après-midi", "Mercredi soir"], obligatoire: true }, { titre: "Avez-vous déjà participé ?", type: "oui_non" }, { titre: "Une question ou une remarque ?", type: "long" }] },
    { titre: "Demande de devis", intro: "Décrivez votre projet, nous revenons vers vous sous 48 h.", emoji: "💼", questions: [{ titre: "Votre nom", type: "texte", obligatoire: true }, { titre: "Votre e-mail", type: "email", obligatoire: true }, { titre: "Quels services vous intéressent ?", type: "multiple", options: ["Conseil", "Réalisation", "Formation", "Suivi"] }, { titre: "Votre budget approximatif (€)", type: "nombre" }, { titre: "Pour quand ?", type: "date" }] },
  ];
  const formulaires = F.slice(0, 5).map((f: any, i: number) => ({ ref: "q" + (i + 1), titre: court(f?.titre, 70) || "Formulaire " + (i + 1), intro: court(f?.intro, 200), emoji: emoji(f?.emoji, "📝"), merci: "Merci, vos réponses sont bien envoyées.", ouvert: true,
    questions: liste(f?.questions).slice(0, 10).map((q: any, k: number) => { const type = TYPES.includes(q?.type) ? q.type : "texte"; return { id: "q" + (i + 1) + "_" + (k + 1), type, titre: court(q?.titre, 160) || "Question " + (k + 1), aide: "", options: ["choix", "multiple"].includes(type) ? (liste(q?.options).map((o: unknown) => court(o, 60)).filter(Boolean).slice(0, 6).length ? liste(q?.options).map((o: unknown) => court(o, 60)).filter(Boolean).slice(0, 6) : ["Oui", "Non", "Peut-être"]) : [], obligatoire: !!q?.obligatoire }; }), cree_le: instant(-30 + i * 5) }));
  const LONGS = ["Très bon moment, merci !", "Un peu d'attente à l'arrivée.", "Tout était parfait.", "J'aurais aimé plus d'explications.", "Équipe très sympathique."];
  const reponses: any[] = [];
  formulaires.forEach((f: any, fi: number) => {
    const n = fi === 0 ? 24 : fi === 1 ? 12 : 7;
    for (let i = 0; i < n; i++) {
      const nom = NOMS[(i + fi * 4) % NOMS.length];
      const rep = f.questions.map((q: any) => {
        const v = q.type === "note" ? 3 + Math.floor(Math.pow(h(), 0.5) * 3 > 2 ? 2 : h() * 3) : q.type === "nps" ? Math.min(10, 5 + Math.floor(Math.pow(h(), 0.6) * 6)) : q.type === "choix" ? q.options[Math.floor(Math.pow(h(), 1.3) * q.options.length)] : q.type === "multiple" ? q.options.filter(() => h() < 0.45).slice(0, 3) : q.type === "oui_non" ? (h() < 0.6 ? "oui" : "non") : q.type === "email" ? mel(nom) : q.type === "nombre" ? Math.round(500 + h() * 4500) : q.type === "date" ? jour(10 + Math.round(h() * 60)) : q.type === "long" ? (h() < 0.7 ? LONGS[Math.floor(h() * LONGS.length)] : null) : nom;
        return { id: q.id, question: q.titre, type: q.type, reponse: v };
      });
      reponses.push({ formulaire_id: f.ref, formulaire_titre: f.titre, reponses: rep, email: rep.find((r: any) => r.type === "email")?.reponse ?? "", cree_le: instant(-Math.round(Math.pow(h(), 0.8) * 28), 8 + (i % 12)) });
    }
  });
  return { vocab: V, ecrans, collections, demo: { formulaires, reponses }, demo_ancre: jour(0), agenda: null, famille: "edition", disposition: "barre" };
}

// ---------------------------------------------------------------- Notes et wiki (pages en blocs, arborescence, favoris)
export const PERSO_NOTES = (p: any) => `Un espace de notes et de documents (wiki) va être livré pour : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rendez un objet JSON :
- pages : 6 pages utiles pour ce public : { titre (40 caractères max), emoji (un seul), blocs : 5 à 8 objets { type (« titre », « paragraphe », « liste », « case », « citation »), texte (une phrase ou un titre court), fait (true ou false, seulement pour « case ») } }
- modeles : 3 modèles de page pour démarrer : { nom (3 mots), emoji, blocs (4 objets comme ci-dessus) }
Tout en français, sans nom de marque réelle.`;

export function specNotes(perso: any) {
  const blocsDe = (b: unknown) => liste(b).slice(0, 14).map((x: any, i: number) => { const t = ["titre", "paragraphe", "liste", "case", "citation"].includes(x?.type) ? x.type : "paragraphe"; return { id: "b" + Date.now().toString(36).slice(-3) + i, type: t === "titre" ? "h2" : t === "paragraphe" ? "p" : t === "liste" ? "ul" : t === "case" ? "todo" : "quote", texte: court(x?.texte, 400), ...(t === "case" ? { fait: !!x?.fait } : {}) }; }).filter((x: any) => x.texte);
  const V: any = {};
  V.modeles = liste(perso?.modeles).slice(0, 4).map((m: any) => ({ nom: court(m?.nom, 30), emoji: emoji(m?.emoji, "📄"), blocs: blocsDe(m?.blocs) })).filter((m: any) => m.nom && m.blocs.length);
  if (!V.modeles.length) V.modeles = [
    { nom: "Compte rendu", emoji: "🗒️", blocs: blocsDe([{ type: "titre", texte: "Participants" }, { type: "liste", texte: "…" }, { type: "titre", texte: "Décisions" }, { type: "case", texte: "Action à mener" }]) },
    { nom: "Fiche projet", emoji: "🎯", blocs: blocsDe([{ type: "titre", texte: "Objectif" }, { type: "paragraphe", texte: "En une phrase : pourquoi ce projet ?" }, { type: "titre", texte: "Étapes" }, { type: "case", texte: "Première étape" }]) },
    { nom: "Journal", emoji: "📔", blocs: blocsDe([{ type: "titre", texte: "Aujourd'hui" }, { type: "paragraphe", texte: "Ce qui s'est passé…" }, { type: "titre", texte: "Demain" }, { type: "case", texte: "À faire" }]) },
  ];
  const ecrans = avecCode("notes", V, [
    { id: "pages", titre: "Pages", icone: "fichier", but: "Vos notes et documents en pages : écrivez en blocs, rangez en arborescence, retrouvez tout." },
    { id: "taches", titre: "Cases à cocher", icone: "check", but: "Toutes les cases à cocher de toutes vos pages, au même endroit." },
  ]);
  const collections = [
    { nom: "pages", label: "Pages", champs: [{ nom: "titre", type: "texte" }, { nom: "emoji", type: "texte" }, { nom: "parent_id", type: "texte" }, { nom: "contenu", type: "json" }, { nom: "favori", type: "booleen" }, { nom: "ordre", type: "nombre" }, { nom: "corbeille", type: "booleen" }] },
  ];
  const P = liste(perso?.pages).length ? liste(perso.pages) : [
    { titre: "Bienvenue", emoji: "👋", blocs: [{ type: "titre", texte: "Votre espace de notes" }, { type: "paragraphe", texte: "Écrivez, tapez « / » pour insérer un titre, une liste ou une case à cocher." }, { type: "case", texte: "Créer ma première page", fait: true }, { type: "case", texte: "Mettre une page en favori" }, { type: "citation", texte: "Ce qui est écrit est à moitié fait." }] },
    { titre: "Réunion d'équipe du lundi", emoji: "🗒️", blocs: [{ type: "titre", texte: "Ordre du jour" }, { type: "liste", texte: "Point sur les ventes" }, { type: "liste", texte: "Nouveaux arrivants" }, { type: "titre", texte: "Décisions" }, { type: "case", texte: "Envoyer le planning à toute l'équipe" }, { type: "case", texte: "Réserver la salle pour jeudi", fait: true }] },
    { titre: "Idées pour la rentrée", emoji: "💡", blocs: [{ type: "paragraphe", texte: "Tout ce qui nous passe par la tête, on trie ensuite." }, { type: "liste", texte: "Un atelier découverte gratuit" }, { type: "liste", texte: "Une lettre d'information mensuelle" }, { type: "liste", texte: "Un parrainage pour les clients fidèles" }] },
    { titre: "Procédures", emoji: "📚", blocs: [{ type: "titre", texte: "Où trouver quoi" }, { type: "paragraphe", texte: "Chaque procédure a sa propre page, rangée ici." }] },
    { titre: "Accueillir un nouveau client", emoji: "🤝", blocs: [{ type: "case", texte: "Envoyer l'e-mail de bienvenue" }, { type: "case", texte: "Créer son dossier" }, { type: "case", texte: "Planifier l'appel de lancement" }, { type: "citation", texte: "Le premier contact donne le ton de toute la relation." }] },
    { titre: "Objectifs du trimestre", emoji: "🎯", blocs: [{ type: "titre", texte: "Trois priorités" }, { type: "case", texte: "Dix nouveaux clients", fait: true }, { type: "case", texte: "Nouveau site en ligne" }, { type: "case", texte: "Recruter un(e) alternant(e)" }] },
  ];
  const pages = P.slice(0, 10).map((x: any, i: number) => ({ ref: "n" + (i + 1), titre: court(x?.titre, 60) || "Page " + (i + 1), emoji: emoji(x?.emoji, "📄"), parent_id: i === 4 ? "n4" : "", contenu: blocsDe(x?.blocs), favori: i === 1 || i === 5, ordre: i + 1, corbeille: false, cree_le: instant(-14 + i * 2) }));
  return { vocab: V, ecrans, collections, demo: { pages }, demo_ancre: jour(0), agenda: null, famille: "edition", disposition: "barre" };
}

export const FAIT_PLUS: Record<string, string> = {
  support: "Cette version fait exactement ceci, et rien d'autre : chaque demande des clients devient un ticket (formulaire public ou ajout à la main), avec statut (ouvert, en attente, résolu), priorité, catégorie et personne assignée ; on répond depuis le ticket par un vrai e-mail au client, avec des réponses types ; l'historique des échanges reste dans le ticket ; un centre d'aide public avec des articles écrits dans l'outil ; un tableau de bord (tickets ouverts, temps de première réponse, résolus). Pas de chat en direct, pas de boîte e-mail synchronisée (les réponses du client par e-mail n'arrivent pas toutes seules dans le ticket), pas de téléphone ni de réseaux sociaux.",
  boutique: "Cette version fait exactement ceci, et rien d'autre : un catalogue de produits (prix, stock, catégories, en ligne ou masqué), une vitrine publique où le client remplit un panier et passe commande avec ses coordonnées, chaque commande suivie par étapes (nouvelle, en préparation, expédiée, livrée) avec un e-mail au client à chaque étape, le stock qui baisse quand une commande passe en préparation (produit épuisé affiché comme tel sur la vitrine), un fichier clients et un tableau de bord des ventes. Le paiement se règle à la livraison ou au retrait (pas de paiement par carte en ligne dans la boutique), pas de calcul automatique des frais de port, pas de codes promo, pas de synchronisation avec une marketplace.",
  formation: "Cette version fait exactement ceci, et rien d'autre : des formations découpées en leçons (texte, lien vidéo, durée) que le formateur écrit et réordonne, un catalogue public avec programme et prix où l'on s'inscrit, le suivi des inscrits (à valider, en cours, terminé, leçons faites), l'envoi par e-mail d'une leçon aux inscrits, un tableau de bord (inscriptions, revenus, progression). Les élèves n'ont pas d'espace de connexion : ils reçoivent les leçons par e-mail. Pas de paiement en ligne, pas d'hébergement de vidéos, pas de certificat automatique, pas de quiz noté.",
  recrutement: "Cette version fait exactement ceci, et rien d'autre : des offres d'emploi rédigées dans l'outil (brouillon, publiée, fermée), une page carrières publique où les candidats postulent (coordonnées, lien vers leur profil ou CV en ligne, motivation), chaque candidat suivi par étapes à faire glisser (nouveau, présélection, entretien, offre, embauché, refusé) avec une note et des commentaires, un vrai e-mail au candidat en un clic (convocation, refus), le calendrier des entretiens, un tableau de bord. Pas de diffusion automatique sur les sites d'emploi, pas de dépôt de fichier CV, pas de tests en ligne.",
  reseaux: "Cette version fait exactement ceci, et rien d'autre : un calendrier éditorial des publications par réseau (Instagram, LinkedIn, Facebook, TikTok), l'écriture des publications avec l'aide de l'IA, une date et une heure de publication, un e-mail de rappel le jour J avec le texte prêt à copier, une réserve d'idées, la saisie des résultats (j'aime, commentaires, partages) et leurs graphiques. La publication n'est PAS automatique : l'outil ne se connecte pas aux comptes des réseaux sociaux. Pas de messagerie unifiée, pas de statistiques importées toutes seules.",
  formulaires: "Cette version fait exactement ceci, et rien d'autre : un constructeur de formulaires et de sondages (réponse courte, paragraphe, choix unique ou multiple, note, recommandation de 0 à 10, oui ou non, e-mail, nombre, date, questions obligatoires), un aperçu, une page publique où l'on répond une question à la fois, les réponses une par une et en synthèse par question avec graphiques, l'export en tableur, l'ouverture ou la fermeture d'un formulaire. Pas de logique conditionnelle, pas de paiement dans le formulaire, pas de dépôt de fichier.",
  notes: "Cette version fait exactement ceci, et rien d'autre : des pages écrites en blocs (titres, paragraphes, listes, cases à cocher, citations, menu « / »), rangées en arborescence (sous-pages), avec emoji, favoris, recherche, modèles de page, corbeille, export PDF, et une vue de toutes les cases à cocher de toutes les pages. Pas de bases de données ni de tableaux, pas d'édition à plusieurs en même temps, pas de partage public de page.",
};
