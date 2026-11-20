const ETAPES_R = [["nouveau", "Nouveaux"], ["preselection", "Présélection"], ["entretien", "Entretien"], ["offre", "Offre"], ["embauche", "Embauché"], ["refuse", "Refusé"]];
const TON_R = { nouveau: "bleu", preselection: "violet", entretien: "orange", offre: "orange", embauche: "vert", refuse: "rouge" };
const libEtape = (e) => (ETAPES_R.find((x) => x[0] === e) ?? [e, e])[1];
const Etoiles = ({ n, onChange }) => html`<span class="inline-flex">${[1, 2, 3, 4, 5].map((k) => html`<button type="button" aria-label=${k + " sur 5"} onClick=${(e) => { e.stopPropagation(); onChange?.(k); }} class=${"text-base leading-none " + (k <= (Number(n) || 0) ? "text-amber-400" : "text-slate-200")}>★</button>`)}</span>`;
const MAILS_R = {
  entretien: (c) => ["Entretien pour le poste « " + c.offre_titre + " »", "Bonjour " + String(c.nom).split(" ")[0] + ",\n\nVotre candidature a retenu toute notre attention. Nous aimerions vous rencontrer pour un entretien" + (c.entretien_le ? " le " + fmt.date(c.entretien_le) : "") + ".\n\nPouvez-vous nous confirmer votre disponibilité ?\n\nÀ bientôt !"],
  refuse: (c) => ["Votre candidature « " + c.offre_titre + " »", "Bonjour " + String(c.nom).split(" ")[0] + ",\n\nMerci pour l'intérêt que vous portez à notre équipe. Après étude attentive, nous ne donnerons pas suite à votre candidature pour ce poste.\n\nNous vous souhaitons pleine réussite dans vos recherches."],
  offre: (c) => ["Proposition pour le poste « " + c.offre_titre + " »", "Bonjour " + String(c.nom).split(" ")[0] + ",\n\nNous avons le plaisir de vous proposer de nous rejoindre au poste de " + c.offre_titre + ".\n\nNous revenons vers vous très vite avec tous les détails."],
};
