export const REPLY_CLASSES = {
  interesse: { label: "Intéressé", tone: "good" }, question: { label: "Question", tone: "accent" }, prix: { label: "Demande de prix", tone: "accent" },
  rappel: { label: "Demande de rappel", tone: "accent" }, plus_tard: { label: "Plus tard", tone: "warn" }, objection: { label: "Objection", tone: "warn" },
  mauvais_contact: { label: "Mauvais interlocuteur", tone: "warn" }, pas_interesse: { label: "Pas intéressé", tone: "bad" },
  stop: { label: "Opposition", tone: "bad" }, absence: { label: "Absence", tone: "muted" }, autre: { label: "Autre", tone: "muted" },
};
export const MEETING = { confirme: "Confirmé", tenu: "Tenu", qualifie: "Qualifié", absent: "Absent", annule: "Annulé" };
export const QUOTE = { brouillon: { label: "Brouillon", tone: "muted" }, envoye: { label: "Envoyé", tone: "accent" }, vu: { label: "Consulté", tone: "warn" }, signe: { label: "Signé", tone: "good" }, refuse: { label: "Refusé", tone: "bad" } };
export const CALL = { pas_joignable: "Pas joignable", rappeler: "À rappeler", interesse: "Intéressé", rdv: "RDV pris", refus: "Pas intéressé", mauvais_numero: "Mauvais numéro" };
export const eur = (n) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const eur2 = (n) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Type d'entreprise : le Radar et les messages s'adaptent au métier. */
export const BIZ_TYPES = [
  ["saas", "Logiciel / SaaS", "Tu vends un logiciel, une application ou un abonnement en ligne"],
  ["services", "Services aux entreprises", "Conseil, agence, formation, prestations à distance"],
  ["terrain", "Services sur site", "Nettoyage, sécurité, BTP, maintenance, restauration…"],
  ["produits", "Produits", "Fabrication, négoce, distribution"],
];
