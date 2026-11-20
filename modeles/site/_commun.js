// --- Site web : éléments partagés par l'espace gérant ---
const STATUTS_D = { nouvelle: ["Nouvelle", "orange"], en_cours: ["En cours", "bleu"], traitee: ["Traitée", "vert"] };
const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const prixDe = (s) => s.prix == null || s.prix === "" || !(Number(s.prix) > 0) ? "Sur devis" : (s.prix_texte ? "À partir de " : "") + fmt.eur(s.prix);
const telLien = (t) => "tel:" + String(t || "").replace(/[^\d+]/g, "");
const dateCourte = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "";
const MOT_DEMANDE = { rdv: "Date souhaitée", reservation: "Date souhaitée", devis: "", message: "" };
