// La cadence d'un prospect contacté : « touche 2/5 », et la prochaine étape de la séquence.
// Reflète exactement la logique serveur (followups dans agents.ts) : séquence personnalisée de l'espace,
// sinon relances aux délais réglés + appel 3 jours après la dernière + e-mail de clôture 7 jours après.
const CANAL = { email: "e-mail", linkedin: "LinkedIn", appel: "appel" };

export function etapesDe(ws) {
  const perso = (ws?.sequence?.etapes ?? []).filter((x) => x && ["email", "linkedin", "appel"].includes(x.canal) && Number.isInteger(x.apres));
  if (perso.length) return perso.slice(0, 6);
  const d = ws?.followup_days?.length === 2 ? ws.followup_days : [3, 7];
  return [
    ...d.map((apres) => ({ apres, canal: "email" })),
    { apres: d[d.length - 1] + 3, canal: "appel" },
    { apres: d[d.length - 1] + 7, canal: "email" },
  ];
}

/** { touche, total, prochaine } pour un prospect au statut « envoyé » ; null sinon. */
export function cadence(ws, p) {
  if (p?.status !== "envoye") return null;
  const et = etapesDe(ws);
  const total = et.length + 1; // la touche 1 est le premier e-mail
  const k = Math.max(0, Math.min(Number.isInteger(p.seq_etape) ? p.seq_etape : 0, et.length));
  const next = et[k];
  return { touche: Math.min(k + 1, total), total, prochaine: next ? `${CANAL[next.canal]} à J+${next.apres}` : "séquence terminée, 2e interlocuteur recherché" };
}
