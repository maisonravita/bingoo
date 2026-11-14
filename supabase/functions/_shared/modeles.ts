// Modèles faits main : pour les métiers que Bingoo! connaît par cœur, les écrans ne sont pas inventés par l'IA à chaque fois,
// ils viennent d'un modèle soigné et testé. L'IA n'adapte que le vocabulaire, les offres et les textes au client.
// deno-lint-ignore-file no-explicit-any
import { MODELES_CODE } from "./modeles-code.ts";

/** Le modèle qui convient au projet, ou null (construction classique écran par écran). */
export function modeleDe(p: any): string | null {
  const t = [p?.pitch, p?.cible, p?.probleme, ...(p?.equivalences ?? []).map((x: any) => x?.chez_toi), ...(p?.mvp ?? []).map((x: any) => x?.fonction)].join(" ").toLowerCase();
  const reservation = /r[ée]serv|rendez-vous|\brdv\b|cr[ée]neau|prise de rdv|planning d.intervention|interventions? (à|a) domicile|s[ée]ances?|agenda en ligne/.test(t);
  // Pas pour un logiciel dont le cœur est ailleurs (billetterie, location de biens, restaurant…)
  // Mots entiers seulement : « tableau de bord » ne doit pas passer pour une « table » de restaurant
  const autre = /billett?erie|\bbillets?\b|\btickets?\b|location de (voiture|v[ée]hicule|mat[ée]riel)|\brestaurants?\b|r[ée]servation de tables?|\btables? (de|pour) \d|\bh[ôo]tels?\b|chambres? d.h[ôo]te/.test(t);
  return reservation && !autre ? "reservation" : null;
}

const PRENOMS = ["Claire Martin", "Thomas Bernard", "Sophie Dubois", "Lucas Moreau", "Camille Laurent", "Julien Simon", "Emma Michel", "Hugo Lefebvre", "Léa Garcia", "Nathan Roux", "Chloé David", "Louis Bertrand", "Manon Fournier", "Arthur Girard", "Inès Bonnet", "Paul Dupont", "Sarah Lambert", "Maxime Fontaine"];
const HEURES = ["09:00", "09:30", "10:00", "11:00", "11:30", "14:00", "14:30", "15:00", "16:00", "16:30", "17:30"];

/** Prompt de personnalisation (modèle rapide) : vocabulaire du métier et offres réalistes. */
export const PERSO_RESERVATION = (p: any) => `Un SaaS de réservation et de planning va être livré pour ce métier : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rends un objet JSON :
- vocab : { rdv: le nom d'un rendez-vous dans ce métier au singulier (ex. « Rendez-vous », « Intervention », « Séance », « Cours »), rdvs: au pluriel, presta: une offre au singulier (ex. « Prestation », « Soin », « Service », « Formule »), prestas: au pluriel, client: « Client » ou mieux pour ce métier (« Patient », « Élève »…), clients: au pluriel, intervenant: la personne qui réalise (ex. « Intervenant », « Praticien », « Coach ») }
- prestations : 5 offres réalistes de ce métier en France : { nom (40 caractères max), prix (euros, nombre), duree (minutes, nombre), description (une phrase) }
- intervenants : 3 prénoms et noms français
Majuscule au début de chaque mot de vocab.`;

/** Spec du modèle Réservation et planning, prête à mettre en ligne (écrans, collections, données d'exemple, agenda). */
export function specReservation(perso: any) {
  const V = { rdv: "Rendez-vous", rdvs: "Rendez-vous", presta: "Prestation", prestas: "Prestations", client: "Client", clients: "Clients", intervenant: "Intervenant", ...(perso?.vocab ?? {}) };
  for (const k of Object.keys(V)) (V as any)[k] = String((V as any)[k]).slice(0, 30);
  const tete = `const V = ${JSON.stringify(V)};\n`;
  const code = MODELES_CODE.reservation;
  const ecrans = [
    { id: "tableau_bord", titre: "Tableau de bord", icone: "graphique", but: "Ton chiffre d'affaires, tes demandes à confirmer et tes prochains " + V.rdvs.toLowerCase() + "." },
    { id: "planning", titre: "Planning", icone: "agenda", but: "Le calendrier du mois : ajoute et déplace tes " + V.rdvs.toLowerCase() + " en un clic." },
    { id: "rendezvous", titre: V.rdvs.slice(0, 24), icone: "liste", but: "Suis chaque " + V.rdv.toLowerCase() + " par étape, de la demande au paiement." },
    { id: "clients", titre: V.clients.slice(0, 24), icone: "contacts", but: "Ton fichier " + V.clients.toLowerCase() + " avec leur historique et ce qu'ils t'ont rapporté." },
    { id: "prestations", titre: V.prestas.slice(0, 24), icone: "tag", but: "Tes offres, tes prix et tes durées." },
    { id: "pub_reserver", titre: "Réserver en ligne", icone: "carte", but: "La page que tes " + V.clients.toLowerCase() + " utilisent pour réserver seuls, 24 h sur 24.", public: true, lecture: ["prestations", "rendezvous"], ecriture: "rendezvous" },
  ].map((e) => ({ ...e, code: tete + code[e.id], ok: true, modele: "reservation" }));

  const collections = [
    { nom: "prestations", label: V.prestas, champs: [{ nom: "nom", type: "texte" }, { nom: "prix", type: "montant" }, { nom: "duree", type: "nombre" }, { nom: "description", type: "texte" }, { nom: "actif", type: "booleen" }] },
    { nom: "clients", label: V.clients, champs: [{ nom: "nom", type: "texte" }, { nom: "email", type: "email" }, { nom: "telephone", type: "telephone" }, { nom: "notes", type: "texte" }] },
    { nom: "rendezvous", label: V.rdvs, champs: [{ nom: "client_nom", type: "texte" }, { nom: "client_email", type: "email" }, { nom: "client_id", type: "texte" }, { nom: "prestation_id", type: "texte" }, { nom: "date", type: "date" }, { nom: "heure", type: "texte" }, { nom: "duree", type: "nombre" }, { nom: "intervenant", type: "texte" }, { nom: "statut", type: "choix", valeurs: ["demande", "confirme", "termine", "annule"] }, { nom: "montant", type: "montant" }, { nom: "notes", type: "texte" }] },
  ];

  // Données d'exemple vivantes : 3 mois d'activité cohérente (le passé est terminé, l'avenir est confirmé ou à confirmer)
  const prestations = (Array.isArray(perso?.prestations) && perso.prestations.length ? perso.prestations : [{ nom: "Prestation standard", prix: 60, duree: 60, description: "La formule la plus demandée." }, { nom: "Prestation longue", prix: 110, duree: 120, description: "Pour les besoins plus importants." }])
    .slice(0, 6).map((x: any, i: number) => ({ ref: `p${i + 1}`, nom: String(x.nom ?? "").slice(0, 60), prix: Number(x.prix) || 50, duree: Number(x.duree) || 60, description: String(x.description ?? "").slice(0, 200), actif: true }));
  const inter = (Array.isArray(perso?.intervenants) && perso.intervenants.length ? perso.intervenants : ["Julie Mercier", "Karim Benali", "Pauline Roche"]).slice(0, 3).map(String);
  const clients = PRENOMS.slice(0, 15).map((n, i) => ({ ref: `c${i + 1}`, nom: n, email: n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ /g, ".") + "@exemple.fr", telephone: `06 ${String(12 + i).padStart(2, "0")} ${String(34 + i * 3).slice(-2)} 56 ${String(70 + i).slice(-2)}`, notes: i % 4 === 0 ? "Client fidèle, préfère le matin." : "" }));
  let graine = 7; const hasard = () => { graine = (graine * 9301 + 49297) % 233280; return graine / 233280; };
  const jour = (d: number) => { const x = new Date(); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
  const rendezvous: any[] = [];
  for (let i = 0; i < 48; i++) {
    const d = Math.round(-60 + hasard() * 82); // de -60 à +22 jours
    const p = prestations[Math.floor(hasard() * prestations.length)], c = clients[Math.floor(Math.pow(hasard(), 1.6) * clients.length)];
    const statut = d < 0 ? (hasard() < 0.9 ? "termine" : "annule") : (hasard() < 0.72 ? "confirme" : "demande");
    rendezvous.push({ client_id: c.ref, client_nom: c.nom, client_email: c.email, prestation_id: p.ref, date: jour(d), heure: HEURES[Math.floor(hasard() * HEURES.length)], duree: p.duree, intervenant: inter[i % inter.length], statut, montant: p.prix, notes: "" });
  }
  return {
    vocab: V, ecrans, collections, demo: { prestations, clients, rendezvous },
    agenda: { collection: "rendezvous", champ_date: "date", champ_heure: "heure", duree: "duree", champs_titre: ["client_nom", "statut"] },
  };
}
