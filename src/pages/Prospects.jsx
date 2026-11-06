import { useCallback, useEffect, useMemo, useState } from "react";
import Guide from "../components/Guide";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CALL } from "../lib/labels";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Empty, Input, PageHead, Spinner, Textarea, useToast } from "../components/ui";
import { STATUS, cx, fmtDate, fmtTime } from "../lib/utils";
import { useJob } from "../lib/useJob";
import { download, toCsv } from "../lib/csv";
import ImportCsv from "../components/ImportCsv";
import Contacts, { ImportPerson } from "../components/Contacts";
import { SubNav } from "../components/SubNav";

// Signaux forts : un vrai fait récent qui justifie de contacter (adapté de Harvey)
const STRONG = ["ouverture", "creation", "recrutement", "croissance", "pub_google", "pub_meta", "pub_linkedin", "levee", "accelerateur"];

const VIEWS = [
  { key: "all", label: "Tous", fn: (r) => r.fit !== "non" },
  { key: "mail", label: "Avec e-mail", fn: (r) => !!r.email },
  { key: "tel", label: "Avec téléphone", fn: (r) => !!r.phone },
  { key: "hot", label: "Réponses et RDV", st: ["repondu", "rdv", "client"] },
  { key: "signal", label: "Avec signal", fn: (r) => r.signals?.some((s) => STRONG.includes(s.type)) },
  { key: "due", label: "À relancer", fn: (r) => r.next_action_at && r.next_action_at <= new Date().toISOString().slice(0, 10) },
  { key: "sent", label: "Contactés", st: ["envoye"] },
  { key: "ready", label: "Joignables", st: ["pret", "a_valider"] },
  { key: "todo", label: "À enquêter", st: ["nouveau"] },
  { key: "none", label: "Sans e-mail", fn: (r) => !r.email && r.fit !== "non" && !["ignore", "refus", "client", "rdv", "repondu"].includes(r.status) },
  { key: "check", label: "E-mail à vérifier", fn: (r) => !r.email && !!r.email_candidate },
  { key: "off", label: "Hors cible", fn: (r) => r.fit === "non" },
];
const MAIN = ["all", "ready", "none", "sent"];
const LABEL = { ready: "Joignables", none: "À trouver", sent: "Contactés" };
const MOVES = ["repondu", "rdv", "client", "refus", "ignore"];
export const CHANNEL = {
  email: { label: "E-mail", icon: "✉" },
  telephone: { label: "Téléphone", icon: "☎" },
  linkedin: { label: "LinkedIn", icon: "in" },
  formulaire: { label: "Formulaire", icon: "✎" },
  courrier: { label: "Courrier", icon: "✉︎" },
};

function printLetter(ws, p, text) {
  const w = window.open("", "_blank");
  if (!w) return;
  const esc = (x) => String(x ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Lettre ${esc(p.name)}</title><style>body{font:12pt/1.55 Georgia,serif;color:#111;max-width:17cm;margin:2.2cm auto;padding:0 1cm}.from{font-size:10.5pt;color:#444}.to{margin:1.6cm 0 1cm auto;width:8cm}.date{text-align:right;margin-bottom:1cm}p{margin:0 0 .8em;white-space:pre-line}@media print{body{margin:0 auto}}</style></head><body>
<div class="from"><b>${esc(ws.profile?.nom || ws.name)}</b><br>${esc(ws.sender_name)}<br>${esc(ws.postal_address)}<br>${esc(ws.sender_email)}</div>
<div class="to">${p.contact_name ? `${esc(p.contact_name)}${p.contact_role ? `<br>${esc(p.contact_role)}` : ""}<br>` : "À l'attention de la direction<br>"}<b>${esc(p.name)}</b><br>${esc(p.address)}</div>
<div class="date">${esc(ws.profile?.ville || "")}${ws.profile?.ville ? ", le " : "Le "}${date}</div>
${text.split(/\n{2,}/).map((x) => `<p>${esc(x)}</p>`).join("")}
<script>setTimeout(()=>print(),300)</script></body></html>`);
  w.document.close();
}

function PlanB({ p, ws, busy, setBusy, onChange, act, nav }) {
  const toast = useToast();
  const [text, setText] = useState(p.letter || "");
  const ch = p.channel || (p.phone ? "telephone" : p.linkedin_url ? "linkedin" : p.contact_form ? "formulaire" : "courrier");
  const write = async (kind) => {
    setBusy(kind);
    try { const r = await fn("letter", { workspace_id: ws.id, prospect_id: p.id, kind }); setText(r.text); onChange({ ...p, letter: r.text }); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const copy = () => navigator.clipboard?.writeText(text).then(() => toast("Copié", "good"), () => toast("Copie impossible", "bad"));
  return (
    <div className="mt-6 rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Pas d'e-mail : plan B</p>
        {CHANNEL[ch] && <Badge tone="accent">{CHANNEL[ch].icon} {CHANNEL[ch].label}</Badge>}
      </div>
      {(p.enrich_level ?? 0) < 2 ? (
        <>
          <p className="text-sm text-ink-soft mt-1">L'enquête rapide n'a rien trouvé. Le Détective peut creuser : son site (contact, mentions légales), les annuaires officiels du secteur, le site du groupe, les documents publics{p.contact_name ? ", puis Dropcontact pour l'adresse nominative du dirigeant" : ""}. Chaque adresse est vérifiée.</p>
          <Button quota="enquete_plus" size="sm" variant="primary" className="mt-3" loading={busy === "enrich-deep"} onClick={() => act("enrich-deep", "Enquête approfondie terminée")}>Enquête approfondie</Button>
          {busy === "enrich-deep" && <p className="text-xs text-ink-soft mt-2">1 à 2 minutes…</p>}
        </>
      ) : (
        <p className="text-sm text-ink-soft mt-1">{p.dropcontact_req ? "Dropcontact cherche encore l'adresse du dirigeant : le résultat arrive automatiquement. " : "Aucun e-mail publié n'existe pour cet établissement. "}Voici le meilleur canal pour le joindre quand même.</p>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {p.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`}><Button size="sm" variant={ch === "telephone" ? "accent" : "default"}>☎ Appeler {p.phone}</Button></a>}
        {p.phone && <Button size="sm" onClick={() => nav("/appels")}>Script d'appel</Button>}
        {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer"><Button size="sm" variant="li">Profil LinkedIn</Button></a>}
        {p.contact_form && <a href={p.contact_form} target="_blank" rel="noreferrer"><Button size="sm" variant={ch === "formulaire" ? "accent" : "default"}>Ouvrir le formulaire ↗</Button></a>}
        {p.contact_form && <Button quota="lettre" size="sm" loading={busy === "formulaire"} onClick={() => write("formulaire")}>Préparer le message</Button>}
        {(p.address || p.postal_code) && <Button size="sm" variant={ch === "courrier" ? "accent" : "default"} loading={busy === "courrier"} quota="lettre" onClick={() => write("courrier")}>Préparer une lettre</Button>}
      </div>
      {text && (
        <div className="mt-3">
          <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} className="text-sm" />
          <div className="flex gap-3 mt-2 text-sm">
            <button className="font-semibold text-accent hover:underline" onClick={copy}>Copier</button>
            <button className="font-semibold text-accent hover:underline" onClick={() => printLetter(ws, p, text)}>Imprimer en lettre</button>
          </div>
        </div>
      )}
    </div>
  );
}


function Drawer({ p, onClose, onChange, team = [] }) {
  const { ws } = useWs();
  const toast = useToast();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState(null);
  const [calls, setCalls] = useState([]);
  const [busy, setBusy] = useState(null);
  const [why, setWhy] = useState(false);
  const [next, setNext] = useState({ next_action: p.next_action ?? "", next_action_at: p.next_action_at ?? "", notes: p.notes ?? "", owner_id: p.owner_id ?? "" });
  useEffect(() => {
    supabase.from("messages").select("*").eq("prospect_id", p.id).order("created_at").then(({ data }) => setMsgs(data ?? []));
    supabase.from("calls").select("*").eq("prospect_id", p.id).order("created_at", { ascending: false }).then(({ data }) => setCalls(data ?? []));
  }, [p.id]);
  const saveNext = async () => {
    const patch = { next_action: next.next_action, next_action_at: next.next_action_at || null, notes: next.notes, owner_id: next.owner_id || null };
    await supabase.from("prospects").update(patch).eq("id", p.id);
    onChange({ ...p, ...patch }); toast("Enregistré");
  };
  const analyse = async () => {
    setBusy("insight");
    try { await fn("insight", { workspace_id: ws.id, prospect_id: p.id }); const { data } = await supabase.from("prospects").select("*").eq("id", p.id).single(); onChange(data); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const ins = p.insight?.resume || p.insight?.faits ? p.insight : null;
  const spy = p.insight?.espion;
  const set = async (status) => {
    const extra = status === "client" && !p.won_at ? { won_at: new Date().toISOString() } : {};
    await supabase.from("prospects").update({ status, ...extra }).eq("id", p.id);
    if (["repondu", "rdv", "client", "refus", "ignore"].includes(status)) await supabase.from("messages").update({ status: "ignore" }).eq("prospect_id", p.id).eq("status", "brouillon");
    onChange({ ...p, status });
    toast(`Statut : ${STATUS[status].label}`);
  };
  const act = async (action, label) => {
    setBusy(action);
    try {
      await fn(action, { workspace_id: ws.id, ids: [p.id], count: 1 });
      const { data } = await supabase.from("prospects").select("*").eq("id", p.id).single();
      onChange(data);
      toast(label, "good");
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  const target = ws.targets?.find((t) => t.id === p.target);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal>
      <button className="absolute inset-0 bg-ink/30" onClick={onClose} aria-label="Fermer" />
      <div className="relative w-full max-w-lg bg-paper h-full overflow-y-auto p-5 sm:p-7 rise">
        <button onClick={onClose} className="text-sm text-ink-soft hover:text-ink">✕ Fermer</button>
        <div className="mt-4 flex flex-wrap gap-2"><Badge tone={STATUS[p.status]?.tone}>{STATUS[p.status]?.label}</Badge><Badge>{target?.label ?? p.activity}</Badge></div>
        <h2 className="font-serif text-4xl leading-tight mt-3">{p.name}</h2>
        {p.org && <p className="text-ink-soft">{p.org}</p>}
        <FitNote p={p} onChange={onChange} />
        <dl className="mt-5 grid grid-cols-[110px_1fr] gap-y-2 text-sm">
          <dt className="text-ink-soft">Décideur</dt><dd>{p.contact_name ? `${p.contact_name}${p.contact_role ? ` · ${p.contact_role}` : ""}` : "—"}</dd>
          <dt className="text-ink-soft">E-mail</dt><dd>{p.email ? <><a className="underline" href={`mailto:${p.email}`}>{p.email}</a><Provenance src={p.email_source} at={p.enriched_at} /></> : p.email_candidate ? <Candidate p={p} onChange={onChange} /> : <FindEmail p={p} onChange={onChange} />}</dd>
          <dt className="text-ink-soft">Téléphone</dt><dd>{p.phone ? <><a className="underline" href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a><Provenance src={p.phone_source || (p.siret ? "fiche entreprise" : "")} at={p.phone_checked_at} /></> : <FindPhone p={p} onChange={onChange} />}</dd>
          <dt className="text-ink-soft">LinkedIn</dt><dd>{p.linkedin_url ? <a className="underline text-li" href={p.linkedin_url} target="_blank" rel="noreferrer">{p.linkedin_person || "Profil"}</a> : p.linkedin_status === "introuvable" ? "Introuvable" : "—"}</dd>
          <dt className="text-ink-soft">Site</dt><dd className="truncate">{p.website ? <a className="underline" href={p.website} target="_blank" rel="noreferrer">{p.website.replace(/^https?:\/\//, "")}</a> : "—"}</dd>
          <dt className="text-ink-soft">Adresse</dt><dd>{[p.address].filter(Boolean).join(" ") || "—"}</dd>
          <dt className="text-ink-soft">SIRET</dt><dd className="tnum">{p.siret}</dd>
        </dl>
        <label className="mt-4 flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input type="checkbox" checked={p.strategique === true} onChange={async (e) => { const v = e.target.checked ? true : false; await supabase.from("prospects").update({ strategique: v }).eq("id", p.id); onChange({ ...p, strategique: v }); }} />
          Compte stratégique <span className="text-ink-soft font-normal">(suivi étape par étape dans la salle de pilotage)</span>
        </label>
        {p.enrich_note && <p className="text-xs text-ink-soft mt-3">{p.enrich_note}</p>}
        {!["refus", "ignore", "client"].includes(p.status) && (
          <Button className="mt-4 w-full sm:w-auto" variant="accent" loading={busy === "ecrire"} onClick={async () => {
            setBusy("ecrire");
            try {
              const r = await fn("m/prospect-prepare", { workspace_id: ws.id, id: p.id });
              if (r.message?.status === "brouillon") { nav(`/valider?id=${r.message.id}`); return; }
              if (r.message) toast("Un premier message lui a déjà été envoyé : la relance est préparée automatiquement.");
              else toast(r.reason === "no_email" ? "Pas d'e-mail trouvé pour lui : appelle-le ou passe par LinkedIn." : r.reason === "no_sender" ? "Indique d'abord ton nom d'expéditeur dans Réglages." : "Rien à préparer pour l'instant.", "bad");
              const { data } = await supabase.from("prospects").select("*").eq("id", p.id).single(); if (data) onChange(data);
            } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
          }}>Lui écrire un message</Button>
        )}
        <Contacts p={p} onChange={onChange} />
        {p.signals?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{p.signals.map((s, i) => <Badge key={i} tone={STRONG.includes(s.type) ? "accent" : "muted"}>{s.label}</Badge>)}</div>}

        {!p.email && p.enriched_at && <PlanB p={p} ws={ws} busy={busy} setBusy={setBusy} onChange={onChange} act={act} nav={nav} />}

        {spy && (
          <div className="mt-6 rounded-2xl border border-accent/30 bg-accent-soft/40 p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">Dossier Espion</p>
              <span className="text-xs text-ink-faint">{spy.concurrent ? `Concurrent probable : ${spy.concurrent}` : "Aucun concurrent identifié"}</span>
            </div>
            {spy.angle && <p className="mt-2"><b>Angle : </b>{spy.angle}</p>}
            {spy.faiblesses?.length > 0 && <div className="mt-2"><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Faiblesses vérifiées chez {spy.concurrent}</p>{spy.faiblesses.map((f, i) => <p key={i}>• {typeof f === "string" ? f : f?.texte}</p>)}</div>}
            {spy.objection && <p className="mt-2"><b>Objection probable : </b>« {typeof spy.objection === "string" ? spy.objection : spy.objection.objection} »{spy.objection.reponse ? <span className="block text-ink-soft mt-0.5">Réponse prévue : {spy.objection.reponse}</span> : null}</p>}
            {spy.question && <p className="mt-1"><b>Question à poser : </b>{spy.question}</p>}
            {spy.opportunite && <p className="mt-1"><b>Opportunité : </b>{spy.opportunite}</p>}
            <p className="text-xs text-ink-faint mt-2">Préparé par Espion pour Hugo, qui s'en sert pour écrire l'e-mail.</p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">Pourquoi le contacter maintenant ?</p>
            {ins && <span className="font-serif text-2xl">{p.score}<span className="text-sm text-ink-faint">/100</span></span>}
          </div>
          {!ins ? (
            <><p className="text-sm text-ink-soft mt-1">L'IA cherche des signaux publics (ouverture, travaux, nomination, recrutement, avis, publications sur les réseaux…) et sépare les faits des hypothèses. Une publication récente sert d'accroche à l'e-mail.</p>
            <Button quota="analyse_prospect" size="sm" variant="primary" className="mt-3" loading={busy === "insight"} onClick={analyse}>Analyser ce prospect</Button></>
          ) : (
            <div className="text-sm mt-2 space-y-3">
              <p>{ins.resume}</p>
              {ins.faits?.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-good">Faits</p>{ins.faits.map((f, i) => <p key={i}>• {f.texte} {f.source && <a href={f.source} target="_blank" rel="noreferrer" className="text-ink-faint underline">source</a>}</p>)}</div>}
              {ins.hypotheses?.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-warn">Hypothèses</p>{ins.hypotheses.map((f, i) => <p key={i}>• {f}</p>)}</div>}
              {ins.inconnues?.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Inconnues</p>{ins.inconnues.map((f, i) => <p key={i}>• {f}</p>)}</div>}
              {(ins.reseaux?.liens?.length > 0 || ins.reseaux?.publications?.length > 0 || ins.reseaux?.accroche) && <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-li">Réseaux sociaux</p>
                {ins.reseaux.liens?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-1">{ins.reseaux.liens.filter((l) => /^https?:/.test(l.url)).map((l, i) => <a key={i} href={l.url} target="_blank" rel="noreferrer" className="rounded-full border border-line px-2.5 py-0.5 text-xs capitalize hover:border-ink-faint">{l.reseau} ↗</a>)}</div>}
                {ins.reseaux.publications?.map((x, i) => <p key={i} className="mt-1">• <span className="text-ink-faint">{x.date}</span> {x.sujet} {x.source && /^https?:/.test(x.source) && <a href={x.source} target="_blank" rel="noreferrer" className="text-ink-faint underline">voir</a>}</p>)}
                {ins.reseaux.accroche && <p className="mt-2 rounded-xl border border-dashed border-line p-3"><span className="text-xs font-semibold text-ink-soft block mb-0.5">Accroche utilisée dans l'e-mail</span>« {ins.reseaux.accroche} »</p>}
              </div>}
              {ins.recommandation && <p className="bg-accent-soft rounded-xl p-3"><b>{ins.contacter === false ? "À ne pas contacter pour l'instant. " : "Angle : "}</b>{ins.recommandation}</p>}
              <button className="text-xs text-ink-soft underline" onClick={analyse}>{busy === "insight" ? "Analyse…" : "Mettre à jour"}</button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          {!p.enriched_at && <Button quota="enquete" size="sm" loading={busy === "m/enrich"} onClick={() => act("m/enrich", "Enquête terminée")}>Enquête approfondie</Button>}
          {!p.linkedin_status && <Button quota="linkedin" size="sm" variant="li" loading={busy === "linkedin"} onClick={() => act("linkedin", "Recherche LinkedIn terminée")}>Préparer LinkedIn</Button>}
          <Button size="sm" onClick={() => nav("/devis", { state: { prospect: p } })}>Créer un devis</Button>
        </div>

        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mt-7 mb-2">Où en est-on ?</h3>
        <div className="flex flex-wrap gap-2">
          {MOVES.map((m) => (
            <button key={m} onClick={() => m === "ignore" && p.status !== "ignore" ? setWhy(true) : set(m)} className={cx("rounded-full px-3 py-1.5 text-sm border", p.status === m ? "bg-ink text-white border-ink" : "bg-white border-line hover:border-ink-faint")}>{STATUS[m].label}</button>
          ))}
        </div>
        {why && (
          <div className="mt-3 rounded-xl bg-paper p-3 text-sm">
            <p className="text-ink-soft mb-2">Pourquoi tu l'écartes ? Bingoo! s'en servira pour trier les suivantes.</p>
            <div className="flex flex-wrap gap-1.5">
              {["Pas ma cible", "Trop petite", "Trop grande", "Déjà client", "Concurrent", "Mauvaise zone"].map((r) => (
                <button key={r} onClick={async () => { try { await fn("r/refus", { workspace_id: ws.id, id: p.id, raison: r }); onChange({ ...p, status: "ignore", fit: "non", fit_reason: `Écarté par toi : ${r}` }); setWhy(false); toast("Écartée. Bingoo! s'en souviendra."); } catch (e) { toast(e.message, "bad"); } }} className="rounded-full border border-line bg-white px-3 py-1 hover:border-ink-faint">{r}</button>
              ))}
              <button onClick={() => { setWhy(false); set("ignore"); }} className="rounded-full px-3 py-1 text-ink-soft underline">Sans raison</button>
            </div>
          </div>
        )}

        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mt-7 mb-2">Prochaine action</h3>
        <div className="grid grid-cols-[1fr_150px] gap-2">
          <Input placeholder="Ex. Rappeler après les vacances" value={next.next_action} onChange={(e) => setNext({ ...next, next_action: e.target.value })} />
          <Input type="date" value={next.next_action_at ?? ""} onChange={(e) => setNext({ ...next, next_action_at: e.target.value })} />
        </div>
        <Textarea rows={3} className="mt-2" placeholder="Notes" value={next.notes} onChange={(e) => setNext({ ...next, notes: e.target.value })} />
        {team.length > 1 && (
          <label className="flex items-center gap-2 text-sm mt-2"><span className="text-ink-soft">Responsable</span>
            <select value={next.owner_id} onChange={(e) => setNext({ ...next, owner_id: e.target.value })} className="flex-1 min-w-0 rounded-lg border border-line bg-white px-2 py-1.5 text-sm">
              <option value="">Personne</option>{team.map((m) => <option key={m.user_id} value={m.user_id}>{m.email}</option>)}
            </select>
          </label>
        )}
        <Button size="sm" className="mt-2" onClick={saveNext}>Enregistrer</Button>
        {calls.length > 0 && <>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mt-7 mb-2">Appels</h3>
          {calls.map((c) => <p key={c.id} className="text-sm"><span className="text-ink-faint">{fmtTime(c.created_at)}</span> · {CALL[c.outcome]}{c.notes ? ` — ${c.notes}` : ""}</p>)}
        </>}

        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mt-7 mb-2">Messages</h3>
        {!msgs ? <Spinner /> : msgs.length === 0 ? <p className="text-sm text-ink-soft">Aucun message pour l'instant.</p> : (
          <div className="space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className="bg-white border border-line rounded-2xl p-4 text-sm">
                <div className="flex justify-between gap-2 text-xs text-ink-soft">
                  <span>{m.step === 0 ? "Premier message" : m.step >= 100 ? "Reprise de contact" : `Relance n°${m.step}`}</span>
                  <span>{m.status === "envoye" ? `Envoyé ${fmtTime(m.sent_at)}` : m.status === "brouillon" ? "À valider" : m.status === "echec" ? `Échec : ${m.error}` : "Non envoyé"}</span>
                </div>
                <p className="font-semibold mt-2">{m.subject}</p>
                <p className="whitespace-pre-line mt-1 text-ink-soft leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Prospects() {
  const { ws } = useWs();
  const [rows, setRows] = useState(null);
  const [view, setView] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [cr, setCr] = useState(null);
  const [importing, setImporting] = useState(false);
  const [mine, setMine] = useState(false);
  const [team, setTeam] = useState([]);
  const toast = useToast();
  const { session } = useWs();
  useEffect(() => { supabase.from("members").select("user_id, email").eq("workspace_id", ws.id).then(({ data }) => setTeam(data ?? [])); }, [ws.id]);
  const { job, run } = useJob(toast);

  const load = useCallback(async () => {
    const all = [];
    for (let from = 0; from < 10000; from += 1000) {
      const { data } = await supabase.from("prospects").select("*").eq("workspace_id", ws.id).order("updated_at", { ascending: false }).range(from, from + 999);
      all.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    setRows(all);
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);
  // Lien direct vers une fiche (depuis la carte de l'équipe) : /#/prospects?id=…
  const loc = useLocation();
  useEffect(() => {
    const id = new URLSearchParams(loc.search).get("id");
    if (id) supabase.from("prospects").select("*").eq("id", id).eq("workspace_id", ws.id).maybeSingle().then(({ data }) => { if (data) setOpen(data); });
  }, [loc.search, ws.id]);
  useEffect(() => { window.addEventListener("kairo:refresh", load); return () => window.removeEventListener("kairo:refresh", load); }, [load]);
  useEffect(() => { if (view === "none" && !cr) fn("credits", { workspace_id: ws.id }).then(setCr).catch(() => {}); }, [view, cr, ws.id]);

  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.key, rows?.filter((r) => v.fn ? v.fn(r) : !v.st || v.st.includes(r.status)).length ?? 0])), [rows]);
  const list = useMemo(() => {
    const v = VIEWS.find((x) => x.key === view);
    const n = q.trim().toLowerCase();
    const me = session?.user?.id;
    return (rows ?? []).filter((r) => (v.fn ? v.fn(r) : !v.st || v.st.includes(r.status)) && (!mine || r.owner_id === me) && (!n || `${r.name} ${r.org} ${r.city} ${r.email} ${r.contact_name}`.toLowerCase().includes(n)));
  }, [rows, view, q, mine, session]);
  const exportCsv = () => {
    const owner = (id) => team.find((m) => m.user_id === id)?.email ?? "";
    const head = ["Entreprise", "Raison sociale", "Contact", "Fonction", "E-mail", "Téléphone", "Site web", "Adresse", "Code postal", "Ville", "SIRET", "Activité", "Cible", "Statut", "Score", "LinkedIn", "Prochaine action", "Date prochaine action", "Responsable", "Notes", "Ajouté le"];
    const data = list.map((r) => [r.name, r.org, r.contact_name, r.contact_role, r.email, r.phone, r.website, r.address, r.postal_code, r.city, r.siret, r.activity, targetLabel(r.target), STATUS[r.status]?.label ?? r.status, r.score ?? "", r.linkedin_url, r.next_action, r.next_action_at ?? "", owner(r.owner_id), r.notes, (r.created_at ?? "").slice(0, 10)]);
    download(`prospects-bingoo-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(head, data));
    toast(`${data.length} prospects exportés`, "good");
  };
  const targetLabel = (id) => ws.targets?.find((t) => t.id === id)?.label ?? "";

  return (
    <div>
      <SubNav section="prospects" />
      <PageHead title="Contacts" sub={rows ? [[rows.length, "entreprise"], [rows.filter((r) => r.contact_name).length, "décideur"], [rows.filter((r) => r.email).length, "e-mail"], [rows.filter((r) => r.phone).length, "téléphone"]].map(([n, l]) => `${n.toLocaleString("fr-FR")} ${l}${n > 1 ? "s" : ""}`).join(" · ") : ""}>
        <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="!w-56" />
        {team.length > 1 && <Button variant={mine ? "primary" : "default"} onClick={() => setMine((x) => !x)}>Mes contacts</Button>}
        <Link to="/mission"><Button variant="accent">+ Trouver des contacts</Button></Link>
        <Button onClick={() => setAdding((x) => !x)}>Ajouter un contact</Button>
        <Button onClick={() => setImporting((x) => !x)}>Importer</Button>
        <Button onClick={exportCsv} disabled={!list.length}>Exporter</Button>
      </PageHead>
      <Guide id="contacts" titre="Ici : toutes les entreprises que Bingoo! a trouvées pour toi, et comment joindre leur décideur." etapes={["« Joignables » : Bingoo! a l'e-mail ou le téléphone du décideur. Il leur écrit, tu valides dans « À faire ».", "« À trouver » : ouvre une fiche et clique « Trouver l'e-mail ». Bingoo! le cherche pour toi.", "Une fiche ne te convient pas ? Ouvre-la, clique « Écarté » et dis pourquoi : Bingoo! en tiendra compte."]} />
      {adding && (
        <div className="mb-4 rounded-2xl border border-line bg-white p-4">
          <p className="font-semibold">Ajouter une personne précise</p>
          <p className="text-sm text-ink-soft mt-0.5 mb-3">Colle un profil LinkedIn ou écris « Prénom Nom, entreprise » : Kairo identifie la personne et son entreprise, puis cherche son e-mail vérifié.</p>
          <ImportPerson onDone={async (id) => { setAdding(false); await load(); const { data } = await supabase.from("prospects").select("*").eq("id", id).single(); if (data) setOpen(data); }} />
        </div>
      )}
      {importing && <ImportCsv ws={ws} existing={rows ?? []} toast={toast} onClose={() => setImporting(false)} onDone={() => { setImporting(false); load(); }} />}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4">
        {/* 4 filtres qui suffisent au quotidien ; les autres dans « Plus de filtres » */}
        {MAIN.map((k) => VIEWS.find((v) => v.key === k)).map((v) => (
          <button key={v.key} onClick={() => setView(v.key)} className={cx("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium border", view === v.key ? "bg-ink text-white border-ink" : "bg-white border-line")}>
            {LABEL[v.key] ?? v.label} <span className="opacity-60 tnum">{counts[v.key]}</span>
          </button>
        ))}
        <label className="sr-only" htmlFor="more-views">Plus de filtres</label>
        <select id="more-views" value={MAIN.includes(view) ? "" : view} onChange={(e) => e.target.value && setView(e.target.value)} className={cx("shrink-0 rounded-full px-3 py-1.5 text-sm font-medium border bg-white", !MAIN.includes(view) ? "border-ink" : "border-line text-ink-soft")}>
          <option value="">Plus de filtres</option>
          {VIEWS.filter((v) => !MAIN.includes(v.key)).map((v) => <option key={v.key} value={v.key}>{v.label} ({counts[v.key]})</option>)}
        </select>
      </div>
      {view === "off" && rows && (
        <div className="mb-4 rounded-2xl border border-line bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-semibold">Les fiches écartées parce qu'elles ne sont pas dans ta cible</p>
            <p className="text-ink-soft">Bingoo! relit chaque nouvelle fiche avant de te la montrer : doublons, établissements publics, sociétés civiles, autre métier. Rien n'est supprimé : ouvre une fiche pour la remettre dans ta liste.</p>
          </div>
          <Button variant="primary" loading={job?.key === "fit"} disabled={!!job} onClick={() => run({ key: "fit", action: "r/fit-check", body: { workspace_id: ws.id, max: 100 }, rounds: 1, label: "Tri de ta liste", done: (n, f) => n ? `${n} fiches relues, ${f} écartées` : "Toutes tes fiches sont déjà triées" })}>Trier ma liste</Button>
        </div>
      )}
      {view === "none" && rows && (
        <div className="mb-4 rounded-2xl border border-line bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-semibold">Plan B pour les prospects sans e-mail</p>
            <p className="text-ink-soft">Le Détective creuse (site, annuaires, groupe, documents publics{cr?.dropcontact ? ", Dropcontact" : ""}) puis choisit le meilleur canal : téléphone, LinkedIn, formulaire ou courrier.{cr && <> {cr.dropcontact ? `Dropcontact : ${cr.used}/${cr.total} e-mails ce mois.` : "Dropcontact pas encore connecté."}</>}</p>
          </div>
          <Button quota="enquete_plus" variant="primary" loading={job?.key === "deep"} disabled={!!job || !list.some((r) => (r.enrich_level ?? 0) < 2)} onClick={() => run({ key: "deep", action: "enrich-deep", body: { workspace_id: ws.id }, rounds: 5, label: "Enquête approfondie", done: (n, f) => `${f} e-mails trouvés sur ${n} prospects, les autres ont un canal recommandé` })}>
            {job?.key === "deep" ? job.text : "Creuser 5 prospects"}
          </Button>
        </div>
      )}
      {!rows ? <Spinner /> : list.length === 0 ? <Empty title="Aucun contact ici." /> : (
        <div className="bg-white border border-line rounded-2xl overflow-hidden divide-y divide-line">
          {list.slice(0, 300).map((r) => (
            <button key={r.id} onClick={() => setOpen(r)} className="w-full text-left px-4 py-3 hover:bg-paper flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="truncate"><span className="font-medium">{r.name}</span>{r.contact_name && <span className="text-ink-soft"> · {r.contact_name}{r.contact_role ? `, ${r.contact_role}` : ""}</span>}</p>
                <p className="text-[13px] truncate flex flex-wrap gap-x-3">
                  {r.email ? <span className="text-ink">✉ {r.email}</span> : <span className="text-ink-faint">E-mail à trouver</span>}
                  {r.phone && <span className="text-ink">☎ {r.phone}</span>}
                  <span className="text-ink-soft">{view === "off" && r.fit_reason ? `Écarté : ${r.fit_reason}` : [targetLabel(r.target), [r.postal_code, r.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</span>
                </p>
              </div>
              {r.score != null && <span className="text-xs font-semibold tnum text-ink-soft">{r.score}</span>}
              {r.signals?.some((x) => STRONG.includes(x.type)) && <Badge tone="accent">Signal</Badge>}
              {r.linkedin_status === "a_envoyer" && <Badge tone="li">in</Badge>}
              {!r.email && r.channel && CHANNEL[r.channel] && <Badge>{CHANNEL[r.channel].icon} {CHANNEL[r.channel].label}</Badge>}
              <Badge tone={STATUS[r.status]?.tone}>{STATUS[r.status]?.label}</Badge>
              <span className="hidden sm:block text-xs text-ink-faint w-14 text-right">{fmtDate(r.updated_at)}</span>
            </button>
          ))}
          {list.length > 300 && <p className="px-4 py-3 text-sm text-ink-soft">+ {list.length - 300} autres : affine ta recherche.</p>}
        </div>
      )}
      {open && <Drawer team={team} p={open} onClose={() => setOpen(null)} onChange={(np) => { setOpen(np); setRows((rs) => rs.map((x) => x.id === np.id ? np : x)); }} />}
    </div>
  );
}

// D'où vient le contact et quand il a été vérifié : on ne montre jamais d'e-mail deviné
function Provenance({ src, at }) {
  if (!src && !at) return null;
  const d = at ? new Date(at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
  return <span className="block text-xs text-ink-faint">{src ? `Source : ${src}` : ""}{src && d ? " · " : ""}{d ? `vérifié le ${d}` : ""}</span>;
}

// Filtre de cible : pourquoi la fiche a été écartée (ou mise en doute), et le geste pour la remettre
function FitNote({ p, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (p.fit !== "non" && p.fit !== "doute") return null;
  const restore = async () => {
    setBusy(true);
    try { await fn("r/fit-restore", { workspace_id: ws.id, id: p.id }); onChange({ ...p, fit: "oui", fit_reason: "Remise dans la liste par toi", status: "nouveau" }); toast("Fiche remise dans ta liste", "good"); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  return (
    <div className={cx("mt-3 rounded-xl px-3 py-2.5 text-sm flex items-center gap-3", p.fit === "non" ? "bg-[#FDF0EC] text-[#9A3412]" : "bg-paper text-ink-soft")}>
      <p className="flex-1">{p.fit === "non" ? "Écartée, hors cible" : "À vérifier"}{p.fit_reason ? ` : ${p.fit_reason}` : ""}</p>
      {p.fit === "non" && <Button size="sm" loading={busy} onClick={restore}>Remettre dans ma liste</Button>}
    </div>
  );
}

// E-mail à la demande : site d'abord (gratuit), puis recherche vérifiée sur le décideur. Jamais d'adresse devinée.
function FindEmail({ p, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const go = async () => {
    setBusy(true); setNote("");
    try {
      const r = await fn("r/find-email", { workspace_id: ws.id, id: p.id });
      const { data } = await supabase.from("prospects").select("*").eq("id", p.id).single();
      if (data) onChange(data);
      if (r.email) toast("E-mail trouvé", "good");
      setNote(r.steps?.at(-1) ?? "");
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  return (
    <span className="block">
      <Button size="sm" loading={busy} onClick={go}>{busy ? "Recherche…" : "Trouver l'e-mail"}</Button>
      {note && <span className="block text-xs text-ink-soft mt-1">{note.replace(/^./, (c) => c.toUpperCase())}.</span>}
    </span>
  );
}

// Téléphone du décideur à la demande (3 clés trouvé!) ; rappel : appeler un particulier exige son accord préalable
function FindPhone({ p, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const go = async () => {
    setBusy(true); setNote("");
    try {
      const r = await fn("r/find-phone", { workspace_id: ws.id, id: p.id });
      const { data } = await supabase.from("prospects").select("*").eq("id", p.id).single();
      if (data) onChange(data);
      setNote(r.note ?? "");
      if (r.phone) toast("Téléphone trouvé", "good");
    } catch (e) { setNote(e.message); } finally { setBusy(false); }
  };
  return (
    <span className="block">
      <Button size="sm" loading={busy} onClick={go}>{busy ? "Recherche…" : "Trouver le téléphone"}</Button>
      <span className="block text-xs text-ink-faint mt-1">{note ? `${note.replace(/^./, (c) => c.toUpperCase())}. ` : ""}Un dirigeant installé à son domicile est un particulier : l'appeler demande son accord préalable.</span>
    </span>
  );
}

// E-mail trouvé mais pas relié avec certitude à cette entreprise (autre domaine, autre société) : le client tranche
function Candidate({ p, onChange }) {
  const toast = useToast();
  const use = async () => {
    const patch = { email: p.email_candidate, email_source: p.email_candidate_note.split(" : ")[0] + " · validé par toi", enriched_at: new Date().toISOString(), channel: "email", email_candidate: "", email_candidate_note: "", status: ["sans_email", "nouveau"].includes(p.status) ? "pret" : p.status };
    const { error } = await supabase.from("prospects").update(patch).eq("id", p.id);
    if (error) return toast(error.message, "bad");
    onChange({ ...p, ...patch }); toast("E-mail retenu", "good");
  };
  const drop = async () => {
    const patch = { email_candidate: "", email_candidate_note: "" };
    await supabase.from("prospects").update(patch).eq("id", p.id);
    onChange({ ...p, ...patch });
  };
  return (
    <span className="block rounded-lg bg-warn-soft px-2.5 py-2">
      <span className="block font-medium">{p.email_candidate}</span>
      <span className="block text-xs text-warn mt-0.5">À vérifier : {p.email_candidate_note.split(" : ").slice(1).join(" : ") || p.email_candidate_note}</span>
      <span className="mt-2 flex gap-2"><Button size="sm" onClick={use}>Utiliser cet e-mail</Button><Button size="sm" variant="ghost" onClick={drop}>Écarter</Button></span>
    </span>
  );
}
