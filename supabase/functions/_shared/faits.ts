// Contrôle des faits avant envoi : chaque affirmation du message sur le prospect ou sur le client doit venir d'une source
// réelle (fiche, signaux, site, offre, preuves, fiche « ce que Bingoo! peut répondre »). Ce qui n'a pas de source est
// signalé au client à la validation, et le message ne part jamais seul en pilote automatique.
import { askJson, type Prospect, type Workspace } from "./core.ts";
import { humanize } from "./playbooks.ts";

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
    const r = await askJson<{ doutes: ({ citation?: string; pourquoi?: string; certain?: boolean } | string)[] }>(`Tu relis un e-mail de prospection avant envoi. Liste les affirmations FACTUELLES de l'e-mail qui ne sont PAS soutenues par les sources ci-dessous : chiffres, dates, noms de clients, résultats promis, faits sur le prospect (recrutement, levée, déménagement, projet, outil utilisé…), certifications.
Ne juge QUE les phrases qui disent quelque chose sur le prospect (son entreprise, sa situation, ses équipes, ses projets, ses outils, ses difficultés, ses besoins).
Ignore entièrement : les phrases qui décrivent l'expéditeur ou ce que fait son offre, les généralités prudentes sur ce type d'événement (« une entreprise qui recrute a souvent… », « un nouveau dirigeant revoit en général… »), les formules de politesse, les questions, les propositions (« seriez-vous disponible »), les demandes de transmission, et les déductions évidentes de l'activité ou de la ville du prospect.

SOURCES
${sources}

E-MAIL
Objet : ${subject}
${body}

N'inclus un élément QUE si tu es certain qu'il affirme sur le prospect quelque chose que les sources ne disent pas. Si, en y réfléchissant, l'élément est soutenu, acceptable, une déduction évidente ou une généralité, ne l'inclus pas du tout.
Réponds en JSON : {"doutes": [{"citation": "citation courte", "pourquoi": "raison en une phrase", "certain": true}]}. Liste vide si tout est soutenu. Trois éléments au plus.`, { fast: true, maxTokens: 400 });
    // On ne garde que les doutes certains (le modèle signale parfois un point avant de conclure qu'il est acceptable)
    const garder = (x: unknown) => typeof x === "string" ? !/acceptable|pas vraiment un doute|donc soutenu|donc ignoré|aucun doute|pas un doute/i.test(x) : (x as { certain?: boolean }).certain !== false && !/acceptable|pas vraiment un doute|donc soutenu|donc ignoré|aucun doute|pas un doute/i.test(String((x as { pourquoi?: string }).pourquoi ?? ""));
    return (r.doutes ?? []).filter(garder).map((x) => typeof x === "string" ? x : `« ${String(x.citation ?? "").replace(/^«\s*|\s*»$/g, "")} » — ${x.pourquoi ?? ""}`).map((x) => x.trim()).filter((x) => x.length > 6).slice(0, 3).join("\n").slice(0, 600);
  } catch { return ""; }
}

/** Réécrit le message en retirant (ou en transformant en question) les affirmations sans source. Même ton, plus court. */
export async function corrigerFaits(_ws: Workspace, p: Prospect, subject: string, body: string, doutes: string) {
  const r = await askJson<{ objet: string; corps: string }>(`Corrige cet e-mail de prospection : retire chaque affirmation listée ci-dessous (ou transforme-la en question neutre), sans rien inventer d'autre, et sans rien supposer de nouveau sur le prospect. Garde le même ton, la même salutation, la même question finale si elle reste juste. 40 à 70 mots. Pas de tiret long.
Prospect : ${p.name}
Affirmations sans source :
${doutes}

Objet : ${subject}
${body}

JSON : {"objet": "", "corps": ""}`, { fast: true, maxTokens: 600 });
  const corps = humanize(String(r.corps ?? "").trim()), objet = humanize(String(r.objet ?? subject).trim()).slice(0, 140);
  return corps.length > 40 ? { subject: objet || subject, body: corps } : null;
}
