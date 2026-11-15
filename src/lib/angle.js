// L'angle de « ta version » : choisi par Bingoo! sans IA, à partir des vraies données du SaaS et des réponses.
// Puis les 10 premiers clients : où les trouver et quoi leur dire, selon cet angle et ce que la personne refuse de faire.
import { nomCanal } from "./plan30";

const PAYS = (() => { try { return new Intl.DisplayNames(["fr"], { type: "region" }); } catch { return null; } })();
const nomPays = (c) => { try { return c && c !== "FR" ? PAYS?.of(c) : null; } catch { return null; } };
const dollars = (n) => `${Number(n || 0).toLocaleString("fr-FR")} $`;

export const ANGLES = [["france", "Version française"], ["metier", "Pour un métier"], ["simple", "En plus simple"]];

// Un outil de développeur ou d'IA générique n'a pas de sens « pour les coiffeurs » : l'angle métier n'est proposé que pour les outils de gestion, de vente, de clientèle…
const VERTICALES = ["CRM et ventes", "Facturation et comptabilité", "Marketing et SEO", "Support client", "Réseaux sociaux et contenu", "Prospection et emailing", "Gestion de projet", "Commerce et restauration", "Immobilier", "Santé", "BTP et artisans", "Éducation et formation", "E-commerce"];
// Le serveur décide (s.vert) quand il le sait : même règle partout, sur la carte, dans le plan et sur la page Lancer
export const verticalisable = (s) => typeof s.vert === "boolean" ? s.vert : VERTICALES.includes(s.categorie) && !(/b2c/i.test(s.audience ?? "") && !/b2b|both/i.test(s.audience ?? "")) && !/(prompt|\bapi\b|developer|\bllm|token|github|\bcode\b|claude|chatgpt|cursor)/i.test(`${s.description ?? ""} ${s.proposition ?? ""}`);

// « coiffeurs » → « les coiffeurs » (sauf si la personne a déjà mis un article)
const lesDe = (m) => /^(les|des|la|le|l'|aux?)\s?/i.test(m.trim()) ? m.trim().toLowerCase() : `les ${m.trim().toLowerCase()}`;

export function angleDe(s, r, force) {
  const metier = (r?.metier ?? "").trim();
  const type = force ?? (metier && verticalisable(s) ? "metier" : s.pays !== "FR" ? "france" : "simple");
  const chiffre = s.mrr ? `Il encaisse ${dollars(s.mrr)} par mois` : "Il gagne déjà de l'argent";
  if (type === "metier") {
    const m = metier || "un métier que tu connais";
    const les = lesDe(m);
    return { type, metier: m, les, court: `pour ${les}`, titre: `${s.nom}, version ${m.toLowerCase()}`, phrase: `${chiffre} en vendant à tout le monde. Ta version : la même chose, pensée pour ${les}, avec leurs mots, leurs cas concrets et un prix à leur portée.`, brief: `Adapte le SaaS au métier suivant : ${m}. Vocabulaire, écrans, exemples et prix pensés pour ce métier en France.` };
  }
  if (type === "france") {
    const ou = nomPays(s.pays);
    return { type, court: "en français", titre: `${s.nom}, version française`, phrase: `${chiffre}${ou ? ` depuis ${ou}` : ""}${s.sans_fr ? ", et Bingoo! n'a repéré aucun équivalent français" : ""}. Ta version : la même chose, en français, pour les clients français, avec un support en français et des prix en euros.`, brief: "Version française : tout en français, pour les clients français (TVA, euros, RGPD, support en français), prix adapté au marché français." };
  }
  return { type: "simple", court: "plus simple et moins cher", titre: `${s.nom}, en plus simple`, phrase: `${chiffre}. Ta version : l'essentiel de ce qu'il fait, plus simple à prendre en main et moins cher, pour les indépendants et les petites structures.`, brief: "Version plus simple : seulement le cœur du produit, prise en main en 5 minutes, prix plus bas, pour les indépendants et petites structures." };
}

// Qui les clients, en une expression utilisable dans une phrase
const cibleDe = (s, a) => a.type === "metier" ? a.les : /B2B|both/i.test(s.audience ?? "") ? "les petites entreprises" : "tes futurs clients";

// Ce que fait le SaaS, en français. Beaucoup de fiches sont en anglais : on donne une phrase française tirée de sa catégorie,
// de sa cible et de son prix, et l'original reste visible en petit.
const CAT_FR = {
  "CRM et ventes": "Un outil pour suivre ses clients et ses ventes",
  "Facturation et comptabilité": "Un outil de facturation et de suivi des paiements",
  "Gestion de projet": "Un outil de gestion et de productivité",
  "Marketing et SEO": "Un outil de marketing pour se faire connaître",
  "Réseaux sociaux et contenu": "Un outil pour créer du contenu et se montrer en ligne",
  "Support client": "Un outil pour répondre à ses clients",
  "Prospection et emailing": "Un outil pour trouver des clients et leur écrire",
  "Commerce et restauration": "Un outil pour les commerces et les restaurants",
  "Immobilier": "Un outil pour les professionnels de l'immobilier",
  "Santé": "Un outil pour les professionnels de santé",
  "BTP et artisans": "Un outil pour les artisans",
  "Éducation et formation": "Un outil pour former et enseigner",
  "E-commerce": "Un outil pour vendre en ligne",
  "IA et automatisation": "Un outil qui automatise une tâche avec l'IA",
  "Collaboration et documents": "Un outil pour travailler à plusieurs sur des documents",
  "Paie et RH": "Un outil de gestion du personnel",
  "Recrutement": "Un outil pour recruter",
  "Juridique": "Un outil juridique",
  "Logistique et transport": "Un outil de logistique",
  "Paiement et finance": "Un outil de finance",
  "Données et analytics": "Un outil de suivi de données",
};
export const enFrancais = (s) => /^fr$/i.test(s.langue ?? "") || (/^FR$/.test(s.pays ?? "") && !/\b(the|and|your|with|for)\b/i.test(s.description ?? ""));
export function resumeFr(s) {
  if (enFrancais(s) && s.description) return s.description;
  const qui = /B2B/i.test(s.audience ?? "") && /B2C/i.test(s.audience ?? "") || /both/i.test(s.audience ?? "") ? "vendu aux pros et aux particuliers" : /B2C/i.test(s.audience ?? "") ? "vendu aux particuliers" : "vendu aux professionnels";
  const prix = s.prix_entree_eur ? `, à partir de ${Math.round(s.prix_entree_eur)} € par mois` : "";
  return `${CAT_FR[s.categorie] ?? "Un logiciel en ligne"}, ${qui}${prix}.`;
}

export function premiersClients(s, a, r) {
  const refus = new Set(r?.refus ?? []);
  const cible = cibleDe(s, a);
  const ou = [];
  if (a.type === "metier") {
    ou.push(["Google Maps", `Cherche « ${a.metier} » dans ta ville et les villes voisines : note les 50 premiers avec leur site et leur e-mail.`]);
    ou.push(["Groupes Facebook et LinkedIn du métier", `Rejoins 3 groupes où ${a.les} se posent des questions. Réponds d'abord, sans vendre.`]);
    ou.push(["Fédérations et syndicats", `Chaque métier a sa fédération, ses salons et ses newsletters : propose-leur un article ou une démo pour leurs membres.`]);
  } else if (a.type === "france") {
    ou.push(["Les clients français de " + s.nom, `Cherche sur Google et LinkedIn « ${s.nom} » avec « France » ou en français : ceux qui l'utilisent déjà paieraient une version française.`]);
    ou.push(["Les comparateurs", `Inscris ta version sur Capterra France, Appvizer et les listes « alternatives à ${s.nom} » : les gens y cherchent un équivalent français.`]);
    ou.push(["Les communautés françaises", `Forums, groupes Facebook et serveurs Discord français où ta cible (${cible}) parle de ce problème.`]);
  } else {
    ou.push(["Ceux qui trouvent " + s.nom + " trop cher ou compliqué", `Cherche « ${s.nom} trop cher », « ${s.nom} alternative » sur Google, Reddit et les avis : chaque plainte est un client possible.`]);
    ou.push(["Les indépendants de ta cible", `Annuaire Malt, groupes d'indépendants, espaces de coworking : ${cible}.`]);
  }
  for (const c of (s.canaux ?? []).slice(0, 6)) {
    if (["Reddit", "Product Hunt", "LinkedIn", "X / Twitter", "Facebook", "Discord", "Forums"].includes(c) && ou.length < 5) ou.push([nomCanal(c), `${s.nom} trouve une partie de ses clients ici : fais pareil pour ta version.`]);
  }
  const voix = a.type === "metier" ? `pour ${a.les}` : a.type === "france" ? "en français" : "plus simple et moins cher";
  const messages = [];
  if (!refus.has("appeler")) {
    messages.push(["Premier message (e-mail ou message privé)", `Bonjour [prénom],\n\nJe prépare un outil ${voix} qui [ce que fait ton outil, en une phrase].\nAvant de le lancer, je cherche 10 personnes qui ont ce problème pour l'essayer gratuitement pendant un mois.\n\nEst-ce que c'est un sujet pour vous en ce moment ?\n\n[Ton prénom]`]);
    messages.push(["Relance (4 jours après, une seule fois)", `Bonjour [prénom], je me permets de revenir vers vous : les premiers essais commencent la semaine prochaine. Si ce n'est pas le bon moment, dites-le-moi simplement et je ne vous relancerai pas.`]);
  }
  messages.push(["Message dans un groupe ou un forum", `Bonjour à tous, je construis un outil ${voix} pour [le problème]. Comment vous gérez ça aujourd'hui ? Je cherche quelques personnes pour le tester gratuitement et me dire ce qui manque.`]);
  messages.push(["Quand quelqu'un dit oui", `Merci ! Voici ton accès : [lien]. Tu as un mois gratuit. ${refus.has("appeler") ? "Je t'écris" : "Je t'appelle"} dans une semaine pour savoir ce qui t'a servi et ce qui t'a manqué. Si ça t'est utile, l'abonnement sera de [prix] € par mois.`]);
  return { cible, ou: ou.slice(0, 5), messages };
}

// Une semaine pour tes 10 premiers clients : un jour = une étape, des quantités adaptées au temps dont la personne dispose
export function semaineClients(s, a, r) {
  const peu = r?.temps === "peu";
  const refus = new Set(r?.refus ?? []);
  const n = (beaucoup, un_peu) => (peu ? un_peu : beaucoup);
  const cible = a.type === "metier" ? a.les : "ta cible";
  const source = a.type === "metier" ? `sur Google Maps (« ${a.metier} » + ta ville et les villes voisines)` : a.type === "france" ? `parmi les utilisateurs français de ${s.nom} et sur les comparateurs` : `parmi ceux qui se plaignent de ${s.nom} (avis, Reddit, Google)`;
  const contacter = refus.has("appeler")
    ? (k) => `Publie ton message dans ${k} groupes ou forums où ${a.type === "metier" ? `se retrouvent ${cible}` : "se trouve ta cible"}, et réponds à chaque commentaire dans l'heure.`
    : (k, encore) => `Envoie ton message à ${k} ${encore ? "autres " : ""}personnes de ta liste, personnalisé avec leur prénom et un détail sur eux.`;
  return [
    { j: "Jour 1", titre: "Ta liste", actions: [`Vérifie que ta version est en ligne et fais un paiement test : tout doit marcher avant le premier message.`, a.type === "metier" ? `Ouvre l'onglet « Tes prospects » : Bingoo! te sort jusqu'à 50 ${a.metier.toLowerCase()} de ton département. Garde les ${n(40, 25)} qui te parlent le plus.` : `Note ${n(50, 30)} personnes ou entreprises ${source}, avec leur e-mail ou leur profil (ou ouvre « Tes prospects » si Bingoo! peut les trouver pour toi).`] },
    { j: "Jour 2", titre: "Ton offre", actions: [`Choisis ton offre de lancement : un mois gratuit, puis −30 % à vie pour les 10 premiers.`, `Prépare tes messages dans l'onglet « Quoi leur dire » : remplace les crochets par tes mots.`] },
    { j: "Jour 3", titre: "Premiers contacts", actions: [contacter(n(15, 8)), "Note chaque contact dans « Tes prospects »."] },
    { j: "Jour 4", titre: "Deuxième vague", actions: [contacter(n(15, 8), true), "Réponds à tous ceux qui ont répondu, même les « non merci » : demande-leur pourquoi."] },
    { j: "Jour 5", titre: "Montre-le", actions: [refus.has("video") ? "Envoie 3 captures d'écran qui montrent le résultat à ceux qui sont intéressés." : "Fais une démo de 10 minutes (visio ou vidéo enregistrée) à ceux qui sont intéressés.", refus.has("appeler") ? "Relance par écrit ceux qui n'ont pas répondu, une seule fois." : "Relance une seule fois ceux qui n'ont pas répondu."] },
    { j: "Jour 6", titre: "Ouvre les essais", actions: ["Donne l'accès à tous ceux qui ont dit oui, et aide chacun à faire sa première action dans l'outil.", "Note ce qui les bloque : c'est ta liste d'améliorations."] },
    { j: "Jour 7", titre: "Tes 10 premiers", actions: ["Demande à chaque personne en essai si elle veut garder l'outil, avec ton offre des 10 premiers.", "Fais le point : combien de contacts, de oui, d'essais, de payants. Garde le canal qui a le mieux marché pour la semaine suivante."] },
  ];
}

// Les textes d'un SaaS parlent souvent à son utilisateur en « tu » : dans un message à un prospect qu'on ne connaît pas, on vouvoie
const VERBES_TU = { es: "êtes", as: "avez", peux: "pouvez", veux: "voulez", fais: "faites", dois: "devez", vas: "allez", sais: "savez", dis: "dites" };
export const vouvoyer = (t) => String(t ?? "")
  .replace(/\btu (\p{L}+)/giu, (_, v) => `vous ${VERBES_TU[v.toLowerCase()] ?? v.replace(/es$/, "ez").replace(/s$/, "z")}`)
  .replace(/\bt'(?=\p{L})/giu, "vous ").replace(/\b(ton|ta)\b/gi, "votre").replace(/\btes\b/gi, "vos").replace(/\b(te|toi)\b/gi, "vous");

// Distribution clé en main d'un SaaS construit : les messages déjà remplis (nom, ce qu'il fait, prix, lien suivi par canal),
// et les groupes où trouver sa cible (liens de recherche prêts). Les vidéos TikTok ont leur propre page.
// Rien n'est envoyé par Bingoo! : le fondateur copie, ouvre, et envoie lui-même.
export function kitDiffusion(s, a, r, app, lien) {
  const sp = app?.spec ?? {};
  const nom = sp.nom ?? "mon outil";
  const refus = new Set(r?.refus ?? []);
  const cible = a.type === "metier" ? a.les : String(sp.cible ?? cibleDe(s, a)).replace(/\.$/, "").replace(/^(\p{Lu})(\p{Ll})/u, (_, x, y) => x.toLowerCase() + y);
  const phrase1 = (x) => String(x ?? "").split(/(?<=[.!?])\s+/)[0].replace(/[.!]$/, "").trim();
  const quoi = phrase1(sp.pitch ?? sp.slogan) || `un outil ${a.court}`;
  const quoiMin = vouvoyer(quoi.replace(/^(\p{Lu})(\p{Ll})/u, (_, x, y) => x.toLowerCase() + y));
  const prob = vouvoyer(phrase1(sp.probleme)).replace(/\?$/, "");
  const desCible = cible.replace(/^les /, "des ");
  const f0 = (sp.formules ?? []).find((f) => Number(f.prix) > 0);
  const prix = f0 ? `${String(f0.prix).replace(".", ",")} € par mois` : null;
  const essai = Number(app?.paiement?.essai_jours ?? 14) || 14;
  const url = (src) => (lien ? `${lien}${lien.includes("?") ? "&" : "?"}src=${src}` : "[lien]");
  const offre = `${essai} jours d'essai gratuit${prix ? `, puis ${prix}` : ""}`;
  const messages = [];
  if (!refus.has("appeler")) {
    messages.push(["E-mail de premier contact", `Objet : ${nom}, pour ${cible}\n\nBonjour [prénom],\n\n${prob ? `${prob}. ` : ""}J'ai créé ${nom} pour ça : ${quoiMin}.\n\nJe cherche mes 10 premiers utilisateurs : ${offre}, et je vous aide moi-même à le mettre en place.\n\nVous voulez essayer ? ${url("email")}\n\nBonne journée,\n[ton prénom]\n\nPas intéressé ? Répondez « stop », je ne vous écrirai plus.`, "email"]);
    messages.push(["Message privé Instagram", `Bonjour ! Je suis tombé sur votre compte, super travail 👏\nJe lance ${nom} : ${quoiMin}. Je cherche quelques ${a.type === "metier" ? a.metier.toLowerCase() : "personnes"} pour le tester gratuitement (${essai} jours) et me dire ce qui manque. Ça vous dit ? ${url("instagram")}`, "instagram"]);
    messages.push(["Demande de connexion LinkedIn", `Bonjour [prénom], je lance ${nom} (${quoiMin}) et je cherche l'avis ${desCible}. Ravi d'échanger !`, "linkedin"]);
    messages.push(["Relance (4 jours après, une seule fois)", `Bonjour [prénom], je reviens vers vous au sujet de ${nom}. La démo prend 30 secondes : ${url("relance")}&tour=1\nSi ce n'est pas le bon moment, dites-le-moi et je ne vous relancerai plus.\n[ton prénom]`, "relance"]);
  }
  messages.push(["Post dans un groupe ou un forum", `Bonjour à tous 👋 ${prob ? `${prob} : vous gérez ça comment aujourd'hui ? ` : ""}J'ai créé ${nom} : ${quoiMin}. Je cherche 10 personnes pour le tester gratuitement et me dire franchement ce qui manque. Le lien est ici : ${url("groupes")}`, "groupes"]);
  messages.push(["Quand quelqu'un dit oui", `Merci ! Voici ton accès : ${url("oui")}\nTu as ${essai} jours gratuits, sans carte bancaire à l'inscription. ${refus.has("appeler") ? "Je t'écris" : "Je t'appelle"} dans une semaine pour savoir ce qui t'a servi.${prix ? ` Si ça t'est utile, l'abonnement sera de ${prix}.` : ""}`, "oui"]);

  // Les groupes : on ne liste pas de faux noms de groupes, on ouvre la vraie recherche avec les bons mots
  const mots = a.type === "metier" ? [a.metier, `${a.metier} France`, `entraide ${a.metier}`] : [String(sp.cible ?? s.categorie ?? nom).split(/[,.(]/)[0].trim(), `${s.categorie ?? ""} France`.trim(), `alternative ${s.nom ?? ""}`.trim()];
  const q = (t) => encodeURIComponent(t.toLowerCase());
  const groupes = [
    ["Groupes Facebook", mots.slice(0, 2).map((m) => [m, `https://www.facebook.com/search/groups/?q=${q(m)}`]), "Rejoins les 3 plus actifs (des posts chaque jour). Réponds d'abord à 2 ou 3 questions, puis publie ton post."],
    ["Groupes LinkedIn", mots.slice(0, 2).map((m) => [m, `https://www.linkedin.com/search/results/groups/?keywords=${q(m)}`]), "On y lit plus qu'on n'écrit : un post court qui pose une question marche mieux qu'une annonce."],
    ["Comptes Instagram de ta cible", [[mots[0], `https://www.instagram.com/explore/search/keyword/?q=${q(mots[0])}`]], "Repère les comptes de ta cible : un message privé court, avec un détail de leur compte pour montrer que tu l'as regardé."],
    ["Discussions Reddit et forums", [[mots[2] ?? mots[0], `https://www.google.com/search?q=${q(`${mots[2] ?? mots[0]} forum OR reddit`)}`]], "Cherche les questions sur ton problème et réponds en expliquant comment tu le règles."],
  ];

  return { messages, groupes };
}

// Les méthodes pour décrocher ses premiers clients, classées selon le budget du fondateur (0 €, petit budget, budget pub),
// ce qu'il refuse de faire, et ce que le SaaS modèle a réellement utilisé. Aucune promesse de résultat : des étapes concrètes.
export const BUDGETS = [["zero", "Je n'ai pas d'argent", "0 € : que des méthodes gratuites"], ["petit", "Un petit budget", "jusqu'à 300 € par mois"], ["pub", "Un budget pub", "300 € par mois ou plus"]];
export function methodesAcquisition(s, a, r, app, budget) {
  const sp = app?.spec ?? {};
  const nom = sp.nom ?? "ta version";
  const refus = new Set(r?.refus ?? []);
  const pro = a.type === "metier" || /B2B|both/i.test(s.audience ?? "");
  const cible = a.type === "metier" ? a.les : pro ? "les petites entreprises" : "ta cible";
  const f0 = (sp.formules ?? []).find((f) => Number(f.prix) > 0);
  const prix = Number(f0?.prix ?? s.prix_entree_eur ?? 0) || null;
  const modele = new Set(s.canaux ?? []);
  const M = [
    { k: "contact", nom: "Le contact direct", cout: 0, delai: "Dès la première semaine", refus: "appeler", canaux: ["Cold email", "Cold DM", "Cold calling"],
      pourquoi: `Le plus rapide pour les 10 premiers : tu parles à ${cible} un par un, tu apprends ce qui les fait acheter.`,
      etapes: ["Fais ta liste de 50 personnes ou entreprises qui ont le problème (onglet « Tes prospects »).", "Envoie 10 à 15 messages par jour, personnalisés avec un détail sur chacun (onglet « Quoi leur dire »).", "Relance une seule fois au bout de 4 jours, puis passe à autre chose."], va: "dire" },
    { k: "communautes", nom: "Les groupes et communautés", cout: 0, delai: "1 à 2 semaines", canaux: ["Facebook", "Reddit", "Discord", "Forums", "Slack communities"],
      pourquoi: `${cible.replace(/^\p{Ll}/u, (c) => c.toUpperCase())} posent leurs questions dans des groupes Facebook, LinkedIn et des forums : c'est là que tu deviens « celui qui s'y connaît ».`,
      etapes: ["Rejoins les 3 groupes les plus actifs de ta cible.", "Pendant une semaine, réponds à 2 questions par jour, sans parler de ton outil.", "Puis publie ton post (une question + ton offre de test gratuit)."], va: "groupes" },
    { k: "tiktok", nom: "TikTok et Reels", cout: 0, delai: "2 à 6 semaines", refus: "video", canaux: ["TikTok", "Instagram", "YouTube"],
      pourquoi: "L'algorithme montre tes vidéos à des inconnus, même avec 0 abonné : c'est le seul réseau où un nouveau compte peut toucher des milliers de personnes gratuitement.",
      etapes: ["Une vidéo de 15 à 30 secondes par jour pendant 30 jours : le problème, puis ton outil qui le règle.", "Les 3 premières secondes = l'accroche. Filme avec ton téléphone, pas besoin de montage.", "Mets le lien de ton SaaS dans ta bio et réponds à chaque commentaire."], lien: ["/explorer/tiktok", "Mes idées de vidéos"] },
    { k: "linkedin", nom: "LinkedIn (ton profil perso)", cout: 0, delai: "3 à 6 semaines", refus: "ecrire", canaux: ["LinkedIn"], seulPro: true,
      pourquoi: "Les posts d'une personne touchent bien plus que ceux d'une page entreprise. Raconter ton lancement attire les curieux et tes premiers clients.",
      etapes: ["Mets le lien de ton SaaS en haut de ton profil.", "3 posts par semaine : le problème de ta cible, une leçon, où tu en es.", "Commente 10 posts de ta cible par jour : ils viennent voir ton profil."] },
    { k: "parrainage", nom: "Le parrainage", cout: 0, delai: "Dès tes premiers clients", canaux: ["Referral program", "Word of mouth"],
      pourquoi: "Un client content connaît d'autres gens qui ont le même problème. Le parrainage ne coûte rien tant qu'il ne rapporte pas.",
      etapes: ["Offre 1 mois gratuit au parrain et au filleul.", "Demande-le au bon moment : juste après qu'un client te dit merci.", "Envoie à chaque client un message avec son lien à partager."] },
    { k: "affiliation", nom: "L'affiliation", cout: 0, delai: "1 à 2 mois", canaux: ["Affiliate", "Influencers"],
      pourquoi: `Des gens qui parlent déjà à ${cible} (créateurs, consultants, formateurs${a.type === "metier" ? ", fournisseurs du métier" : ""}) recommandent ${nom} et touchent une commission. Tu ne paies que quand un client paie.`,
      etapes: ["Propose 20 à 30 % de commission pendant 12 mois sur chaque client amené.", "Branche un outil d'affiliation compatible Stripe (Rewardful, Tolt ou PromoteKit) : il compte les ventes et les commissions.", `Contacte 10 personnes qui ont une audience auprès de ${cible}, avec un accès gratuit pour tester d'abord.`] },
    { k: "partenaires", nom: "Les prescripteurs", cout: 0, delai: "1 à 2 mois", canaux: ["Partnerships", "Events & conferences"], seulPro: true,
      pourquoi: a.type === "metier" ? `Ceux qui conseillent déjà ${a.les} (fédération, école, fournisseurs, expert-comptable) peuvent te recommander à des dizaines de clients d'un coup.` : "Les outils complémentaires et les consultants de ta cible peuvent te recommander à leurs clients.",
      etapes: ["Liste 10 acteurs qui parlent déjà à ta cible sans te concurrencer.", "Propose-leur un échange : une démo pour leurs membres, un avantage pour leurs clients, ou une commission.", "Va à un salon ou un meetup de ta cible avec ton outil prêt sur ton téléphone."] },
    { k: "google", nom: "Google et les comparateurs", cout: 0, delai: "1 à 3 mois", refus: "ecrire", canaux: ["SEO", "Blog", "Product Hunt"],
      pourquoi: "Les gens qui tapent « logiciel pour… » ou « alternative à… » cherchent déjà à acheter. Ça met du temps, puis ça amène des clients tous les mois sans effort.",
      etapes: ["Inscris ton SaaS sur les annuaires et comparateurs (Kit de lancement).", "Fais écrire tes 3 articles par Bingoo! (« alternative à… », « comment… »).", "Demande un avis Google ou Capterra à chaque client content."], lien: ["/explorer/reglages-saas?onglet=lancement", "Ouvrir le kit de lancement"] },
    { k: "createurs", nom: "Les petits créateurs", cout: 1, delai: "2 à 4 semaines", refus: "video", canaux: ["Influencers"],
      pourquoi: "Un créateur de 5 000 à 50 000 abonnés dans ta niche coûte peu et inspire plus confiance qu'une pub.",
      etapes: ["Repère 10 créateurs qui parlent à ta cible (TikTok, Instagram, YouTube).", "Propose : accès gratuit + 50 à 150 € la vidéo, ou une commission d'affiliation.", "Mesure chaque créateur avec son propre lien (?src=nom-du-createur)."] },
    { k: "meta", nom: "La pub Facebook et Instagram", cout: 1, delai: "1 à 2 semaines de test", refus: "pub", canaux: ["Meta Ads"],
      pourquoi: `On peut cibler très précisément ${a.type === "metier" ? `${a.les} par centre d'intérêt et par ville` : "par centres d'intérêt, âge et ville"}, avec un petit budget de départ.`,
      etapes: ["Commence à 5 à 10 € par jour pendant 7 jours, pas plus.", "Teste 3 vidéos ou visuels (ta vidéo pub Bingoo! en fait partie) et garde le meilleur.", "Coupe tout ce qui n'amène pas d'inscrits après 7 jours. Ne monte le budget que sur ce qui marche."], lien: ["/explorer/video", "Ma vidéo pub"] },
    { k: "googleads", nom: "La pub Google", cout: 2, delai: "1 à 2 semaines de test", refus: "pub", canaux: ["Google Ads"],
      pourquoi: "Tu apparais au moment exact où quelqu'un cherche une solution. Plus cher par clic, mais ce sont des gens prêts à acheter.",
      etapes: ["3 à 5 mots-clés très précis (« logiciel … pour … »), pas de mots larges.", "10 à 20 € par jour, envoyés vers ta page avec ?src=google.", "Regarde le coût par inscrit après 7 jours ; s'il dépasse ce qu'un client te rapporte en 3 mois, arrête."] },
    { k: "tiktokads", nom: "La pub TikTok", cout: 2, delai: "1 à 2 semaines de test", refus: "pub", canaux: ["TikTok Ads"],
      pourquoi: "Tu boostes tes vidéos qui marchent déjà en organique : c'est la pub la moins chère à produire.",
      etapes: ["Attends d'avoir une vidéo organique qui marche mieux que les autres.", "Booste-la (Spark Ads) avec le budget minimum de TikTok, environ 20 € par jour.", "Garde la même règle : coupe après 7 jours si elle n'amène pas d'inscrits."] },
  ];
  const plafond = budget === "pub" ? 2 : budget === "petit" ? 1 : 0;
  const score = (m) => (m.canaux.some((c) => modele.has(c)) ? 100 : 0) + (m.k === "contact" && pro ? 30 : 0) + (m.k === "tiktok" && !pro ? 30 : 0) + (m.k === "partenaires" && a.type === "metier" ? 20 : 0) - m.cout * 5;
  const ok = M.filter((m) => !(m.seulPro && !pro)).map((m) => ({ ...m, modele: m.canaux.some((c) => modele.has(c)), refuse: !!(m.refus && refus.has(m.refus)) }));
  const pour = ok.filter((m) => m.cout <= plafond && !m.refuse).sort((x, y) => score(y) - score(x));
  const plusTard = ok.filter((m) => m.cout > plafond && !m.refuse);
  const conseil = budget === "zero"
    ? `Sans un euro de pub, c'est possible : la plupart des SaaS trouvent leurs 10 premiers clients à la main. Concentre-toi sur 2 méthodes, pas plus, pendant 30 jours.${prix ? ` À ${prix} € par mois, tes premiers abonnés paieront ta future pub.` : ""}`
    : budget === "petit" ? "Garde 80 % de ton énergie sur les méthodes gratuites, et teste la pub en petit, 7 jours maximum, avant de dépenser plus."
      : "La pub accélère ce qui marche déjà, elle ne remplace pas un message qui convainc : teste d'abord ton message à la main, puis mets de l'argent derrière.";
  return { pour, plusTard, conseil, modeleNom: s.nom };
}
