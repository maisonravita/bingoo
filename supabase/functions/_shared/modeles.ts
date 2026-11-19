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
  // Outil d'écriture par IA : le cœur du produit est un texte écrit par l'IA (CV, posts, articles, guides, réponses…)
  const ecriture = /\bia\b|intelligence artificielle/.test(t) ? n(/r[ée]dig|g[ée]n[èeé]r|[ée]cri(t|re|ture|vain)|reformul|\bcv\b|lettres? de motivation|\bposts?\b|articles?\b|newsletters?\b|copywrit|textes?\b|guides?\b/g) : 0;
  // CRM : suivi de prospects, d'affaires (pipeline) et de relances commerciales
  const crm = n(/\bcrm\b|prospect|pipeline|\bleads?\b|opportunit|affaires? (en cours|commerciales?)|suivi commercial|relances? (commerciales?|clients?)|cycle de vente|force de vente|fichier clients?|portefeuille clients?/g);
  const best = Math.max(reservation, devis, crm);
  // Appli grand public ou communauté (sport, progression, habitudes, révisions…) : pas un modèle de réservation ou de devis,
  // même si elle parle de « séances » ; le générateur libre la conçoit pour la personne elle-même
  const grandPublic = n(/entra[iî]nements?|progression|objectifs?|d[ée]fis?|classements?|communaut|coureurs?|course à pied|musculation|habitudes?|r[ée]visions?|nutrition|calories|journal|records?|motivation|apprentissage/g);
  if (grandPublic >= 4 && grandPublic >= best) return null;
  if (ecriture >= 3 && ecriture > best) return "ecriture";
  // Une mention en passant (« facturation », « une séance ») ne fait pas d'un logiciel de fidélité un outil de devis
  if (best < 3) return null;
  if (crm >= best && crm > devis && crm > reservation) return "crm";
  return devis > reservation ? "devis" : "reservation";
}

const PRENOMS = ["Claire Martin", "Thomas Bernard", "Sophie Dubois", "Lucas Moreau", "Camille Laurent", "Julien Simon", "Emma Michel", "Hugo Lefebvre", "Léa Garcia", "Nathan Roux", "Chloé David", "Louis Bertrand", "Manon Fournier", "Arthur Girard", "Inès Bonnet", "Paul Dupont", "Sarah Lambert", "Maxime Fontaine"];
const HEURES = ["09:00", "09:30", "10:00", "11:00", "11:30", "14:00", "14:30", "15:00", "16:00", "16:30", "17:30"];

/** Prompt de personnalisation (modèle rapide) : vocabulaire du métier et offres réalistes. */
export const PERSO_RESERVATION = (p: any) => `Un SaaS de réservation et de planning va être livré pour ce métier : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rendez un objet JSON :
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
    { id: "tableau_bord", titre: "Tableau de bord", icone: "graphique", but: "Votre chiffre d'affaires, vos demandes à confirmer et vos prochains " + V.rdvs.toLowerCase() + "." },
    { id: "planning", titre: "Planning", icone: "agenda", but: "Le calendrier du mois : ajoutez et déplacez vos " + V.rdvs.toLowerCase() + " en un clic." },
    { id: "rendezvous", titre: V.rdvs.slice(0, 24), icone: "liste", but: "Suivez chaque " + V.rdv.toLowerCase() + " par étape, de la demande au paiement." },
    { id: "clients", titre: V.clients.slice(0, 24), icone: "contacts", but: "Votre fichier " + V.clients.toLowerCase() + " avec leur historique et ce qu'ils vous ont rapporté." },
    { id: "prestations", titre: V.prestas.slice(0, 24), icone: "tag", but: "Vos offres, vos prix et vos durées." },
    { id: "disponibilites", titre: "Disponibilités", icone: "horloge", but: "Vos heures d'ouverture : vos " + V.clients.toLowerCase() + " ne voient que les créneaux libres." },
    { id: "pub_reserver", titre: "Réserver en ligne", icone: "carte", but: "La page que vos " + V.clients.toLowerCase() + " utilisent pour réserver seuls, 24 h sur 24 : seulement les vrais créneaux libres.", public: true, lecture: ["prestations", "rendezvous", "disponibilites"], ecriture: "rendezvous" },
  ].map((e) => ({ ...e, code: tete + code[e.id], ok: true, modele: "reservation" }));

  const collections = [
    { nom: "prestations", label: V.prestas, champs: [{ nom: "nom", type: "texte" }, { nom: "prix", type: "montant" }, { nom: "duree", type: "nombre" }, { nom: "description", type: "texte" }, { nom: "actif", type: "booleen" }] },
    { nom: "disponibilites", label: "Disponibilités", champs: [{ nom: "jour", type: "nombre" }, { nom: "debut", type: "texte" }, { nom: "fin", type: "texte" }, { nom: "actif", type: "booleen" }] },
    { nom: "clients", label: V.clients, champs: [{ nom: "nom", type: "texte" }, { nom: "email", type: "email" }, { nom: "telephone", type: "telephone" }, { nom: "notes", type: "texte" }] },
    { nom: "rendezvous", label: V.rdvs, champs: [{ nom: "client_nom", type: "texte" }, { nom: "client_email", type: "email" }, { nom: "client_id", type: "texte" }, { nom: "prestation_id", type: "texte" }, { nom: "date", type: "date" }, { nom: "heure", type: "texte" }, { nom: "duree", type: "nombre" }, { nom: "intervenant", type: "texte" }, { nom: "statut", type: "choix", valeurs: ["demande", "confirme", "termine", "annule"] }, { nom: "montant", type: "montant" }, { nom: "notes", type: "texte" }] },
  ];

  // Données d'exemple vivantes : 3 mois d'activité cohérente (le passé est terminé, l'avenir est confirmé ou à confirmer)
  const prestations = (Array.isArray(perso?.prestations) && perso.prestations.length ? perso.prestations : [{ nom: "Prestation standard", prix: 60, duree: 60, description: "La formule la plus demandée." }, { nom: "Prestation longue", prix: 110, duree: 120, description: "Pour les besoins plus importants." }])
    .slice(0, 6).map((x: any, i: number) => ({ ref: `p${i + 1}`, nom: String(x.nom ?? "").slice(0, 60), prix: Number(x.prix) || 50, duree: Number(x.duree) || 60, description: String(x.description ?? "").slice(0, 200), actif: true }));
  const inter = (Array.isArray(perso?.intervenants) && perso.intervenants.length ? perso.intervenants : ["Julie Mercier", "Karim Benali", "Pauline Roche"]).slice(0, 3).map((x: any) => typeof x === "string" ? x : String(x?.nom ?? x?.name ?? "")).filter(Boolean);
  if (!inter.length) inter.push("Julie Mercier");
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
    vocab: V, ecrans, collections, demo: { prestations, clients, rendezvous, disponibilites: [1, 2, 3, 4, 5].flatMap((j) => [{ jour: j, debut: "09:00", fin: "12:00", actif: true }, { jour: j, debut: "14:00", fin: "18:00", actif: true }]) }, demo_ancre: jour(0),
    agenda: { collection: "rendezvous", champ_date: "date", champ_heure: "heure", duree: "duree", champs_titre: ["client_nom", "statut"] },
  };
}

// ---------------------------------------------------------------- Modèle « Clients, devis et factures »
export const PERSO_DEVIS = (p: any) => `Un logiciel de devis et de factures va être livré pour ce métier : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rendez un objet JSON :
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
    { id: "tableau_bord", titre: "Tableau de bord", icone: "graphique", but: "Ce que vous avez encaissé, ce qu'on vous doit, vos devis en attente et qui relancer." },
    { id: "devis", titre: "Devis", icone: "fichier", but: "Créez vos devis en un clic depuis votre catalogue, envoie-les par e-mail et transforme-les en facture." },
    { id: "factures", titre: "Factures", icone: "panier", but: "Vos factures numérotées en PDF, les paiements reçus et les relances des retards." },
    { id: "clients", titre: V.clients.slice(0, 24), icone: "contacts", but: "Votre fichier " + V.clients.toLowerCase() + " avec ce que chacun vous a rapporté et ce qu'il vous doit." },
    { id: "catalogue", titre: V.prestas.slice(0, 24), icone: "tag", but: "Votre catalogue de " + V.prestas.toLowerCase() + " et vos prix, pour remplir un devis sans rien ressaisir." },
    { id: "entreprise", titre: "Mon entreprise", icone: "reglages", but: "Vos coordonnées, votre SIRET, votre IBAN et vos mentions, repris sur chaque document." },
    { id: "pub_demande", titre: "Demander un devis", icone: "carte", but: "La page où vos " + V.clients.toLowerCase() + " demandent un devis en ligne, 24 h sur 24.", public: true, lecture: ["catalogue"], ecriture: "devis" },
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
  crm: "Cette version fait exactement ceci, et rien d'autre : un fichier de contacts (prospects et clients) avec leur historique, un pipeline d'affaires par étapes à faire glisser (nouveau, qualifié, proposition, négociation, gagné, perdu) avec montants et prévision pondérée, des tâches et relances datées (liste et calendrier), l'envoi de vrais e-mails à un contact, un tableau de bord commercial, et un formulaire de contact en ligne qui crée le prospect et lui envoie une confirmation.",
  ecriture: "Cette version fait exactement ceci, et rien d'autre : l'utilisateur choisit un type de texte, remplit quelques champs, et l'IA intégrée écrit le texte ; il l'ajuste en un clic (plus court, plus percutant, plus simple, en anglais), le modifie, le copie ou le télécharge en PDF ; tous ses textes sont rangés et cherchables, avec favoris et duplication ; une page « Mon style » où il décrit qui il est et colle un exemple de son écriture pour que l'IA écrive avec sa voix ; un tableau de bord de son activité ; l'équipe et l'abonnement. Les textes (pitch_site, atouts, formules) ne promettent RIEN d'autre (pas de publication automatique sur les réseaux, pas d'import de fichier ni de lecture de document, pas d'images, pas de détection de plagiat, pas de modèle d'IA au choix, pas d'extension de navigateur).",
  reservation: "Cette version fait exactement ceci, et rien d'autre : un planning en calendrier, le suivi de chaque rendez-vous par étapes (à confirmer, confirmé, terminé, annulé), un fichier clients avec historique et chiffre d'affaires, les offres avec prix et durées, les heures d'ouverture par jour, une page de réservation en ligne où les clients ne voient que les vrais créneaux libres (selon les heures d'ouverture, la durée de l'offre et les rendez-vous déjà pris), le paiement en réservant par le lien de paiement de l'offre (Stripe, PayPal, SumUp…), une salle de visioconférence créée pour chaque rendez-vous des offres en visio, avec e-mail de confirmation et rappel automatique par e-mail la veille, un tableau de bord du chiffre d'affaires, l'import et l'export Excel, l'équipe et l'abonnement. Les textes (pitch_site, atouts, formules) ne promettent RIEN d'autre (pas de SMS, pas de paiement ni d'acompte à la réservation, pas de factures PDF).",
  devis: "Cette version fait exactement ceci, et rien d'autre : un catalogue de prestations avec prix, des devis créés en un clic (lignes, TVA, total), envoyés par e-mail et téléchargeables en PDF, transformés en facture numérotée quand ils sont acceptés, des factures PDF avec mentions légales et IBAN, le suivi des paiements et des retards avec relance par e-mail en un clic, un fichier clients avec ce que chacun a rapporté et doit encore, une page en ligne où les clients demandent un devis, un tableau de bord (encaissé, reste à encaisser, taux d'acceptation), l'import et l'export Excel, l'équipe et l'abonnement. Les textes (pitch_site, atouts, formules) ne promettent RIEN d'autre (pas de signature électronique, pas de paiement en ligne des factures, pas de connexion à la banque ni à un logiciel comptable, pas de facture électronique Chorus Pro).",
};

// ---------------------------------------------------------------- Modèle « Outil d'écriture par IA »
export const PERSO_ECRITURE = (p: any) => `Un outil d'écriture par IA va être livré pour ce produit : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
L'utilisateur choisit un type de texte, remplit quelques champs, et l'IA écrit. Rendez un objet JSON :
- vocab : { doc: le nom d'un texte produit, au singulier (ex. « CV », « Post », « Article », « Guide », « Réponse »), docs: au pluriel }
- types : 2 à 4 types de textes que ce produit écrit : { id (snake_case court), nom (3 mots max), description (une phrase), consigne (la consigne précise donnée à l'IA pour écrire ce texte : longueur, structure, règles du genre, 3 à 5 phrases), champs : 3 à 5 objets { nom (snake_case), label, type (« texte », « long » ou « choix »), options (pour choix : 3 à 5 valeurs), placeholder (exemple concret), requis (true/false) } }
- tons : 4 tons proposés (un ou deux mots chacun, ex. « Professionnel », « Chaleureux »)
- exemples : 7 textes déjà écrits, réalistes et de bonne qualité, répartis entre les types : { type (id d'un type), titre (6 mots max), entrees (valeurs des champs de ce type), contenu (le texte final, 60 à 160 mots, avec des retours à la ligne) }
Tout en français, sans aucun nom de marque réelle.`;

export function specEcriture(perso: any) {
  const types = (Array.isArray(perso?.types) && perso.types.length ? perso.types : [{ id: "texte", nom: "Nouveau texte", description: "Un texte prêt à publier.", consigne: "Écrivez un texte clair et engageant à partir de ces informations.", champs: [{ nom: "sujet", label: "Sujet", type: "texte", placeholder: "De quoi parle le texte ?", requis: true }, { nom: "public", label: "Pour qui", type: "texte", placeholder: "Ex. : des dirigeants de PME", requis: false }, { nom: "points", label: "Points à faire passer", type: "long", placeholder: "Une idée par ligne", requis: false }] }])
    .slice(0, 4).map((x: any, i: number) => ({ id: String(x.id ?? `type_${i}`).toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 30) || `type_${i}`, nom: String(x.nom ?? "Texte").slice(0, 40), description: String(x.description ?? "").slice(0, 160), consigne: String(x.consigne ?? "").slice(0, 900),
      champs: (Array.isArray(x.champs) ? x.champs : []).slice(0, 5).map((c: any, j: number) => ({ nom: String(c.nom ?? `champ_${j}`).toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 30) || `champ_${j}`, label: String(c.label ?? "Information").slice(0, 60), type: ["texte", "long", "choix"].includes(c.type) ? c.type : "texte", options: Array.isArray(c.options) ? c.options.slice(0, 6).map(String) : undefined, placeholder: String(c.placeholder ?? "").slice(0, 120), requis: c.requis === true })) }));
  for (const t of types) if (!t.champs.some((c: any) => c.requis)) t.champs[0] && (t.champs[0].requis = true);
  const tons = (Array.isArray(perso?.tons) && perso.tons.length ? perso.tons : ["Professionnel", "Chaleureux", "Direct", "Inspirant"]).slice(0, 5).map((x: unknown) => String(x).slice(0, 24));
  const V = { doc: "Texte", docs: "Mes textes", ...(perso?.vocab ?? {}), types, tons };
  V.doc = String(V.doc).slice(0, 30); V.docs = String(V.docs).slice(0, 30);
  const tete = `const V = ${JSON.stringify(V)};\n`;
  const code = MODELES_CODE.ecriture;
  const ecrans = [
    { id: "tableau_bord", titre: "Tableau de bord", icone: "graphique", but: "Votre activité d'écriture et un accès direct à chaque type de texte." },
    { id: "creer", titre: "Créer", icone: "message", but: "Remplissez l'essentiel, l'IA écrit votre texte, vous l'ajustez en un clic." },
    { id: "documents", titre: V.docs.slice(0, 24), icone: "boite", but: "Tous vos textes, rangés, cherchables, à copier ou télécharger en PDF." },
    { id: "profil", titre: "Mon style", icone: "reglages", but: "Qui vous êtes et un exemple de votre écriture, pour que l'IA écrive avec votre voix." },
  ].map((e) => ({ ...e, code: tete + code[e.id], ok: true, modele: "ecriture" }));
  const collections = [
    { nom: "documents", label: V.docs.replace(/^mes\s+/i, ""), champs: [{ nom: "titre", type: "texte" }, { nom: "type", type: "choix", valeurs: types.map((t: any) => t.id) }, { nom: "contenu", type: "texte" }, { nom: "ton", type: "texte" }, { nom: "mots", type: "nombre" }, { nom: "favori", type: "booleen" }] },
    { nom: "profil", label: "Mon style", champs: [{ nom: "a_propos", type: "texte" }, { nom: "ton", type: "texte" }, { nom: "langue", type: "texte" }, { nom: "exemples", type: "texte" }] },
  ];
  const jour = (d: number) => { const x = new Date(); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
  const ex = (Array.isArray(perso?.exemples) ? perso.exemples : []).filter((x: any) => x?.contenu).slice(0, 8);
  const ages = [-1, -3, -6, -9, -15, -22, -30, -41, -50];
  const documents = ex.map((x: any, i: number) => { const c = String(x.contenu).replace(/\\n/g, "\n").slice(0, 2500); return { titre: String(x.titre ?? "Texte").slice(0, 80), type: types.some((t: any) => t.id === x.type) ? x.type : types[i % types.length].id, entrees: x.entrees && typeof x.entrees === "object" ? x.entrees : {}, contenu: c, ton: tons[i % tons.length], mots: (c.trim().match(/\S+/g) ?? []).length, favori: i % 3 === 0, cree_le: jour(ages[i % ages.length]) }; });
  const profil = [{ a_propos: "", ton: tons[0], langue: "français", exemples: "" }];
  return { vocab: { doc: V.doc, docs: V.docs }, ecrans, collections, demo: { documents, profil }, demo_ancre: jour(0), agenda: null };
}

// Aiguillage : personnalisation (IA rapide) et spec de chaque modèle

export const PERSO_CRM = (p: any) => `Un CRM (suivi des prospects, des affaires et des relances) va être livré pour ce métier : « ${p.nom} » — ${p.pitch}. Pour : ${p.cible}.
Rendez un objet JSON :
- b2b : true si ce métier vend surtout à des entreprises, false s'il vend surtout à des particuliers
- societes : si b2b, 14 noms d'entreprises fictives françaises crédibles pour ses prospects ; sinon []
- affaires : 10 intitulés courts d'affaires typiques de ce métier (40 caractères max, ex. « Contrat de maintenance annuel »), chacun avec { titre, montant (euros HT, nombre réaliste) }
- sources : 4 sources de prospects réalistes pour ce métier (ex. « Site web », « Recommandation », « Salon », « LinkedIn »)`;

export function specCrm(perso: any) {
  const code = MODELES_CODE.crm;
  const ecrans = [
    { id: "tableau_bord", titre: "Tableau de bord", icone: "graphique", but: "Ce que vous avez gagné, ce qui est en cours, votre taux de réussite et vos tâches du jour." },
    { id: "pipeline", titre: "Pipeline", icone: "liste", but: "Vos affaires étape par étape, à faire glisser jusqu'à la signature." },
    { id: "contacts", titre: "Contacts", icone: "contacts", but: "Vos prospects et clients, leurs affaires, et un e-mail en un clic." },
    { id: "taches", titre: "Tâches", icone: "horloge", but: "Vos appels, relances et rendez-vous, en liste ou en calendrier." },
    { id: "pub_contact", titre: "Formulaire de contact", icone: "mail", but: "La page où vos futurs clients vous écrivent : chaque message devient un prospect.", public: true, lecture: [], ecriture: "contacts" },
  ].map((e) => ({ ...e, code: code[e.id], ok: true, modele: "crm" }));
  const collections = [
    { nom: "contacts", label: "Contacts", champs: [{ nom: "nom", type: "texte" }, { nom: "entreprise", type: "texte" }, { nom: "email", type: "email" }, { nom: "telephone", type: "telephone" }, { nom: "statut", type: "choix", valeurs: ["prospect", "client", "perdu"] }, { nom: "source", type: "texte" }, { nom: "derniere_action", type: "date" }, { nom: "notes", type: "texte" }] },
    { nom: "affaires", label: "Affaires", champs: [{ nom: "titre", type: "texte" }, { nom: "contact_id", type: "texte" }, { nom: "contact_nom", type: "texte" }, { nom: "montant", type: "montant" }, { nom: "etape", type: "choix", valeurs: ["nouveau", "qualifie", "proposition", "negociation", "gagne", "perdu"] }, { nom: "echeance", type: "date" }, { nom: "gagnee_le", type: "date" }, { nom: "notes", type: "texte" }] },
    { nom: "taches", label: "Tâches", champs: [{ nom: "titre", type: "texte" }, { nom: "type", type: "choix", valeurs: ["appel", "email", "rdv", "relance", "autre"] }, { nom: "contact_id", type: "texte" }, { nom: "contact_nom", type: "texte" }, { nom: "date", type: "date" }, { nom: "fait", type: "booleen" }, { nom: "fait_le", type: "date" }, { nom: "notes", type: "texte" }] },
  ];
  let graine = 23; const hasard = () => { graine = (graine * 9301 + 49297) % 233280; return graine / 233280; };
  const jour = (d: number) => { const x = new Date(); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
  const b2b = perso?.b2b !== false;
  const societes = Array.isArray(perso?.societes) ? perso.societes.map((x: any) => String(typeof x === "string" ? x : x?.nom ?? "")) : [];
  const sources = (Array.isArray(perso?.sources) && perso.sources.length ? perso.sources.map(String) : ["Site web", "Recommandation", "Salon", "LinkedIn"]).slice(0, 4);
  const modeles = (Array.isArray(perso?.affaires) && perso.affaires.length ? perso.affaires : [{ titre: "Accompagnement annuel", montant: 4800 }, { titre: "Mission de conseil", montant: 2500 }, { titre: "Formule découverte", montant: 900 }, { titre: "Contrat de maintenance", montant: 3600 }, { titre: "Projet sur mesure", montant: 7500 }])
    .map((x: any) => ({ titre: String(x?.titre ?? x ?? "").slice(0, 50), montant: Math.max(50, Math.round(Number(x?.montant) || 1500)) })).filter((x: any) => x.titre);
  const sans = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, ".");
  const contacts = PRENOMS.slice(0, 14).map((n, i) => ({ ref: `c${i + 1}`, nom: n, entreprise: b2b ? String(societes[i] ?? "").slice(0, 60) : "", email: sans(n) + "@exemple.fr", telephone: `06 ${String(31 + i).padStart(2, "0")} ${String(20 + i * 5).slice(-2)} 47 ${String(10 + i * 3).slice(-2)}`, statut: i < 5 ? "client" : i === 13 ? "perdu" : "prospect", source: sources[i % sources.length], derniere_action: jour(-Math.round(hasard() * 40)), notes: i === 0 ? "Très bon client, recommande souvent." : "" }));
  const affaires: any[] = [];
  // Affaires gagnées sur 6 mois (pour le graphique), puis affaires en cours à chaque étape, et quelques pertes
  for (let i = 0; i < 9; i++) { const c = contacts[i % 5], md = modeles[i % modeles.length], g = jour(-Math.round(5 + (i / 9) * 165 + hasard() * 10)); affaires.push({ titre: md.titre, contact_id: c.ref, contact_nom: c.nom, montant: Math.round(md.montant * (0.8 + hasard() * 0.5)), etape: "gagne", gagnee_le: g, echeance: g, notes: "" }); }
  affaires.push({ ...affaires[0], gagnee_le: jour(-2), echeance: jour(-2), titre: modeles[1 % modeles.length].titre, montant: modeles[1 % modeles.length].montant });
  const enCours = ["nouveau", "nouveau", "qualifie", "qualifie", "qualifie", "proposition", "proposition", "negociation", "negociation"];
  enCours.forEach((e, i) => { const c = contacts[5 + (i % 8)], md = modeles[(i + 3) % modeles.length]; affaires.push({ titre: md.titre, contact_id: c.ref, contact_nom: c.nom, montant: Math.round(md.montant * (0.8 + hasard() * 0.5)), etape: e, echeance: jour(i === 7 ? -3 : 7 + Math.round(hasard() * 50)), notes: "" }); });
  [12, 13].forEach((k, i) => { const c = contacts[k], md = modeles[(i + 5) % modeles.length]; affaires.push({ titre: md.titre, contact_id: c.ref, contact_nom: c.nom, montant: md.montant, etape: "perdu", echeance: jour(-20 - i * 30), notes: "Parti chez un concurrent moins cher." }); });
  const T = [["Rappeler pour la proposition", "appel", 0], ["Envoyer la plaquette", "email", 0], ["Relancer après le devis", "relance", -3], ["Préparer le rendez-vous", "rdv", 2], ["Point mensuel", "appel", 5], ["Relance sans réponse", "relance", -6], ["Démonstration", "rdv", 9], ["Confirmer la date de signature", "appel", 1]];
  const taches: any[] = T.map(([titre, type, d], i) => { const c = contacts[5 + i % 8]; return { titre: `${titre} — ${c.nom.split(" ")[0]}`, type, contact_id: c.ref, contact_nom: c.nom, date: jour(d as number), fait: false, notes: "" }; });
  for (let i = 0; i < 10; i++) { const c = contacts[i % 14], d = -Math.round(2 + hasard() * 50); taches.push({ titre: `${["Appel de découverte", "Envoi du devis", "Relance", "Rendez-vous"][i % 4]} — ${c.nom.split(" ")[0]}`, type: ["appel", "email", "relance", "rdv"][i % 4], contact_id: c.ref, contact_nom: c.nom, date: jour(d), fait: true, fait_le: jour(d), notes: "" }); }
  return { vocab: {}, ecrans, collections, demo: { contacts, affaires, taches }, demo_ancre: jour(0), agenda: { collection: "taches", champ_date: "date", champ_heure: null, duree: 30, champs_titre: ["titre"] } };
}

export const PERSO: Record<string, (p: any) => string> = { reservation: PERSO_RESERVATION, devis: PERSO_DEVIS, ecriture: PERSO_ECRITURE, crm: PERSO_CRM };
export const SPEC: Record<string, (perso: any) => any> = { reservation: specReservation, devis: specDevis, ecriture: specEcriture, crm: specCrm };
