// Relecture finale d'un message, sans IA : ce qu'un client ne doit jamais voir partir.
// « bloquant » : le message ne part pas (gabarit oublié, mauvais nom, texte en anglais…).
// « defaut » : le message est réécrit une fois ; s'il reste un défaut, il n'est pas proposé.
// Les petites fautes de forme (espaces, ponctuation doublée, formule de politesse en double) sont corrigées en silence.
import type { Prospect } from "./core.ts";

export type Probleme = { gravite: "bloquant" | "defaut"; texte: string };

const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const SPAM = /\b(gratuit(e|ement)?|urgent|offre exceptionnelle|100 ?%|garanti(e)?|cliquez ici|derni[eè]re chance|meilleur prix|€€|!!)/i;

/** Corrections de forme sans risque. */
export function nettoyer(body: string, subject: string, signataire = "") {
  let b = body.replace(/[ \t]{2,}/g, " ").replace(/ +([,.])/g, "$1").replace(/([,.;:!?])\1+/g, "$1").replace(/\.\s*\?/g, " ?").replace(/\n{3,}/g, "\n\n").trim();
  // Formule de politesse ou signature écrite par la rédaction : la signature est ajoutée automatiquement
  b = b.replace(/\n+(?:cordialement|bien (?:à|a) vous|bien cordialement|belle journée|bonne journée|merci d'avance|merci par avance)[ ,.!]*(?:\n.{0,60})?$/i, "").trim();
  if (signataire) b = b.replace(new RegExp(`\\n+${signataire.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "").trim();
  const s = subject.replace(/\s+/g, " ").replace(/[.!]+$/, "").trim();
  return { body: b, subject: s };
}

export function controler(p: Pick<Prospect, "name" | "contact_name" | "email">, subject: string, body: string, rivaux: string[] = []): Probleme[] {
  const out: Probleme[] = [];
  const tout = `${subject}\n${body}`;
  // Gabarits oubliés ou valeurs vides
  const gab = tout.match(/\[[^\]\n]{1,40}\]|\{\{?[^}\n]{0,30}\}?\}|<[A-Za-zÀ-ÿ' ]{2,25}>|Madame\s*\/\s*Monsieur|Monsieur\s*\/\s*Madame|\bX{3,}\b|\bundefined\b|\bnull\b|\bNaN\b|\bTODO\b|lorem ipsum|\(nom\)|\(prénom\)|\(entreprise\)/i);
  if (gab) out.push({ gravite: "bloquant", texte: `élément de modèle laissé tel quel : « ${gab[0]} »` });
  // Texte en anglais (rédaction ratée)
  if (/^(hi|hello|dear)\b|\b(best regards|kind regards|thank you for|looking forward)\b/i.test(tout)) out.push({ gravite: "bloquant", texte: "passage en anglais" });
  // Salutation à un autre nom que celui de l'interlocuteur
  const sal = body.match(/^Bonjour\s+([^,\n]{2,40}),/);
  if (sal && !/^(à|a|madame|monsieur|mesdames|messieurs)\b/i.test(sal[1].trim()) || (sal && /^(madame|monsieur)\s+\S/i.test(sal[1].trim()))) {
    const nom = sansAccent(sal[1]).replace(/^(madame|monsieur|m\.|mme)\s+/, "").trim();
    const connu = sansAccent(String(p.contact_name ?? ""));
    if (!connu || !nom.split(/\s+/).every((x) => connu.includes(x))) out.push({ gravite: "bloquant", texte: `salutation à « ${sal[1]} », qui n'est pas l'interlocuteur connu` });
  }
  // Concurrent cité ou destinataire concurrent
  for (const r of rivaux) {
    const k = sansAccent(r).replace(/[^a-z0-9]/g, "");
    if (k.length >= 4 && sansAccent(`${p.name}${String(p.email ?? "").split("@")[1] ?? ""}`).replace(/[^a-z0-9]/g, "").includes(k)) { out.push({ gravite: "bloquant", texte: `${p.name} est un concurrent` }); break; }
  }
  // Longueur et forme d'un premier message de prospection
  const mots = body.split(/\s+/).filter(Boolean).length;
  if (mots > 85) out.push({ gravite: "defaut", texte: `trop long (${mots} mots, 75 au plus)` });
  if (mots < 20) out.push({ gravite: "defaut", texte: "trop court pour être compris" });
  if ((body.match(/https?:\/\/|www\./gi) ?? []).length > 1) out.push({ gravite: "defaut", texte: "plusieurs liens (les messageries s'en méfient)" });
  if (SPAM.test(tout)) out.push({ gravite: "defaut", texte: `mot qui fait classer en spam : « ${tout.match(SPAM)![0]} »` });
  if (subject.length > 60) out.push({ gravite: "defaut", texte: "objet trop long" });
  if (/\b[A-ZÀ-Ý]{5,}\b/.test(subject.replace(/\b(SAS|SARL|SASU|EURL|PME|TPE|RGPD|CRM|ERP|SEO|BTP|CSE|RSE|SIRH|URSSAF|QHSE)\b/g, ""))) out.push({ gravite: "defaut", texte: "majuscules dans l'objet" });
  if ((body.match(/\?/g) ?? []).length > 2) out.push({ gravite: "defaut", texte: "trop de questions" });
  const rep = body.match(/\b(?!(?:nous|vous)\b)(\w{3,})\s+\1\b/i);
  if (rep) out.push({ gravite: "defaut", texte: `mot répété : « ${rep[0]} »` });
  return out;
}

export const resume = (ps: Probleme[]) => ps.map((x) => x.texte).join(" ; ");
