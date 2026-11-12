// L'angle de « ta version » : choisi par Bingoo! sans IA, à partir des vraies données du SaaS et des réponses.
// Puis les 10 premiers clients : où les trouver et quoi leur dire, selon cet angle et ce que la personne refuse de faire.
import { nomCanal } from "./plan30";

const PAYS = (() => { try { return new Intl.DisplayNames(["fr"], { type: "region" }); } catch { return null; } })();
const nomPays = (c) => { try { return c && c !== "FR" ? PAYS?.of(c) : null; } catch { return null; } };
const dollars = (n) => `${Number(n || 0).toLocaleString("fr-FR")} $`;

export const ANGLES = [["france", "Version française"], ["metier", "Pour un métier"], ["simple", "En plus simple"]];

export function angleDe(s, r, force) {
  const metier = (r?.metier ?? "").trim();
  const type = force ?? (metier ? "metier" : s.pays !== "FR" ? "france" : "simple");
  const chiffre = s.mrr ? `Il encaisse ${dollars(s.mrr)} par mois` : "Il gagne déjà de l'argent";
  if (type === "metier") {
    const m = metier || "un métier que tu connais";
    return { type, metier: m, titre: `${s.nom}, version ${m.toLowerCase()}`, phrase: `${chiffre} en vendant à tout le monde. Ta version : la même chose, pensée pour ${m.toLowerCase()}, avec leurs mots, leurs cas concrets et un prix à leur portée.`, brief: `Adapte le SaaS au métier suivant : ${m}. Vocabulaire, écrans, exemples et prix pensés pour ce métier en France.` };
  }
  if (type === "france") {
    const ou = nomPays(s.pays);
    return { type, titre: `${s.nom}, version française`, phrase: `${chiffre}${ou ? ` depuis ${ou}` : ""}${s.sans_fr ? ", et Bingoo! n'a repéré aucun équivalent français" : ""}. Ta version : la même chose, en français, pour les clients français, avec un support en français et des prix en euros.`, brief: "Version française : tout en français, pour les clients français (TVA, euros, RGPD, support en français), prix adapté au marché français." };
  }
  return { type: "simple", titre: `${s.nom}, en plus simple`, phrase: `${chiffre}. Ta version : l'essentiel de ce qu'il fait, plus simple à prendre en main et moins cher, pour les indépendants et les petites structures.`, brief: "Version plus simple : seulement le cœur du produit, prise en main en 5 minutes, prix plus bas, pour les indépendants et petites structures." };
}

// Qui les clients, en une expression utilisable dans une phrase
const cibleDe = (s, a) => a.type === "metier" ? a.metier.toLowerCase() : (s.persona ? s.persona.split(/[.;,]/)[0].slice(0, 70) : /B2B/i.test(s.audience ?? "") ? "les petites entreprises" : "ta cible");

export function premiersClients(s, a, r) {
  const refus = new Set(r?.refus ?? []);
  const cible = cibleDe(s, a);
  const ou = [];
  if (a.type === "metier") {
    ou.push(["Google Maps", `Cherche « ${a.metier} » dans ta ville et les villes voisines : note les 50 premiers avec leur site et leur e-mail.`]);
    ou.push(["Groupes Facebook et LinkedIn du métier", `Rejoins 3 groupes où des ${a.metier.toLowerCase()} se posent des questions. Réponds d'abord, sans vendre.`]);
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
  const voix = a.type === "metier" ? `pour les ${a.metier.toLowerCase()}` : a.type === "france" ? "en français" : "plus simple et moins cher";
  const messages = [];
  if (!refus.has("appeler")) {
    messages.push(["Premier message (e-mail ou message privé)", `Bonjour [prénom],\n\nJe prépare un outil ${voix} qui [ce que fait ton outil, en une phrase].\nAvant de le lancer, je cherche 10 personnes qui ont ce problème pour l'essayer gratuitement pendant un mois.\n\nEst-ce que c'est un sujet pour vous en ce moment ?\n\n[Ton prénom]`]);
    messages.push(["Relance (4 jours après, une seule fois)", `Bonjour [prénom], je me permets de revenir vers vous : les premiers essais commencent la semaine prochaine. Si ce n'est pas le bon moment, dites-le-moi simplement et je ne vous relancerai pas.`]);
  }
  messages.push(["Message dans un groupe ou un forum", `Bonjour à tous, je construis un outil ${voix} pour [le problème]. Comment vous gérez ça aujourd'hui ? Je cherche quelques personnes pour le tester gratuitement et me dire ce qui manque.`]);
  messages.push(["Quand quelqu'un dit oui", `Merci ! Voici ton accès : [lien]. Tu as un mois gratuit. ${refus.has("appeler") ? "Je t'écris" : "Je t'appelle"} dans une semaine pour savoir ce qui t'a servi et ce qui t'a manqué. Si ça t'est utile, l'abonnement sera de [prix] € par mois.`]);
  return { cible, ou: ou.slice(0, 5), messages };
}
