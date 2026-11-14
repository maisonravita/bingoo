// Modèles faits main : pour les métiers que Bingoo! connaît par cœur, les écrans ne sont pas inventés par l'IA à chaque fois,
// ils viennent d'un modèle soigné et testé. L'IA n'adapte que le vocabulaire, les offres et les textes au client.
// deno-lint-ignore-file no-explicit-any
import { MODELES_CODE } from "./modeles-code.ts";

/** Le modèle qui convient au projet, ou null (construction classique écran par écran). */
// Chaque famille marque des points selon les mots du projet ; la plus présente l'emporte.
export function modeleDe(p: any): string | null {
  const t = [p?.pitch, p?.cible, p?.probleme, ...(p?.equivalences ?? []).map((x: any) => x?.chez_toi), ...(p?.mvp ?? []).map((x: any) => x?.fonction)].join(" ").toLowerCase();
  const n = (re: RegExp) => (t.match(re) ?? []).length;
  // Pas pour un logiciel dont le cœur est ailleurs (billetterie, location de biens, restaurant…). Mots entiers : « tableau de bord » n'est pas une « table »
  const autre = /billett?erie|\bbillets?\b|\btickets?\b|location de (voiture|v[ée]hicule|mat[ée]riel)|\brestaurants?\b|r[ée]servation de tables?|\btables? (de|pour) \d|\bh[ôo]tels?\b|chambres? d.h[ôo]te/.test(t);
  const reservation = autre ? 0 : n(/r[ée]serv|rendez-vous|\brdv\b|cr[ée]neau|planning d.intervention|interventions? (à|a) domicile|s[ée]ances?|agenda en ligne/g);
  const devis = n(/\bdevis\b|factur|\bquotes?\b|invoic|estimat|bons? de commande|acomptes?|relances? de paiement|impay/g);
  if (!reservation && !devis) return null;
  return devis > reservation ? "devis" : "reservation";
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
    vocab: V, ecrans, collections, demo: { prestations, clients, rendezvous }, demo_ancre: jour(0),
    agenda: { collection: "rendezvous", champ_date: "date", champ_heure: "heure", duree: "duree", champs_titre: ["client_nom", "statut"] },
  };
}

// ---------------------------------------------------------------- Modèle « Clients, devis et factures »
export const PERSO_DEVIS = (p: any) => `Un logiciel de devis et de factures va être livré pour ce métier : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rends un objet JSON :
- vocab : { client: « Client » ou mieux pour ce métier, clients: au pluriel, presta: ce qu'on vend au singulier (« Prestation », « Produit », « Service »…), prestas: au pluriel }
- catalogue : 6 lignes de devis réalistes de ce métier en France : { nom (45 caractères max), prix (euros HT, nombre), unite (« forfait », « heure », « jour », « unité », « m² », « mois » ou « personne »), description (une phrase) }
- entreprise : { nom: nom d'une entreprise fictive de ce métier, ville: une ville française }
- b2b : true si ce métier vend surtout à des entreprises, false s'il vend surtout à des particuliers
- societes : si b2b, 12 noms d'entreprises fictives françaises crédibles pour ses clients ; sinon []
Majuscule au début de chaque mot de vocab.`;

export function specDevis(perso: any) {
  const V = { client: "Client", clients: "Clients", presta: "Prestation", prestas: "Prestations", ...(perso?.vocab ?? {}) };
  for (const k of Object.keys(V)) (V as any)[k] = String((V as any)[k]).slice(0, 30);
  const tete = `const V = ${JSON.stringify(V)};\n`;
  const code = MODELES_CODE.devis;
  const ecrans = [
    { id: "tableau_bord", titre: "Tableau de bord", icone: "graphique", but: "Ce que tu as encaissé, ce qu'on te doit, tes devis en attente et qui relancer." },
    { id: "devis", titre: "Devis", icone: "fichier", but: "Crée tes devis en un clic depuis ton catalogue, envoie-les par e-mail et transforme-les en facture." },
    { id: "factures", titre: "Factures", icone: "panier", but: "Tes factures numérotées en PDF, les paiements reçus et les relances des retards." },
    { id: "clients", titre: V.clients.slice(0, 24), icone: "contacts", but: "Ton fichier " + V.clients.toLowerCase() + " avec ce que chacun t'a rapporté et ce qu'il te doit." },
    { id: "catalogue", titre: V.prestas.slice(0, 24), icone: "tag", but: "Ton catalogue de " + V.prestas.toLowerCase() + " et tes prix, pour remplir un devis sans rien ressaisir." },
    { id: "entreprise", titre: "Mon entreprise", icone: "reglages", but: "Tes coordonnées, ton SIRET, ton IBAN et tes mentions, repris sur chaque document." },
    { id: "pub_demande", titre: "Demander un devis", icone: "carte", but: "La page où tes " + V.clients.toLowerCase() + " demandent un devis en ligne, 24 h sur 24.", public: true, lecture: ["catalogue"], ecriture: "devis" },
  ].map((e) => ({ ...e, code: tete + code[e.id], ok: true, modele: "devis" }));
  const L = { nom: "lignes", type: "texte" };
  const collections = [
    { nom: "clients", label: V.clients, champs: [{ nom: "nom", type: "texte" }, { nom: "entreprise", type: "texte" }, { nom: "email", type: "email" }, { nom: "telephone", type: "telephone" }, { nom: "adresse", type: "texte" }, { nom: "notes", type: "texte" }] },
    { nom: "catalogue", label: V.prestas, champs: [{ nom: "nom", type: "texte" }, { nom: "prix", type: "montant" }, { nom: "unite", type: "texte" }, { nom: "description", type: "texte" }] },
    { nom: "devis", label: "Devis", champs: [{ nom: "numero", type: "texte" }, { nom: "client_id", type: "texte" }, { nom: "client_nom", type: "texte" }, { nom: "client_email", type: "email" }, { nom: "date", type: "date" }, { nom: "validite", type: "date" }, { nom: "statut", type: "choix", valeurs: ["demande", "brouillon", "envoye", "accepte", "refuse"] }, L, { nom: "tva", type: "nombre" }, { nom: "total_ht", type: "montant" }, { nom: "notes", type: "texte" }] },
    { nom: "factures", label: "Factures", champs: [{ nom: "numero", type: "texte" }, { nom: "devis_id", type: "texte" }, { nom: "client_id", type: "texte" }, { nom: "client_nom", type: "texte" }, { nom: "client_email", type: "email" }, { nom: "date", type: "date" }, { nom: "echeance", type: "date" }, { nom: "statut", type: "choix", valeurs: ["a_payer", "payee"] }, L, { nom: "tva", type: "nombre" }, { nom: "total_ht", type: "montant" }, { nom: "payee_le", type: "date" }] },
    { nom: "entreprise", label: "Mon entreprise", champs: [{ nom: "nom", type: "texte" }, { nom: "adresse", type: "texte" }, { nom: "siret", type: "texte" }, { nom: "email", type: "email" }, { nom: "iban", type: "texte" }, { nom: "tva_defaut", type: "nombre" }, { nom: "delai", type: "nombre" }] },
  ];
  // Données d'exemple vivantes : 5 mois d'activité (devis tranchés, factures payées, quelques retards à relancer)
  const cat = (Array.isArray(perso?.catalogue) && perso.catalogue.length ? perso.catalogue : [{ nom: "Prestation standard", prix: 450, unite: "forfait", description: "La formule la plus demandée." }, { nom: "Heure d'intervention", prix: 55, unite: "heure", description: "Facturée au temps passé." }, { nom: "Déplacement", prix: 35, unite: "forfait", description: "Dans un rayon de 30 km." }])
    .slice(0, 6).map((x: any, i: number) => ({ ref: `k${i + 1}`, nom: String(x.nom ?? "").slice(0, 60), prix: Math.max(1, Math.round(Number(x.prix) || 100)), unite: String(x.unite ?? "forfait").slice(0, 12), description: String(x.description ?? "").slice(0, 200) }));
  const b2b = perso?.b2b !== false;
  const societes = Array.isArray(perso?.societes) ? perso.societes.map(String) : [];
  const villes = ["Paris", "Lyon", "Nantes", "Bordeaux", "Lille", "Toulouse", "Rennes", "Marseille", "Strasbourg", "Montpellier", "Nice", "Grenoble"];
  const sans = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, ".");
  const clients = PRENOMS.slice(0, 12).map((n, i) => ({ ref: `c${i + 1}`, nom: n, entreprise: b2b ? String(societes[i] ?? "").slice(0, 60) : "", email: sans(n) + "@exemple.fr", telephone: `06 ${String(21 + i).padStart(2, "0")} ${String(40 + i * 3).slice(-2)} 18 ${String(60 + i).slice(-2)}`, adresse: `${4 + i * 3} rue de la République, ${villes[i]}`, notes: i % 5 === 0 ? "Client régulier, paie toujours à temps." : "" }));
  let graine = 11; const hasard = () => { graine = (graine * 9301 + 49297) % 233280; return graine / 233280; };
  const jour = (d: number) => { const x = new Date(); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
  const plus = (iso: string, d: number) => { const x = new Date(iso + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
  const lignes = () => { const n = 1 + Math.floor(hasard() * 3), out: any[] = [], pris = new Set<number>(); for (let k = 0; k < n; k++) { let j = Math.floor(hasard() * cat.length); if (pris.has(j)) continue; pris.add(j); const c = cat[j]; const u = c.unite, q = u === "personne" ? 20 + Math.floor(hasard() * 12) * 5 : u === "heure" ? 2 + Math.floor(hasard() * 10) : u === "jour" ? 1 + Math.floor(hasard() * 4) : u === "m²" ? 10 + Math.floor(hasard() * 60) : u === "mois" ? 1 + Math.floor(hasard() * 6) : u === "unité" ? (c.prix < 50 ? 10 + Math.floor(hasard() * 30) : 1 + Math.floor(hasard() * 4)) : 1; out.push({ libelle: c.nom, quantite: q, prix: c.prix }); } return out; };
  const ht = (ls: any[]) => ls.reduce((a, l) => a + l.quantite * l.prix, 0);
  // Devis du plus ancien au plus récent (numérotation dans l'ordre), puis factures des devis acceptés
  const ages = Array.from({ length: 26 }, () => Math.round(-175 + hasard() * 173)).sort((a, b) => a - b);
  const num = new Map<string, number>(); const numero = (pre: string, iso: string) => { const k = pre + iso.slice(0, 4); num.set(k, (num.get(k) ?? 0) + 1); return `${pre}-${iso.slice(0, 4)}-${String(num.get(k)).padStart(3, "0")}`; };
  const devis: any[] = [], factures: any[] = [];
  ages.forEach((a, i) => {
    const c = clients[Math.floor(Math.pow(hasard(), 1.4) * clients.length)], date = jour(a), ls = lignes(), r = hasard();
    const statut = a > -4 ? (r < 0.5 ? "brouillon" : "envoye") : a > -25 ? (r < 0.55 ? "envoye" : r < 0.85 ? "accepte" : "refuse") : (r < 0.68 ? "accepte" : r < 0.9 ? "refuse" : "envoye");
    const d = { ref: `d${i + 1}`, numero: numero("D", date), client_id: c.ref, client_nom: c.nom, client_email: c.email, date, validite: plus(date, 30), statut, lignes: ls, tva: 20, total_ht: ht(ls), notes: "", ...(statut !== "brouillon" ? { envoye_le: date } : {}) };
    devis.push(d);
    if (statut === "accepte") {
      const fd = plus(date, 2 + Math.floor(hasard() * 6)), ech = plus(fd, 30), delai = 8 + Math.floor(hasard() * 30), payee = plus(fd, delai) <= jour(0) && hasard() < 0.82;
      factures.push({ numero: numero("F", fd), devis_id: d.ref, client_id: c.ref, client_nom: c.nom, client_email: c.email, date: fd, echeance: ech, statut: payee ? "payee" : "a_payer", lignes: ls, tva: 20, total_ht: ht(ls), notes: "", ...(payee ? { payee_le: plus(fd, delai) } : {}) });
    }
  });
  // Deux demandes reçues par la page en ligne, pour montrer le parcours complet
  [[-1, 7], [0, 3]].forEach(([a, k], j) => { const c = clients[k], date = jour(a); devis.push({ ref: `d${27 + j}`, numero: "", client_nom: c.nom, client_email: c.email, date, statut: "demande", lignes: [{ libelle: cat[j % cat.length].nom, quantite: 1, prix: cat[j % cat.length].prix }], tva: 20, total_ht: cat[j % cat.length].prix, notes: "Bonjour, pouvez-vous me faire un devis ? Je suis disponible le mois prochain." }); });
  // Le tableau de bord doit raconter une vraie activité dès l'ouverture : un paiement ce mois-ci, une facture en retard, un devis à relancer
  const auj = jour(0), mois = auj.slice(0, 7);
  if (!factures.some((f) => String(f.payee_le ?? "").slice(0, 7) === mois)) { const f = [...factures].reverse().find((x) => x.date < auj); if (f) Object.assign(f, { statut: "payee", payee_le: auj }); }
  if (!factures.some((f) => f.statut === "a_payer" && f.echeance < auj)) { const f = factures.find((x) => x.date <= jour(-40) && x.date >= jour(-75)) ?? factures[0]; if (f) { f.statut = "a_payer"; delete f.payee_le; if (f.echeance >= auj) f.echeance = jour(-6); } }
  if (!factures.some((f) => f.statut === "a_payer" && f.echeance >= auj)) { const d = [...devis].reverse().find((x) => x.date <= jour(-5) && x.date >= jour(-22) && x.statut !== "accepte"); if (d) { d.statut = "accepte"; const fd = plus(d.date, 3); factures.push({ numero: numero("F", fd), devis_id: d.ref, client_id: d.client_id, client_nom: d.client_nom, client_email: d.client_email, date: fd, echeance: plus(fd, 30), statut: "a_payer", lignes: d.lignes, tva: 20, total_ht: d.total_ht, notes: "" }); } }
  if (!devis.some((d) => d.statut === "envoye" && d.date <= jour(-8))) { const d = devis.find((x) => x.date <= jour(-8) && x.date >= jour(-30) && x.statut !== "accepte"); if (d) { d.statut = "envoye"; d.envoye_le = d.date; } }
  const e = perso?.entreprise ?? {};
  const entreprise = [{ nom: String(e.nom ?? "Mon Entreprise").slice(0, 60), adresse: `12 avenue Victor Hugo, ${String(e.ville ?? "Lyon").slice(0, 40)}`, siret: "123 456 789 00012", tva_intra: "FR12 123456789", email: "contact@exemple.fr", telephone: "04 72 00 00 00", iban: "FR76 3000 4000 0500 0012 3456 789", bic: "BNPAFRPP", tva_defaut: 20, delai: 30, mentions: "" }];
  return { vocab: V, ecrans, collections, demo: { clients, catalogue: cat, devis, factures, entreprise }, demo_ancre: jour(0), agenda: { collection: "factures", champ_date: "echeance", champ_heure: null, duree: 30, champs_titre: ["numero", "client_nom"] } };
}

export const FAIT = {
  reservation: "Cette version fait exactement ceci, et rien d'autre : un planning en calendrier, le suivi de chaque rendez-vous par étapes (à confirmer, confirmé, terminé, annulé), un fichier clients avec historique et chiffre d'affaires, les offres avec prix et durées, une page de réservation en ligne pour les clients avec e-mail de confirmation et rappel automatique par e-mail la veille, un tableau de bord du chiffre d'affaires, l'import et l'export Excel, l'équipe et l'abonnement. Les textes (pitch_site, atouts, formules) ne promettent RIEN d'autre (pas de SMS, pas de paiement ni d'acompte à la réservation, pas de factures PDF).",
  devis: "Cette version fait exactement ceci, et rien d'autre : un catalogue de prestations avec prix, des devis créés en un clic (lignes, TVA, total), envoyés par e-mail et téléchargeables en PDF, transformés en facture numérotée quand ils sont acceptés, des factures PDF avec mentions légales et IBAN, le suivi des paiements et des retards avec relance par e-mail en un clic, un fichier clients avec ce que chacun a rapporté et doit encore, une page en ligne où les clients demandent un devis, un tableau de bord (encaissé, reste à encaisser, taux d'acceptation), l'import et l'export Excel, l'équipe et l'abonnement. Les textes (pitch_site, atouts, formules) ne promettent RIEN d'autre (pas de signature électronique, pas de paiement en ligne des factures, pas de connexion à la banque ni à un logiciel comptable, pas de facture électronique Chorus Pro).",
};
export const PERSO: Record<string, (p: any) => string> = { reservation: PERSO_RESERVATION, devis: PERSO_DEVIS };
export const SPEC: Record<string, (perso: any) => any> = { reservation: specReservation, devis: specDevis };
