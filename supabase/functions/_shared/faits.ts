// Contrôle des faits avant envoi : chaque affirmation du message sur le prospect ou sur le client doit venir d'une source
// réelle (fiche, signaux, site, offre, preuves, fiche « ce que Bingoo! peut répondre »). Ce qui n'a pas de source est
// signalé au client à la validation, et le message ne part jamais seul en pilote automatique.
import { askJson, type Prospect, type Workspace } from "./core.ts";

export async function verifierFaits(ws: Workspace, p: Prospect, subject: string, body: string): Promise<string> {
  const prof = (ws.profile ?? {}) as Record<string, unknown>;
  const sources = [
    `Prospect : ${p.name}${p.org ? ` (${p.org})` : ""}, activité « ${p.activity ?? ""} », ville ${p.city ?? ""}`,
    p.contact_name ? `Interlocuteur : ${p.contact_name}${p.contact_role ? `, ${p.contact_role}` : ""}` : "Interlocuteur : inconnu",
    ...((p.signals ?? []) as { label?: string }[]).filter((x) => x.label).slice(0, 10).map((x) => `Fait public : ${x.label}`),
    (p.insight as { resume?: string; reseaux?: { accroche?: string } } | null)?.resume ? `Enquête : ${(p.insight as { resume: string }).resume}` : "",
    (p.insight as { reseaux?: { accroche?: string } } | null)?.reseaux?.accroche ? `Actualité réelle : ${(p.insight as { reseaux: { accroche: string } }).reseaux.accroche}` : "",
    `Offre de l'expéditeur : ${String(prof.offre ?? "")}`,
    prof.differenciation ? `Différence revendiquée : ${String(prof.differenciation)}` : "",
    Array.isArray(prof.preuves) && prof.preuves.length ? `Preuves de l'expéditeur : ${(prof.preuves as string[]).join(" ; ")}` : "",
    ws.knowledge ? `Fiche de l'expéditeur : ${String(ws.knowledge).slice(0, 2500)}` : "",
  ].filter(Boolean).join("\n");
  try {
    const r = await askJson<{ doutes: string[] }>(`Tu relis un e-mail de prospection avant envoi. Liste les affirmations FACTUELLES de l'e-mail qui ne sont PAS soutenues par les sources ci-dessous : chiffres, dates, noms de clients, résultats promis, faits sur le prospect (recrutement, levée, déménagement, projet, outil utilisé…), certifications.
Ne signale pas : les formules de politesse, les questions, les propositions (« seriez-vous disponible »), les généralités prudentes (« beaucoup d'entreprises comme la vôtre »), la description de ce que l'offre de l'expéditeur sait faire, ni les déductions évidentes de l'activité du prospect.
Signale en priorité : ce qui est présenté comme un fait propre à CE prospect sans source (sa situation, ses difficultés, ses équipes, ses projets, ses outils).

SOURCES
${sources}

E-MAIL
Objet : ${subject}
${body}

Réponds en JSON : {"doutes": ["citation courte de l'affirmation non soutenue — pourquoi"]}. Liste vide si tout est soutenu. Trois éléments au plus.`, { fast: true, maxTokens: 400 });
    return (r.doutes ?? []).map((x) => String(x).trim()).filter(Boolean).slice(0, 3).join("\n").slice(0, 600);
  } catch { return ""; }
}
