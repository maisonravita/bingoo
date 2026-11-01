export const cx = (...a) => a.filter(Boolean).join(" ");
export const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";
export const fmtTime = (d) => d ? new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
export const STATUS = {
  nouveau: { label: "À enquêter", tone: "muted" },
  sans_email: { label: "Sans e-mail", tone: "muted" },
  pret: { label: "E-mail trouvé", tone: "accent" },
  a_valider: { label: "À valider", tone: "warn" },
  envoye: { label: "Contacté", tone: "accent" },
  repondu: { label: "A répondu", tone: "good" },
  rdv: { label: "RDV", tone: "good" },
  client: { label: "Client", tone: "good" },
  refus: { label: "Pas intéressé", tone: "bad" },
  ignore: { label: "Écarté", tone: "muted" },
};
