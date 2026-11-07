import PushTel from "../components/PushTel";
import { useEffect, useState } from "react";
import { STORE_URL as STORE } from "../lib/ext";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Field, Input, PageHead, Textarea, useToast } from "../components/ui";
import { PRESETS, fmtN, parseZone, zoneLabel } from "../lib/zones";
import { cx } from "../lib/utils";
import { SubNav } from "../components/SubNav";
import BizType from "../components/BizType";
import Sequence from "../components/Sequence";

// Chaque section se replie : la page tient sur un écran, on ouvre seulement ce qu'on veut changer.
// Une section visée par un lien (#domaine, #fiche…) s'ouvre toute seule.
function Section({ id, title, sub, children, open: defaut = false }) {
  const vise = !!id && typeof window !== "undefined" && window.location.hash.includes(id);
  const [open, setOpen] = useState(defaut || vise);
  return (
    <Card id={id} className="scroll-mt-6 overflow-hidden">
      <button type="button" onClick={() => setOpen((x) => !x)} aria-expanded={open} className="w-full text-left p-5 sm:p-6 flex items-start gap-3 hover:bg-paper/50 transition">
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-2xl">{title}</span>
          {sub && <span className={cx("text-sm text-ink-soft mt-1", open ? "block" : "line-clamp-1")}>{sub}</span>}
        </span>
        <span className={cx("mt-2 text-ink-faint transition-transform", open && "rotate-90")} aria-hidden>›</span>
      </button>
      {open && <div className="px-5 sm:px-6 pb-5 sm:pb-6">{children}</div>}
    </Card>
  );
}

function CopyCell({ value }) {
  const toast = useToast();
  return (
    <button className="text-left font-mono text-xs break-all hover:bg-paper rounded px-1 -mx-1" title="Copier"
      onClick={async () => { try { await navigator.clipboard.writeText(value); toast("Copié"); } catch { /* copie impossible */ } }}>{value}</button>
  );
}

export default function Settings() {
  const { ws, patch } = useWs();
  const toast = useToast();
  const [f, setF] = useState(ws);
  const [busy, setBusy] = useState(null);
  const [domain, setDomain] = useState(ws.domain);
  const [zoneText, setZoneText] = useState("");
  useEffect(() => setF(ws), [ws]);
  // « #/reglages#domaine », « #/reglages#acces » : on descend jusqu'à la section demandée
  useEffect(() => { const id = window.location.hash.split("#")[2]; if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 300); }, []);

  const save = async (fields, label = "Enregistré") => {
    setBusy("save");
    try { await patch(fields); toast(label, "good"); } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const recount = async (fields) => {
    setBusy("count");
    try { await patch(fields); await fn("count", { workspace_id: ws.id }); await patch({}); toast("Cibles mises à jour", "good"); } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const setT = (id, k, v) => setF({ ...f, targets: f.targets.map((t) => t.id === id ? { ...t, [k]: v } : t) });
  const pr = f.profile ?? {};
  const setP = (k, v) => setF({ ...f, profile: { ...pr, [k]: v } });

  const addDomain = async () => {
    setBusy("domain");
    try { await fn("domain", { workspace_id: ws.id, domain }); await patch({}); toast("Domaine ajouté : ajoute les enregistrements ci-dessous chez ton hébergeur", "good"); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const check = async () => {
    setBusy("check");
    try { const r = await fn("domain-check", { workspace_id: ws.id }); await patch({}); toast(r.status === "verified" ? "Domaine vérifié, tu peux envoyer" : "Pas encore : la propagation DNS peut prendre jusqu'à 1 heure", r.status === "verified" ? "good" : "default"); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };

  const DAYS = [["1", "Lundi"], ["2", "Mardi"], ["3", "Mercredi"], ["4", "Jeudi"], ["5", "Vendredi"], ["6", "Samedi"], ["7", "Dimanche"]];
  const winText = (d) => (f.availability?.[d] ?? []).map(([a, b]) => `${a}-${b}`).join(", ");
  const setWin = (d, txt) => {
    const w = String(txt).split(/[,;]+/).map((x) => x.trim().match(/^(\d{1,2})[:h]?(\d{2})?\s*-\s*(\d{1,2})[:h]?(\d{2})?$/)).filter(Boolean)
      .map((m) => [`${m[1].padStart(2, "0")}:${m[2] ?? "00"}`, `${m[3].padStart(2, "0")}:${m[4] ?? "00"}`]);
    setF({ ...f, availability: { ...f.availability, [d]: w } });
  };
  const replyRec = async (kind) => {
    setBusy(kind);
    try {
      const r = await fn(kind, { workspace_id: ws.id }); await patch({});
      toast(kind === "reply-domain" ? "Ajoute les enregistrements ci-dessous" : r.status === "verified" ? "Suivi des réponses actif" : "Pas encore : la propagation DNS peut prendre jusqu'à 1 heure", r.status === "verified" ? "good" : "default");
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const setCat = (i, k, v) => setF({ ...f, catalog: f.catalog.map((c, j) => j === i ? { ...c, [k]: v } : c) });

  return (
    <div className="space-y-6 max-w-3xl">
      <SubNav section="reglages" />
      <PageHead title="Réglages" />

      <Section open title="Pilote automatique" sub="Choisis jusqu'où la machine agit seule.">
        <div className="grid sm:grid-cols-2 gap-3">
          {[["valider", "Je valide chaque envoi", "La machine trouve, enquête et rédige. Tu valides chaque message d'un geste."], ["auto", "Pilote automatique", "Chaque jour ouvré de 8 h à 18 h, la machine enquête, rédige et envoie seule, dans ta limite quotidienne. Les relances ne partent seules que si le suivi des réponses est actif."]].map(([k, t, d]) => (
            <button key={k} onClick={async () => { setBusy("save"); try { await fn("autonomy", { workspace_id: ws.id, mode: k }); await patch({}); toast(k === "auto" ? "Pilote automatique activé" : "Validation manuelle", "good"); } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); } }} className={cx("text-left rounded-2xl border p-4 transition", ws.autonomy === k ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-faint")}>
              <p className="font-semibold">{t}</p><p className={cx("text-sm mt-1", ws.autonomy === k ? "text-white/70" : "text-ink-soft")}>{d}</p>
            </button>
          ))}
        </div>
        {ws.autonomy === "auto" && ws.domain_status !== "verified" && <p className="text-sm text-warn mt-3">Le pilote ne pourra rien envoyer tant que ton domaine n'est pas vérifié.</p>}
      </Section>

      <Section title="Ton entreprise" sub="Ce que la machine sait de toi. Elle n'invente rien en dehors de ces informations.">
        <div className="grid gap-4">
          <Field label="Nom commercial"><Input value={pr.nom ?? ""} onChange={(e) => setP("nom", e.target.value)} /></Field>
          <Field label="En une phrase"><Input value={pr.resume ?? ""} onChange={(e) => setP("resume", e.target.value)} /></Field>
          <Field label="Ce que tu vends"><Textarea rows={3} value={pr.offre ?? ""} onChange={(e) => setP("offre", e.target.value)} /></Field>
          <Field label="Ce qui te distingue"><Textarea rows={2} value={pr.differenciation ?? ""} onChange={(e) => setP("differenciation", e.target.value)} /></Field>
          <Field label="Type d'entreprise" hint="Le Radar adapte ses signaux à ton métier (un logiciel ne se vend pas comme un service de nettoyage).">
            <BizType value={pr.type} onChange={(v) => setP("type", v)} publicValue={pr.vend_public} onPublic={(v) => setP("vend_public", v)} />
          </Field>
          <Field label="Preuves utilisables dans les messages" hint="Une par ligne : années d'expérience, références clients, certifications… Uniquement du vrai.">
            <Textarea rows={3} value={(pr.preuves ?? []).join("\n")} onChange={(e) => setP("preuves", e.target.value.split("\n"))} />
          </Field>
          <div><Button variant="primary" loading={busy === "save"} onClick={() => save({ profile: { ...pr, preuves: (pr.preuves ?? []).map((x) => x.trim()).filter(Boolean) } })}>Enregistrer</Button></div>
        </div>
      </Section>

      <Section id="style" title="Bingoo! écrit comme toi" sub="Chaque fois que tu corriges un message avant de l'envoyer, Bingoo! en tire des règles de style. Elles passent avant le ton par défaut. Corrige-les ou ajoute les tiennes, une par ligne.">
        {(pr.style ?? []).length === 0 && <p className="text-sm text-ink-soft mb-3">Rien d'appris pour l'instant : corrige 1 à 3 messages dans « À valider », Bingoo! remplira cette liste.</p>}
        <Textarea rows={5} value={(pr.style ?? []).join("\n")} onChange={(e) => setP("style", e.target.value.split("\n"))} placeholder={"Tutoie toujours\nSigne avec ton seul prénom\nPas plus de 4 phrases"} />
        <div className="mt-3"><Button variant="primary" loading={busy === "save"} onClick={() => save({ profile: { ...pr, style: (pr.style ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 8) } }, "Style enregistré")}>Enregistrer</Button></div>
      </Section>

      <Section id="exclusions" title="Ne jamais contacter" sub="Tes clients actuels, partenaires et concurrents. Avant chaque premier message, Bingoo! vérifie aussi qu'il n'est pas déjà en contact avec l'entreprise (autre interlocuteur, rendez-vous, refus).">
        <Textarea rows={5} value={Array.isArray(pr.exclusions) ? pr.exclusions.join("\n") : (pr.exclusions ?? "")} onChange={(e) => setP("exclusions", e.target.value.split("\n"))}
          placeholder={"Un par ligne : site, e-mail, SIREN ou nom\nacme.fr\n552100554\nDupont Conseil"} />
        <p className="text-xs text-ink-soft mt-2">Quand tu écartes une fiche avec « Déjà client », l'entreprise est ajoutée ici automatiquement.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium hover:border-ink-faint">
            Importer un fichier (CSV, Excel en CSV)
            <input type="file" accept=".csv,.txt" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const texte = await f.text();
              // Une valeur utile par ligne : e-mail → son domaine, site, SIREN, sinon le nom de l'entreprise (1re colonne)
              const vus = texte.split(/\r?\n/).slice(0, 5000).map((l) => {
                const cells = l.split(/[;,\t]/).map((c) => c.replace(/^"|"$/g, "").trim());
                const mail = cells.find((c) => /@[\w.-]+\.[a-z]{2,}$/i.test(c));
                if (mail) { const d = mail.split("@")[1].toLowerCase(); return /^(gmail|yahoo|hotmail|outlook|orange|free|sfr|wanadoo|icloud|live|laposte)\./.test(d) ? mail.toLowerCase() : d; }
                const site = cells.find((c) => /^(https?:\/\/)?(www\.)?[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(c) && c.includes("."));
                if (site) return site.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
                const siren = cells.map((c) => c.replace(/\s/g, "")).find((c) => /^\d{9}(\d{5})?$/.test(c));
                if (siren) return siren.slice(0, 9);
                return cells[0] ?? "";
              }).filter((x) => x.length >= 3 && !/^(nom|name|entreprise|société|societe|email|e-mail|site)$/i.test(x));
              const cur = Array.isArray(pr.exclusions) ? pr.exclusions : String(pr.exclusions ?? "").split("\n");
              const tout = [...new Set([...cur.map((x) => x.trim()).filter(Boolean), ...vus])].slice(0, 2000);
              setP("exclusions", tout);
              toast(`${tout.length - cur.filter((x) => x.trim()).length} entrées ajoutées : vérifie puis enregistre`, "good");
              e.target.value = "";
            }} />
          </label>
          {(ws.integrations?.hubspot?.ok || ws.integrations?.pipedrive?.ok) && <Button loading={busy === "crm-excl"} onClick={async () => {
            setBusy("crm-excl");
            try { const r = await fn("r/exclusions-crm", { workspace_id: ws.id }); await patch({}); setP("exclusions", r.liste); toast(`${r.ajoutes} clients importés depuis ton CRM`, "good"); }
            catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
          }}>Importer mes clients depuis {ws.integrations?.hubspot?.ok ? "HubSpot" : "Pipedrive"}</Button>}
        </div>
        <div className="mt-3"><Button variant="primary" loading={busy === "save"} onClick={() => save({ profile: { ...pr, exclusions: (Array.isArray(pr.exclusions) ? pr.exclusions : String(pr.exclusions ?? "").split("\n")).map((x) => x.trim()).filter((x) => x.length >= 3).slice(0, 2000) } }, "Liste enregistrée")}>Enregistrer</Button></div>
      </Section>

      <Section id="avance" title="Outils avancés" sub="Par défaut, Bingoo! ne montre que ce qui mène à un rendez-vous. Active les outils avancés pour voir aussi le trafic et la conversion de ton site, les réseaux sociaux, le studio vidéo, l'équipe IA en conversation et l'analyse de ce que disent tes prospects.">
        <label className="flex items-center gap-3 text-sm font-medium cursor-pointer">
          <input type="checkbox" checked={pr.avance === true} onChange={(e) => save({ profile: { ...pr, avance: e.target.checked } }, e.target.checked ? "Outils avancés affichés" : "Mode simple")} />
          Afficher les outils avancés
        </label>
      </Section>

      <Section id="fiche" title="Ce que Kairo peut répondre" sub="Les infos que tes prospects demandent : intégrations, délais, prix publics, sécurité, garanties, références. Kairo s'en sert dans les e-mails, les réponses et les comptes rendus, et n'invente rien d'autre.">
        <Textarea rows={10} value={f.knowledge ?? ""} onChange={(e) => setF({ ...f, knowledge: e.target.value })}
          placeholder={"OFFRE ET PRIX\nAbonnement Pro : 109 € HT / mois, sans engagement\n\nMISE EN PLACE\nPremiers e-mails envoyés en 48 h\n\nINTÉGRATIONS\nHubSpot, Pipedrive, Google Agenda, Outlook\n\nSÉCURITÉ ET RGPD\nDonnées hébergées en Europe…"} />
        {/\[à compléter/i.test(f.knowledge ?? "") && <p className="text-xs text-warn mt-2">Remplace les [à compléter] avant d'enregistrer : Kairo ne les utilisera pas tant qu'ils restent vides.</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button variant="primary" loading={busy === "save"} onClick={() => save({ knowledge: (f.knowledge ?? "").slice(0, 8000) }, "Fiche enregistrée")}>Enregistrer</Button>
          <Button quota="intelligence" loading={busy === "draft"} onClick={async () => {
            setBusy("draft");
            try { const r = await fn("i/knowledge-draft", { workspace_id: ws.id }); setF((x) => ({ ...x, knowledge: x.knowledge ? `${x.knowledge}\n\n${r.draft}` : r.draft })); toast("Brouillon préparé : complète les [à compléter], puis enregistre"); }
            catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
          }}>Préparer avec l'IA</Button>
        </div>
      </Section>

      <Section title="Zone et cibles" sub={`Zone actuelle : ${zoneLabel(ws.zone)}`}>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} disabled={!!busy} onClick={() => recount({ zone: p.zone })} className={cx("rounded-full px-3.5 py-1.5 text-sm font-medium border", zoneLabel(ws.zone) === p.label ? "bg-ink text-white border-ink" : "bg-white border-line")}>{p.label}</button>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); const z = parseZone(zoneText); if (z.length) recount({ zone: z }); }}>
            <Input placeholder="Départements : 33, 40…" value={zoneText} onChange={(e) => setZoneText(e.target.value)} className="py-1.5 text-sm !w-48" />
          </form>
        </div>
        <div className="mt-5 space-y-3">
          {f.targets.map((t) => (
            <details key={t.id} className="rounded-2xl border border-line p-4">
              <summary className="cursor-pointer flex items-center gap-3">
                <input type="checkbox" checked={t.actif !== false} onChange={(e) => setT(t.id, "actif", e.target.checked)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 accent-[#15161A]" />
                <span className="font-semibold flex-1">{t.label}</span>
                <span className="text-sm text-ink-soft tnum">{fmtN(t.total)}</span>
                {t.next_page === null && <Badge tone="good">Tout parcouru</Badge>}
              </summary>
              <div className="grid gap-3 mt-4">
                <Field label="Nom"><Input value={t.label} onChange={(e) => setT(t.id, "label", e.target.value)} /></Field>
                <Field label="Codes d'activité NAF" hint="Séparés par des virgules, ex. 87.10A, 87.30A"><Input value={(t.naf ?? []).join(", ")} onChange={(e) => setT(t.id, "naf", e.target.value.toUpperCase().split(/[\s,;]+/).filter((x) => /^\d{2}\.\d{2}[A-Z]$/.test(x)))} /></Field>
                <Field label="À qui écrire"><Input value={t.interlocuteur ?? ""} onChange={(e) => setT(t.id, "interlocuteur", e.target.value)} /></Field>
                <Field label="Bénéficiaires (dans le message)"><Input value={t.pour_qui ?? ""} onChange={(e) => setT(t.id, "pour_qui", e.target.value)} /></Field>
                <Field label="Argument principal"><Textarea rows={2} value={t.angle ?? ""} onChange={(e) => setT(t.id, "angle", e.target.value)} /></Field>
              </div>
            </details>
          ))}
        </div>
        <Button className="mt-4" variant="primary" loading={busy === "count"} onClick={() => recount({ targets: f.targets.map((t) => ({ ...t, next_page: t.next_page === null ? null : t.next_page ?? 1 })) })}>Enregistrer et recompter</Button>
      </Section>

      <Section title="Expéditeur" sub="Qui signe les messages, et combien en envoyer par jour.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom et nom"><Input value={f.sender_name} onChange={(e) => setF({ ...f, sender_name: e.target.value })} /></Field>
          <Field label="Adresse d'expédition" hint={ws.domain ? `Doit se terminer par @${ws.domain}` : "Sur ton propre domaine"}><Input type="email" value={f.sender_email} onChange={(e) => setF({ ...f, sender_email: e.target.value.trim() })} placeholder={ws.domain ? `prenom@${ws.domain}` : "prenom@monentreprise.fr"} /></Field>
          <Field label="Signature" className="sm:col-span-2"><Textarea rows={4} value={f.signature} onChange={(e) => setF({ ...f, signature: e.target.value })} placeholder={`${f.sender_name || "Prénom Nom"}\nFonction · ${pr.nom || "Entreprise"}\n06 00 00 00 00`} /></Field>
          <Field label="Adresse postale de l'entreprise" className="sm:col-span-2" hint="Obligatoire en bas des e-mails de prospection."><Input value={f.postal_address} onChange={(e) => setF({ ...f, postal_address: e.target.value })} /></Field>
          <Field label="Envois maximum par jour" hint="Commence à 20 et augmente de 10 par semaine : c'est ce qui protège ton domaine du spam.">
            <Input type="number" min={1} max={200} value={f.daily_limit} onChange={(e) => setF({ ...f, daily_limit: Number(e.target.value) || 1 })} />
          </Field>
        </div>
        <Button className="mt-5" variant="primary" loading={busy === "save"} onClick={() => save({ sender_name: f.sender_name, sender_email: f.sender_email, signature: f.signature, postal_address: f.postal_address, daily_limit: Math.min(200, Math.max(1, f.daily_limit)) })}>Enregistrer</Button>
      </Section>

      <Section id="sequence" title="Ta séquence" sub="Ce qui se passe après le premier e-mail : relances, LinkedIn, appel. Une réponse du prospect arrête tout.">
        <Sequence />
      </Section>

      <Section id="domaine" title="Domaine d'envoi" sub="Les messages partent de ton propre domaine, authentifié : ils arrivent en boîte de réception, et les réponses arrivent directement dans ta messagerie.">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="monentreprise.fr" className="!w-64" />
          <Button variant="primary" loading={busy === "domain"} onClick={addDomain}>{ws.domain ? "Changer" : "Ajouter"}</Button>
          {ws.domain_status && <Badge tone={ws.domain_status === "verified" ? "good" : ws.domain_status === "failed" ? "bad" : "warn"}>{ws.domain_status === "verified" ? "Vérifié" : ws.domain_status === "failed" ? "Échec" : "En attente"}</Badge>}
        </div>
        {ws.domain_records?.length > 0 && ws.domain_status !== "verified" && (
          <div className="mt-5">
            <p className="text-sm">Ajoute ces enregistrements dans la zone DNS de <b>{ws.domain}</b> (chez OVH, Gandi, GoDaddy, Ionos…). Clique sur une valeur pour la copier.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-ink-soft text-xs"><th className="py-2 pr-3">Type</th><th className="pr-3">Nom</th><th className="pr-3">Valeur</th><th>État</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {ws.domain_records.map((r, i) => (
                    <tr key={i} className="align-top">
                      <td className="py-2 pr-3 font-semibold">{r.type}{r.priority != null ? ` (${r.priority})` : ""}</td>
                      <td className="py-2 pr-3"><CopyCell value={r.name} /></td>
                      <td className="py-2 pr-3"><CopyCell value={r.value} /></td>
                      <td className="py-2"><Badge tone={r.status === "verified" ? "good" : "muted"}>{r.status === "verified" ? "OK" : "—"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="mt-4" variant="accent" loading={busy === "check"} onClick={check}>Vérifier maintenant</Button>
          </div>
        )}
      </Section>

      <Section title="Suivi des réponses" sub="Les réponses de tes prospects arrivent dans Kairo (et une copie dans ta boîte), sont triées par l'IA, et arrêtent les relances. Ça utilise un sous-domaine dédié : ta messagerie actuelle n'est pas touchée.">
        {ws.domain_status !== "verified" ? <p className="text-sm text-ink-soft">Vérifie d'abord ton domaine d'envoi.</p> : !ws.reply_domain ? (
          <Button variant="primary" loading={busy === "reply-domain"} onClick={() => replyRec("reply-domain")}>Activer le suivi des réponses</Button>
        ) : (
          <>
            <p className="text-sm flex items-center gap-2">Adresse de réponse : <b>…@{ws.reply_domain}</b> <Badge tone={ws.reply_status === "verified" ? "good" : "warn"}>{ws.reply_status === "verified" ? "Actif" : "En attente"}</Badge></p>
            {ws.reply_status !== "verified" && (
              <div className="mt-4">
                <p className="text-sm">Ajoute ces enregistrements dans la zone DNS de <b>{ws.domain}</b> :</p>
                <div className="mt-2 overflow-x-auto"><table className="w-full text-sm"><tbody className="divide-y divide-line">
                  {ws.reply_records.map((r, i) => <tr key={i} className="align-top"><td className="py-2 pr-3 font-semibold">{r.type}{r.priority != null ? ` (${r.priority})` : ""}</td><td className="py-2 pr-3"><CopyCell value={r.name} /></td><td className="py-2 pr-3"><CopyCell value={r.value} /></td><td><Badge tone={r.status === "verified" ? "good" : "muted"}>{r.status === "verified" ? "OK" : "—"}</Badge></td></tr>)}
                </tbody></table></div>
                <Button className="mt-3" variant="accent" loading={busy === "reply-domain-check"} onClick={() => replyRec("reply-domain-check")}>Vérifier</Button>
              </div>
            )}
          </>
        )}
      </Section>

      <Section title="Notifications sur le téléphone" sub="Les réponses chaudes arrivent en quelques secondes, avec la réponse déjà prête. À activer sur chaque téléphone ou ordinateur.">
        <PushTel />
      </Section>

      <Section title="Rendez-vous" sub="Ta page de réservation propose ces créneaux, sans jamais en proposer un déjà pris.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Durée (minutes)"><Input type="number" value={f.meeting_minutes} onChange={(e) => setF({ ...f, meeting_minutes: Number(e.target.value) || 30 })} /></Field>
          <Field label="Lieu"><Input value={f.meeting_location} onChange={(e) => setF({ ...f, meeting_location: e.target.value })} /></Field>
        </div>
        <p className="text-[13px] font-semibold mt-5 mb-2">Disponibilités <span className="font-normal text-ink-soft">(ex. 9:00-12:00, 14:00-18:00 · vide = indisponible)</span></p>
        <div className="space-y-2">
          {DAYS.map(([d, l]) => <div key={d} className="grid grid-cols-[90px_1fr] items-center gap-3"><span className="text-sm">{l}</span><Input defaultValue={winText(d)} onBlur={(e) => setWin(d, e.target.value)} className="py-2 text-sm" /></div>)}
        </div>
        <Button className="mt-4" variant="primary" loading={busy === "save"} onClick={() => save({ meeting_minutes: Math.min(180, Math.max(10, f.meeting_minutes)), meeting_location: f.meeting_location, availability: f.availability })}>Enregistrer</Button>
      </Section>

      <Section title="Devis" sub="Tes prestations habituelles et les mentions légales qui apparaissent sur les devis.">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Raison sociale"><Input value={f.legal_name} onChange={(e) => setF({ ...f, legal_name: e.target.value })} /></Field>
          <Field label="SIRET"><Input value={f.siret} onChange={(e) => setF({ ...f, siret: e.target.value })} /></Field>
          <Field label="TVA par défaut (%)"><Input type="number" value={f.vat_rate} onChange={(e) => setF({ ...f, vat_rate: Number(e.target.value) })} /></Field>
        </div>
        <p className="text-[13px] font-semibold mt-5 mb-2">Catalogue</p>
        <div className="space-y-2">
          {(f.catalog ?? []).map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_100px_28px] gap-2">
              <Input value={c.label} onChange={(e) => setCat(i, "label", e.target.value)} placeholder="Prestation" className="py-2 text-sm" />
              <Input value={c.unit} onChange={(e) => setCat(i, "unit", e.target.value)} placeholder="unité" className="py-2 text-sm" />
              <Input type="number" value={c.price} onChange={(e) => setCat(i, "price", Number(e.target.value))} placeholder="Prix HT" className="py-2 text-sm" />
              <button className="text-ink-faint hover:text-bad" onClick={() => setF({ ...f, catalog: f.catalog.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="ghost" onClick={() => setF({ ...f, catalog: [...(f.catalog ?? []), { label: "", unit: "", price: 0 }] })}>+ Prestation</Button>
          <Button size="sm" variant="primary" loading={busy === "save"} onClick={() => save({ legal_name: f.legal_name, siret: f.siret, vat_rate: f.vat_rate, catalog: (f.catalog ?? []).filter((c) => c.label.trim()) })}>Enregistrer</Button>
        </div>
      </Section>

      <ExternalAccess ws={ws} />
    </div>
  );
}

/** Extension Chrome (zip personnel avec la clé déjà dedans) et, en option, assistants IA (Claude, ChatGPT). */
function ExternalAccess({ ws }) {
  const STORE_URL = STORE;
  const toast = useToast();
  const [keys, setKeys] = useState(null);
  const [fresh, setFresh] = useState("");
  const [busy, setBusy] = useState("");
  const load = () => fn("r/apikey-list", { workspace_id: ws.id }).then((r) => setKeys(r.keys)).catch(() => setKeys([]));
  useEffect(() => { load(); }, [ws.id]);
  const newKey = async (name) => (await fn("r/apikey-create", { workspace_id: ws.id, name: `${name} du ${new Date().toLocaleDateString("fr-FR")}` })).key;
  const download = async () => {
    setBusy("ext");
    try { const { downloadExtension } = await import("../lib/extzip"); await downloadExtension(await newKey("Extension")); toast("Extension téléchargée, déjà reliée à ton espace", "good"); load(); }
    catch (e) { toast(e.message || "Téléchargement impossible, réessaie", "bad"); }
    finally { setBusy(""); }
  };
  const createAi = async () => { setBusy("ai"); try { setFresh(await newKey("Assistant IA")); load(); } catch (e) { toast(e.message, "bad"); } finally { setBusy(""); } };
  const revoke = async (id) => { await fn("r/apikey-revoke", { workspace_id: ws.id, id }); toast("Accès supprimé : il ne fonctionne plus", "good"); load(); };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); toast("Copié", "good"); } catch { toast(t); } };
  const mcp = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/x/mcp?k=${fresh}`;
  return (
    <Section id="acces" title="Extension Chrome" sub="Bingoo! dans ton navigateur : la fiche de chaque entreprise que tu visites, et le pilote LinkedIn.">
      {STORE_URL ? (
        <>
          <a href={STORE_URL} target="_blank" rel="noreferrer"><Button variant="primary">Installer l'extension</Button></a>
          <p className="text-sm text-ink-soft mt-3">Clique sur « Ajouter à Chrome ». Bingoo! s'ouvre tout seul et relie l'extension à ton espace.</p>
        </>
      ) : <Button variant="primary" loading={busy === "ext"} onClick={download}>Télécharger mon extension</Button>}
      {!STORE_URL && <ol className="text-sm text-ink-soft list-decimal pl-5 space-y-1.5 mt-4">
        <li>Décompresse le fichier téléchargé.</li>
        <li>Dans Chrome, ouvre la page <button className="font-mono text-ink underline decoration-dotted" onClick={() => copy("chrome://extensions")} title="Copier l'adresse">chrome://extensions</button> et active « Mode développeur » en haut à droite.</li>
        <li>Clique sur « Charger l'extension non empaquetée » et choisis le dossier <b className="text-ink">bingoo-extension</b>. C'est prêt : l'extension est déjà reliée à ton espace.</li>
      </ol>}
      {!STORE_URL && <p className="text-[12px] text-ink-faint mt-2">Le dossier contient ton accès personnel : ne le partage pas.</p>}

      <details className="mt-6 border-t border-line pt-4">
        <summary className="cursor-pointer text-sm font-semibold">Utiliser Bingoo! dans Claude ou ChatGPT</summary>
        <p className="text-sm text-ink-soft mt-2">Ton assistant pourra lire tes opportunités, tes concurrents, tes prospects et tes résultats. Crée un lien, puis ajoute-le dans ton assistant comme « connecteur personnalisé ».</p>
        {fresh ? (
          <div className="mt-3 flex gap-2 items-center"><code className="flex-1 break-all text-[12.5px] bg-paper rounded-lg border border-line px-2 py-1.5">{mcp}</code><Button size="sm" onClick={() => copy(mcp)}>Copier</Button></div>
        ) : <Button className="mt-3" size="sm" loading={busy === "ai"} onClick={createAi}>Créer mon lien</Button>}
        {fresh && <p className="text-[12px] text-ink-faint mt-1.5">Copie-le maintenant, il ne sera plus affiché. Garde-le privé.</p>}
      </details>

      {keys?.length > 0 && (
        <details className="mt-4 border-t border-line pt-4">
          <summary className="cursor-pointer text-sm font-semibold">Accès actifs ({keys.length})</summary>
          <div className="mt-3 space-y-1.5">{keys.map((k) => <div key={k.id} className="flex items-center gap-3 text-[13.5px]"><span>{k.name}</span><span className="text-ink-faint">{k.last_used_at ? `utilisé le ${new Date(k.last_used_at).toLocaleDateString("fr-FR")}` : "jamais utilisé"}</span><button onClick={() => revoke(k.id)} className="ml-auto text-[12.5px] text-bad hover:underline">Supprimer</button></div>)}</div>
        </details>
      )}
    </Section>
  );
}
