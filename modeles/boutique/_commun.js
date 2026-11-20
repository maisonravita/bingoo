const ETAPES_C = { nouvelle: ["Nouvelle", "bleu"], preparation: ["En préparation", "orange"], expediee: ["Expédiée", "violet"], livree: ["Livrée", "vert"], annulee: ["Annulée", "rouge"] };
const SUIVANTE = { nouvelle: ["preparation", "Préparer"], preparation: ["expediee", "Expédier"], expediee: ["livree", "Marquer livrée"] };
const lignesDe = (c) => { let l = c?.lignes; if (typeof l === "string") { try { l = JSON.parse(l); } catch (_) { l = null; } } return Array.isArray(l) ? l : []; };
const nbArticles = (c) => lignesDe(c).reduce((a, l) => a + (Number(l.quantite) || 1), 0);
const vendu = (c) => c.statut !== "annulee";
const MAILS_C = { preparation: ["Votre commande est en préparation", "Bonne nouvelle : nous préparons votre commande {n} avec soin."], expediee: ["Votre commande est en route", "Votre commande {n} vient de partir. Elle arrive très bientôt."], livree: ["Votre commande est livrée", "Votre commande {n} est livrée. Merci pour votre confiance, à bientôt !"] };
