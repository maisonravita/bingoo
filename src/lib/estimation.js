// Estimation du plan d'action (inscription) : ce que la prospection Bingoo! peut rapporter, à partir des réponses du client.
// Toujours une fourchette (prudente / probable), avec les hypothèses affichées : jamais une promesse inventée.
// Taux de prospection B2B ciblée sur un signal : prudents par défaut, remplacés par les vrais taux dès les premiers envois (Résultats).

export const TYPES = [
  ["saas", "Un SaaS ou un logiciel", "💻"],
  ["app", "Une application", "📱"],
  ["startup", "Une startup", "🚀"],
  ["pme", "Une PME", "🏢"],
  ["tpe", "Une TPE ou je suis indépendant", "🧑‍💼"],
  ["agence", "Une agence ou un cabinet", "🤝"],
];
export const STADES = [
  ["explore", "Je me renseigne", "🔭"],
  ["lance", "Je lance mon produit", "🛠️"],
  ["peu", "J'ai un produit, mais peu de clients", "🌱"],
  ["vend", "Je vends déjà, je veux accélérer", "📈"],
];
export const CANAUX = [
  ["bouche", "Bouche-à-oreille", "🗣️"], ["linkedin", "LinkedIn", "💼"], ["email", "E-mails de prospection", "✉️"],
  ["appels", "Appels", "📞"], ["reseaux", "Réseaux sociaux, contenu", "📣"], ["pub", "Publicité", "🎯"], ["rien", "Rien de régulier pour l'instant", "🤷"],
];
export const DELAIS = [["1", "D'ici 1 mois"], ["3", "D'ici 3 mois"], ["6", "D'ici 6 mois"], ["12", "D'ici un an"]];

/** Abonnement mensuel (SaaS, application) ou valeur d'un client sur un an (le reste). */
export const mensuel = (type) => type === "saas" || type === "app";
export const VALEURS = {
  mois: [[30, "Moins de 50 € par mois"], [120, "50 à 200 € par mois"], [500, "200 à 1 000 € par mois"], [2000, "Plus de 1 000 € par mois"]],
  an: [[800, "Moins de 2 000 €"], [5000, "2 000 à 10 000 €"], [20000, "10 000 à 50 000 €"], [80000, "Plus de 50 000 €"]],
};

// Volumes à plein régime (après environ 3 semaines de montée progressive, pour protéger la boîte mail et le compte LinkedIn)
export const VOLUME = { emails: 15, linkedin: 10, jours: 21 };

/** Fourchette de nouveaux clients et de revenu, sur l'horizon choisi. */
export function estimer({ type, valeur, horizon }) {
  const h = Number(horizon) || 3;
  const v = Number(valeur) || 0;
  const annuel = mensuel(type) ? v * 12 : v;
  // Plus le ticket est gros, plus la décision est longue : taux de signature plus bas
  const sig = annuel < 2500 ? [0.25, 0.35] : annuel < 15000 ? [0.15, 0.25] : [0.1, 0.2];
  const mails = VOLUME.emails * VOLUME.jours, invit = VOLUME.linkedin * VOLUME.jours;
  const H = [
    { rep: 0.02, acc: 0.25, liRep: 0.1, rdv: 0.4, sig: sig[0] },
    { rep: 0.04, acc: 0.35, liRep: 0.15, rdv: 0.5, sig: sig[1] },
  ];
  const calc = (x) => {
    const reponses = mails * x.rep + invit * x.acc * x.liRep;
    const rdv = reponses * x.rdv;
    const clients = rdv * x.sig;
    return { reponses, rdv, clients };
  };
  const [lo, hi] = H.map(calc);
  // Le premier mois tourne à moitié régime (montée progressive)
  const mois = Math.max(0.5, h - 0.5);
  const cl = [lo.clients * mois, hi.clients * mois];
  const revenu = mensuel(type) ? cl.map((c) => c * v) : cl.map((c) => c * v);
  return {
    parMois: { reponses: [lo.reponses, hi.reponses], rdv: [lo.rdv, hi.rdv], clients: [lo.clients, hi.clients] },
    clients: cl, revenu, recurrent: mensuel(type), horizon: h,
    hypotheses: [
      `${VOLUME.emails} e-mails et ${VOLUME.linkedin} invitations LinkedIn par jour ouvré, à plein régime (montée progressive le premier mois)`,
      `Réponses aux e-mails : ${H[0].rep * 100} à ${H[1].rep * 100} % (messages écrits à partir d'un fait récent)`,
      `LinkedIn : ${H[0].acc * 100} à ${H[1].acc * 100} % d'invitations acceptées, puis ${H[0].liRep * 100} à ${H[1].liRep * 100} % de réponses`,
      `Une réponse sur ${Math.round(1 / H[1].rdv)} à ${Math.round(1 / H[0].rdv * 10) / 10} devient un rendez-vous`,
      `${sig[0] * 100} à ${sig[1] * 100} % des rendez-vous signent (selon la valeur d'un client)`,
      "Non comptés : les demandes publiques auxquelles tu réponds, et les appels après relance",
    ],
  };
}

/** Pour atteindre l'objectif : combien de contacts par jour faudrait-il (hypothèse probable) ? */
export function pourObjectif(objectif, e) {
  const parContact = e.parMois.clients[1] / ((VOLUME.emails + VOLUME.linkedin) * VOLUME.jours);
  if (!parContact) return null;
  return Math.ceil(Number(objectif) / parContact / VOLUME.jours);
}

export const arrondi = (x) => (x < 1 ? Math.round(x * 10) / 10 : Math.round(x));
export const euros = (x) => `${Math.round(x / (x >= 10000 ? 1000 : x >= 1000 ? 100 : 10)) * (x >= 10000 ? 1000 : x >= 1000 ? 100 : 10)}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";
