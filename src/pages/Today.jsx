import Appris from "../components/Appris";
import Opportunite from "../components/Opportunite";
import PushTel from "../components/PushTel";
import Visite from "../components/Visite";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useJob } from "../lib/useJob";
import { Button, useToast } from "../components/ui";
import { cx, plural } from "../lib/utils";
import { fmtN } from "../lib/zones";
import CompanyLogo from "../components/CompanyLogo";
import TodayFeed from "../components/TodayFeed";
import { BandeauMatin, usePilotage } from "./Pilotage";
import { estMobile, trace } from "../lib/usage";
const useMesureVue = (v) => { const { ws } = useWs(); useEffect(() => { trace(ws.id, "vue", `${v}${estMobile() ? " mobile" : ""}`); }, [ws.id]); }; // eslint-disable-line react-hooks/exhaustive-deps

const I = {
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  cal: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2a5 5 0 0 1 5.5 5" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
};
const Ico = ({ n, className = "w-5 h-5", fill }) => <svg viewBox="0 0 24 24" className={cx(className, "shrink-0")} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{I[n]}</svg>;

// Temps qu'un commercial passerait sur chaque action faite par l'équipe (estimation affichée comme telle)
const MINUTES = { recherche: 20, enquete: 8, enquete_plus: 12, redaction: 10, envoi: 1, reponse: 5, radar: 5, radar_scan: 20, veille: 30, espion: 15, analyse: 30, linkedin: 6, rdv: 20, brief: 15, devis: 15, script: 10, intelligence: 20 };
const KIND = { recrutement: "Recrute", croissance: "Se développe", appel_offres: "Appel d'offres", besoin: "Cherche une solution", renouvellement: "Contrat à renouveler", dirigeant: "Nouveau dirigeant", demenagement: "Déménage", creation: "Création ou ouverture", site: "Site modifié", levee: "Levée de fonds", permis: "Permis de construire", aide: "Aide publique", budget: "Projet voté", salon: "Salon", difficulte: "Difficultés" };
const ago = (d) => { const h = Math.round((Date.now() - new Date(d).getTime()) / 36e5); return h < 1 ? "à l'instant" : h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`; };
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };



function Sparks({ className }) {
  return <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke="#E0531F" strokeWidth="4.5" strokeLinecap="round"><path d="M10 6l3 9M24 4l-4 10M30 18l-9 3" /></svg>;
}



const Logo = ({ name, url }) => <CompanyLogo name={name} url={url} className="w-10 h-10 text-lg" />;

function Detected({ rows, onPrepared }) {
  const { ws } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  // État réel du premier message de chaque entreprise déjà ajoutée : « Message prêt » seulement s'il y a un brouillon
  const [msgs, setMsgs] = useState({});
  const pids = rows.map((o) => o.prospect_id).filter(Boolean);
  const key = pids.join(",");
  useEffect(() => {
    if (!pids.length) return setMsgs({});
    supabase.from("messages").select("id, prospect_id, status, created_at").in("prospect_id", pids).eq("step", 0).order("created_at", { ascending: false })
      .then(({ data }) => { const m = {}; for (const x of data ?? []) m[x.prospect_id] ??= x; setMsgs(m); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const prepare = async (o) => {
    setBusy(o.id);
    try {
      const r = await fn("m/prepare", { workspace_id: ws.id, id: o.id });
      toast(r.message ? `${o.company} : contact trouvé et e-mail prêt à valider` : r.reason === "no_email" ? `${o.company} ajouté aux prospects (e-mail introuvable pour l'instant)` : `${o.company} ajouté aux prospects`, "good");
      onPrepared();
      window.dispatchEvent(new Event("kairo:refresh"));
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(null); }
  };
  return (
    <section className="min-w-0 bg-white rounded-2xl border border-line p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2.5 font-bold text-[16px] uppercase tracking-wide"><Ico n="target" className="w-6 h-6 text-accent" />Tes 3 entreprises à contacter aujourd'hui</h2>
        <Link to="/radar" className="text-[13px] text-ink-soft hover:text-ink inline-flex items-center gap-1">Voir toutes les opportunités<Ico n="arrow" className="w-3.5 h-3.5" /></Link>
      </div>
      {!rows.length ? <div className="py-6 text-center"><p className="text-sm text-ink-soft">Rien de nouveau pour l'instant : Max cherche de nouvelles opportunités chaque matin de semaine.</p><Link to="/radar" className="mt-3 inline-block text-sm font-semibold text-accent-dark hover:underline">Voir les opportunités →</Link></div> : (
        <ul className="space-y-2">
          {rows.map((o) => (
            <li key={o.id} className="rounded-xl border border-line px-3 sm:px-4 py-3 flex items-center gap-3 hover:border-ink/20 transition">
              <span className="hidden sm:inline-block w-[112px] shrink-0"><span className="inline-block text-[11px] font-bold uppercase tracking-wide rounded-full bg-accent-soft text-accent-dark px-2.5 py-1">{KIND[o.kind] ?? o.kind}</span></span>
              <Logo name={o.company} url={o.url} />
              <Link to="/radar" className="min-w-0 flex-1">
                <p className="font-semibold truncate">{o.company}</p>
                <p className="text-[13px] text-ink-soft line-clamp-2 leading-snug">{o.summary}</p>
                <p className="text-[11.5px] text-ink-faint mt-0.5"><span className="sm:hidden font-semibold text-accent-dark">{KIND[o.kind] ?? o.kind} · </span>{[o.city, ago(o.created_at)].filter(Boolean).join(" · ")}</p>
              </Link>
              {o.prospect_id && msgs[o.prospect_id]?.status === "brouillon" ? (
                <Link to={`/valider?voir=${msgs[o.prospect_id].id}`} className="shrink-0 rounded-full bg-good-soft text-good px-3 py-1.5 text-[12.5px] font-semibold hover:brightness-95">Message prêt</Link>
              ) : o.prospect_id && msgs[o.prospect_id]?.status === "envoye" ? (
                <span className="shrink-0 rounded-full bg-paper text-ink-soft px-3 py-1.5 text-[12.5px] font-semibold">Envoyé</span>
              ) : o.prospect_id ? (
                <Link to="/radar" className="shrink-0 rounded-full bg-accent-soft text-accent-dark px-3 py-1.5 text-[12.5px] font-semibold hover:bg-accent hover:text-white transition">À contacter</Link>
              ) : o.kind !== "appel_offres" && o.kind !== "besoin" && (
                <button onClick={() => prepare(o)} disabled={!!busy} title="Sam trouve le contact, Hugo écrit l'e-mail (rien n'est envoyé)"
                  className="shrink-0 rounded-full bg-accent-soft text-accent-dark px-3 py-1.5 text-[12.5px] font-semibold hover:bg-accent hover:text-white transition disabled:opacity-50">
                  {busy === o.id ? "Préparation…" : "Préparer"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


/** Rendez-vous du jour, relances dues et devis sans réponse : ce qui ne doit pas attendre. */
function Urgent({ u }) {
  if (!u || (!u.meet.length && !u.due.length && !u.quotes.length)) return null;
  const late = (d) => Math.round((Date.now() - new Date(d).getTime()) / 864e5);
  return (
    <section className="mb-6 rounded-2xl bg-ink text-white p-4 sm:p-5">
      <p className="font-bold flex items-center gap-2"><Ico n="bolt" className="w-5 h-5 text-accent" fill />À ne pas laisser filer aujourd'hui</p>
      <ul className="mt-2 divide-y divide-white/10 text-[14px]">
        {u.meet.map((m) => <li key={m.id} className="py-2 flex gap-3"><span className="flex-1"><b>RDV à {new Date(m.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</b> · {m.company}{m.brief ? ", Paul a préparé la fiche" : ""}</span><Link to="/agenda" className="text-accent font-semibold">Préparer</Link></li>)}
        {u.quotes.map((q) => <li key={q.id} className="py-2 flex gap-3"><span className="flex-1"><b>{q.prospects?.name}</b> · devis {q.number} {q.status === "vu" ? "ouvert" : "envoyé"} il y a {late(q.sent_at)} jours, sans signature</span><Link to="/devis" className="text-accent font-semibold">Relancer</Link></li>)}
        {u.due.map((p) => <li key={p.id} className="py-2 flex gap-3"><span className="flex-1"><b>{p.name}</b> · {p.next_action || "À suivre"}{late(p.next_action_at) > 0 ? <span className="text-white/60"> · en retard de {late(p.next_action_at)} j</span> : ""}</span>{p.phone ? <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="text-accent font-semibold">Appeler</a> : <Link to="/prospects" className="text-accent font-semibold">Ouvrir</Link>}</li>)}
      </ul>
    </section>
  );
}


/** Tes contacts : décideurs trouvés, e-mails, téléphones, réponses et rendez-vous (chiffres réels, jamais d'exemple). */
// Adresses génériques (contact@, info@, sales@…) : utiles, mais ce ne sont pas des décideurs
function Contacts({ s }) {
  const T = [["Décideurs trouvés", s.dec, "/prospects"], ["E-mails directs", s.mailDirect ?? s.mail, "/prospects", s.mail > (s.mailDirect ?? s.mail) ? `+ ${s.mail - s.mailDirect} adresse${s.mail - s.mailDirect > 1 ? "s" : ""} générique${s.mail - s.mailDirect > 1 ? "s" : ""}` : ""], ["Téléphones", s.tel, "/prospects"], ["Ont répondu", s.replied, "/reponses"], ["Rendez-vous obtenus", s.rdv, "/agenda"]];
  return (
    <section aria-label="Tes contacts" className="mb-6 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
      {T.map(([l, v, to, sub], i) => (
        <Link key={l} to={to} className={cx("rounded-2xl border p-4 transition hover:border-ink-faint", i === 4 ? "bg-accent-soft/60 border-accent/20" : "bg-white border-line", i === 4 && "col-span-2 sm:col-span-1")}>
          <p className="text-[13px] text-ink-soft">{l}</p>
          <p className={cx("font-black text-[30px] leading-tight tnum", i === 4 && "text-accent-dark")} style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{(v ?? 0).toLocaleString("fr-FR")}</p>
          {sub && <p className="text-[11.5px] text-ink-faint mt-0.5">{sub}</p>}
        </Link>
      ))}
    </section>
  );
}

/** Le point d'entrée unique : décrire en une phrase les clients voulus. Bingoo! en fait une mission (cible, zone, moments d'achat). */
const IDEES = ["Les cabinets comptables d'Île-de-France qui recrutent", "Les startups SaaS qui viennent de lever des fonds", "20 rendez-vous avec des agences immobilières à Lyon"];
function Decris() {
  const nav = useNavigate();
  const [t, setT] = useState("");
  const go = (x) => { const v = (x ?? t).trim(); if (v.length >= 8) nav(`/mission?q=${encodeURIComponent(v)}`); };
  return (
    <section aria-label="Trouver de nouveaux clients" className="mb-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
      <form onSubmit={(e) => { e.preventDefault(); go(); }} className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor="decris">Décris les clients que tu veux</label>
        <input id="decris" value={t} onChange={(e) => setT(e.target.value)} placeholder="Décris les clients que tu veux, en une phrase" className="flex-1 min-w-0 rounded-xl border border-line bg-paper px-4 py-3 text-[16px] outline-none focus:border-ink-faint" />
        <Button type="submit" variant="accent" disabled={t.trim().length < 8}>Trouver ces clients</Button>
      </form>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {IDEES.map((x) => <button key={x} type="button" onClick={() => setT(x)} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-soft hover:text-ink hover:border-ink-faint">{x}</button>)}
      </div>
    </section>
  );
}

/** Ton public : Bingoo! teste plusieurs types de clients, garde ceux qui répondent, met en pause les autres et ajoute de nouvelles pistes. */
const ETAT = { marche: ["Ça marche", "bg-good-soft text-good"], en_test: ["En test", "bg-accent-soft text-accent-dark"], a_lancer: ["Bientôt contactée", "bg-paper text-ink-soft"], pause: ["En pause", "bg-[#EFEEEA] text-ink-soft"] };
function Public() {
  const { ws } = useWs();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fn("r/ciblage", { workspace_id: ws.id }).then(setD).catch(() => setD(null)); }, [ws.id]);
  if (!d?.stats?.length) return null;
  const run = async () => {
    setBusy(true);
    try { const r = await fn("r/ciblage", { workspace_id: ws.id, run: true }); setD(r); toast(r.actions?.length ? `${r.actions.length} changement${r.actions.length > 1 ? "s" : ""} dans ton ciblage` : "Rien à changer pour l'instant", "good"); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const order = { marche: 0, en_test: 1, a_lancer: 2, pause: 3 };
  return (
    <section aria-label="Ton public" className="mb-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">Ton public</p>
        <button onClick={run} disabled={busy} className="text-[13px] text-ink-soft underline hover:text-ink disabled:opacity-50">{busy ? "Analyse…" : "Revoir maintenant"}</button>
      </div>
      <p className="text-[13px] text-ink-soft mt-0.5">Bingoo! teste plusieurs types de clients, garde ceux qui répondent et en essaie de nouveaux chaque semaine. Tu n'as rien à faire.</p>
      <ul className="mt-3 divide-y divide-line">
        {[...d.stats].sort((a, b) => order[a.etat] - order[b.etat] || b.taux - a.taux).map((t) => (
          <li key={t.id} className="py-2 flex items-center gap-3 text-[14px]">
            <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold", ETAT[t.etat][1])}>{ETAT[t.etat][0]}</span>
            <span className="flex-1 min-w-0 truncate">{t.label}</span>
            <span className="shrink-0 text-[12.5px] text-ink-soft tnum">{t.etat === "pause" ? t.note : t.contactes ? `${t.positifs} réponse${t.positifs > 1 ? "s" : ""} positive${t.positifs > 1 ? "s" : ""} sur ${t.contactes}` : ""}</span>
          </li>
        ))}
      </ul>
      {d.journal?.length > 0 && <p className="mt-2 text-[12.5px] text-ink-faint">Dernier changement : {d.journal[0].texte}</p>}
    </section>
  );
}

/** Appel de démarrage offert : 30 minutes pour régler la cible, les messages et viser le premier rendez-vous. Proposé le premier mois. */
function Demarrage() {
  const { ws, reload } = useWs();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ dispo: "", tel: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(!!ws.onboarding_call_at);
  const key = `bingoo-demarrage-masque-${ws.id}`;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(key) === "1"; } catch { return false; } });
  const age = ws.created_at ? (Date.now() - new Date(ws.created_at).getTime()) / 864e5 : 0;
  if (hidden || age > 30) return null;
  if (done) return <p className="mb-6 rounded-2xl border border-line bg-white px-4 py-3 text-[14.5px] text-ink-soft">Ton appel de démarrage est demandé. On t'écrit pour fixer le créneau.</p>;
  const send = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await fn("r/onboarding-call", { workspace_id: ws.id, ...f }); setDone(true); reload?.(); toast("Demande envoyée", "good"); }
    catch (x) { toast(x.message, "bad"); } finally { setBusy(false); }
  };
  return (
    <section aria-label="Appel de démarrage" className="mb-6 rounded-2xl border border-accent/25 bg-accent-soft/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[560px]">
          <p className="text-[17px] font-semibold text-ink">30 minutes offertes pour bien démarrer</p>
          <p className="mt-1 text-[14.5px] text-ink-soft">Un appel avec l'équipe Bingoo! : on règle ta cible et tes messages ensemble, pour viser ton premier rendez-vous.</p>
        </div>
        <div className="flex gap-2">
          {!open && <Button onClick={() => setOpen(true)}>Réserver mon appel</Button>}
          <button onClick={() => { try { localStorage.setItem(key, "1"); } catch { /* stockage indisponible */ } setHidden(true); }} className="rounded-lg px-3 py-2 text-[14px] text-ink-soft hover:text-ink">Plus tard</button>
        </div>
      </div>
      {open && (
        <form onSubmit={send} className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_200px_auto]">
          <label className="sr-only" htmlFor="dm-dispo">Tes disponibilités</label>
          <input id="dm-dispo" value={f.dispo} onChange={(e) => setF({ ...f, dispo: e.target.value })} placeholder="Tes disponibilités (ex. mardi ou jeudi matin)" className="rounded-lg border border-line bg-white px-3 py-2.5 text-[15px]" />
          <label className="sr-only" htmlFor="dm-tel">Ton téléphone (facultatif)</label>
          <input id="dm-tel" value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} placeholder="Téléphone (facultatif)" inputMode="tel" className="rounded-lg border border-line bg-white px-3 py-2.5 text-[15px]" />
          <Button type="submit" disabled={busy}>{busy ? "Envoi…" : "Envoyer ma demande"}</Button>
        </form>
      )}
    </section>
  );
}

/** Le matin en 2 minutes : ce qui attend le client, dans l'ordre, et quand tout est fait, on le dit. */
/** Le bandeau du matin : ton terrain, la chose à faire maintenant, tes anneaux et ta ville. */
function Semaine() {
  const { d } = usePilotage();
  return d ? <BandeauMatin d={d} /> : null;
}


/** Aujourd'hui : les trois choses qui comptent, chacune avec son nombre et un seul bouton. */
function AFaire({ s, canSend, adresse }) {
  const prochainRdv = s.urgent.meet[0];
  const C = [
    { n: s.drafts, titre: "Messages à envoyer", vide: "Aucun pour l'instant : Bingoo! en prépare.", aide: "Tu relis, tu envoies.", to: "/valider", cta: "Lire et envoyer", icon: "send", fort: true },
    { n: s.replies, titre: "Réponses qui attendent", vide: "Aucune réponse à traiter.", aide: "Une réponse est déjà proposée.", to: "/reponses", cta: "Répondre", icon: "chat", fort: s.replies > 0 },
    { n: s.appels, titre: "À appeler", vide: "Personne à appeler aujourd'hui.", aide: "Sans réponse par e-mail : un appel, script prêt.", to: "/appels", cta: "Appeler", icon: "phone", fort: s.appels > 0 },
    { n: s.urgent.meet.length, titre: "Rendez-vous aujourd'hui", vide: "Aucun rendez-vous aujourd'hui.", aide: prochainRdv ? [`À ${new Date(prochainRdv.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`, prochainRdv.company].filter(Boolean).join(" · ") : "", to: "/agenda", cta: "Voir", icon: "cal" },
  ];
  return (
    <section aria-label="À faire aujourd'hui" className="mb-6">
      <h2 className="text-[19px] font-semibold mb-3">À faire aujourd'hui</h2>
      {canSend && !adresse && <Link to="/reglages" className="mb-3 flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3 font-semibold"><Ico n="send" className="w-5 h-5 text-accent" />Ajoute l'adresse postale de ton entreprise : sans elle, rien ne part (30 s)</Link>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {C.map((c) => (
          <Link key={c.to} to={c.to} className={cx("group flex items-center gap-4 sm:block rounded-3xl border p-4 sm:p-5 transition hover:border-ink-faint", c.n > 0 && c.fort ? "border-accent/30 bg-[#FFF7F0]" : "border-line bg-white")}>
            <p className={cx("order-2 sm:order-none sm:hidden font-black text-[34px] leading-none tnum", c.n > 0 ? "text-ink" : "text-ink-faint")} style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{c.n}</p>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-ink-soft"><Ico n={c.icon} className={cx("w-5 h-5", c.n > 0 ? "text-accent" : "text-ink-faint")} />{c.titre}</div>
              <p className={cx("hidden sm:block mt-1 font-black text-[40px] leading-none tnum", c.n > 0 ? "text-ink" : "text-ink-faint")} style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{c.n}</p>
              <p className="mt-1 sm:mt-2 text-[13.5px] text-ink-soft sm:min-h-[20px]">{c.n > 0 ? c.aide : c.vide}</p>
              {c.n > 0 && <span className={cx("hidden sm:inline-flex mt-3 rounded-xl px-3.5 py-2 text-[14px] font-bold", c.fort ? "bg-accent text-white" : "bg-ink text-white")}>{c.cta}</span>}
            </div>
            <span className="order-3 sm:hidden text-[22px] text-ink-faint" aria-hidden>›</span>
          </Link>
        ))}
      </div>
      {s.urgent.due.filter((p) => !/appeler/i.test(p.next_action ?? "")).length > 0 && <Link to="/prospects" className="mt-3 flex items-center gap-2 text-[14px] text-ink-soft hover:text-ink"><Ico n="clock" className="w-4 h-4" /><span><b className="text-ink tnum">{s.urgent.due.filter((p) => !/appeler/i.test(p.next_action ?? "")).length}</b> autre{s.urgent.due.filter((p) => !/appeler/i.test(p.next_action ?? "")).length > 1 ? "s" : ""} chose{s.urgent.due.filter((p) => !/appeler/i.test(p.next_action ?? "")).length > 1 ? "s" : ""} prévue{s.urgent.due.filter((p) => !/appeler/i.test(p.next_action ?? "")).length > 1 ? "s" : ""} aujourd'hui</span><span aria-hidden>›</span></Link>}
    </section>
  );
}

/** Ce qui marche, en un coup d'œil : la semaine comparée à la précédente, puis ce que Bingoo! a appris. */
function CeQuiMarche({ s }) {
  const T = [["Envoyés", s.sent7, s.sentPrev], ["Réponses", s.replied7, s.repPrev], ["Rendez-vous", s.rdv7, s.rdvPrev], ["Clients", s.client, null]];
  return (
    <section aria-label="Ce qui marche" className="mb-6 rounded-3xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[19px] font-semibold">Ce qui marche</h2>
        <Link to="/resultats" className="text-[13px] text-ink-soft underline hover:text-ink">Tous les résultats</Link>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {T.map(([l, v, avant], i) => {
          const d = avant == null ? null : (v ?? 0) - (avant ?? 0);
          return (
            <div key={l} className={cx("rounded-2xl px-4 py-3", i === 2 ? "bg-accent-soft/60" : "bg-paper")}>
              <p className="text-[13px] text-ink-soft">{l}{avant != null ? " · 7 jours" : " · au total"}</p>
              <p className={cx("font-black text-[30px] leading-tight tnum", i === 2 && "text-accent-dark")} style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{(v ?? 0).toLocaleString("fr-FR")}</p>
              {d != null && <p className={cx("text-[12px] tnum", d > 0 ? "text-good" : "text-ink-faint")}>{d > 0 ? `+${d}` : d < 0 ? `${d}` : "="} vs semaine d'avant</p>}
            </div>
          );
        })}
      </div>
      <Appris className="mt-4" />
    </section>
  );
}

/** L'écran principal : la prochaine opportunité (pourquoi maintenant, à qui, le début du message), et un bouton pour les traiter. */
function Prochaine({ n }) {
  const { ws } = useWs();
  const [m, setM] = useState(null);
  useEffect(() => {
    supabase.from("messages").select("id, subject, body, prospects(*)").eq("workspace_id", ws.id).eq("status", "brouillon").eq("step", 0).order("created_at").limit(1)
      .then(({ data }) => setM(data?.[0] ?? null));
  }, [ws.id, n]);
  if (!m?.prospects) return null;
  const debut = String(m.body ?? "").split("\n").filter((l) => l.trim() && !/^bonjour/i.test(l.trim()))[0] ?? "";
  return (
    <section aria-label="Prochaine opportunité" className="mb-6 rounded-3xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-bold text-[#C2410C]">Prochaine opportunité</p>
        <span className="text-[13px] text-ink-soft tnum">{n} prête{n > 1 ? "s" : ""}</span>
      </div>
      <h2 className="mt-1 text-[24px] font-black leading-tight" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>{m.prospects.name}</h2>
      <div className="mt-3"><Opportunite p={m.prospects} /></div>
      {debut && <p className="mt-3 text-[14.5px] text-ink-soft line-clamp-2"><span className="font-semibold text-ink">Le message : </span>{debut}</p>}
      <Link to={`/valider?voir=${m.id}`} className="mt-4 flex items-center justify-center rounded-2xl bg-accent px-5 py-3 text-[16px] font-bold text-white hover:brightness-105">Lire et envoyer</Link>
    </section>
  );
}

/** Bien démarrer : les 4 gestes, dans l'ordre, avec UN bouton pour le prochain. Disparaît quand tout est fait. */
function Demarrer({ s }) {
  const { ws } = useWs();
  const nav = useNavigate();
  const boite = ws.domain_status === "verified" || !!ws.integrations?.mailbox?.ok;
  const E = [
    { ok: (ws.targets ?? []).some((t) => t.actif !== false), titre: "Dis à Bingoo! quels clients tu veux", pourquoi: "C'est fait à l'inscription. Tu peux en ajouter en une phrase plus bas.", to: "/mission", bouton: "Décrire mes clients" },
    { ok: boite, titre: "Connecte ta boîte mail", pourquoi: "Les messages partent de ton adresse, et les réponses reviennent chez toi. 2 minutes.", to: "/connexions", bouton: "Connecter ma boîte mail" },
    { ok: !!ws.postal_address, titre: "Ajoute l'adresse de ton entreprise", pourquoi: "Obligatoire en bas de chaque e-mail de prospection (la loi).", to: "/reglages", bouton: "Ajouter l'adresse" },
    { ok: (s.sent ?? 0) > 0, titre: "Valide tes premiers messages", pourquoi: "Bingoo! les a écrits. Tu lis, tu cliques « Envoyer ». Rien ne part sans toi.", to: "/valider", bouton: "Voir mes messages" },
  ];
  const faits = E.filter((e) => e.ok).length;
  if (faits === E.length) return null;
  const next = E.find((e) => !e.ok);
  return (
    <section aria-label="Bien démarrer" className="mb-6 rounded-3xl border-2 border-accent/40 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[19px] font-semibold">Pour avoir tes premiers rendez-vous</p>
        <p className="text-[13px] text-ink-soft tnum">{faits} sur {E.length} fait{faits > 1 ? "s" : ""}</p>
      </div>
      <ol className="mt-3 space-y-2">
        {E.map((e, i) => (
          <li key={e.titre} className={cx("flex items-start gap-3 rounded-2xl px-3 py-2.5", e === next ? "bg-accent-soft/60" : "")}>
            <span className={cx("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold", e.ok ? "bg-good text-white" : e === next ? "bg-accent text-white" : "bg-paper text-ink-soft")}>{e.ok ? "✓" : i + 1}</span>
            <span className="flex-1 min-w-0">
              <span className={cx("block text-[15px]", e.ok ? "text-ink-soft line-through" : "font-semibold")}>{e.titre}</span>
              {e === next && <span className="block text-[13.5px] text-ink-soft mt-0.5">{e.pourquoi}</span>}
            </span>
            {e === next && <Button variant="accent" size="sm" onClick={() => nav(e.to)}>{e.bouton}</Button>}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] text-ink-soft">Ensuite, tu n'as plus qu'à passer ici chaque matin : Bingoo! cherche, écrit et relance, tu valides et tu prends les rendez-vous.</p>
    </section>
  );
}

/** La preuve que Bingoo! travaille : ce qu'il a fait ces 7 derniers jours, en chiffres réels, et quand il a cherché pour la dernière fois. */
const FAIT = { recherche: "search", enquete: "user", enquete_plus: "user", credit_email: "user", redaction: "send", envoi: "send", radar: "search", radar_scan: "search", fit: "check", ciblage: "check" };
function Travail({ s }) {
  const { ws } = useWs();
  const rows = s.rows ?? [];
  const nb = (kinds, re) => rows.filter((r) => kinds.includes(r.kind) && (!re || re.test(r.summary ?? ""))).length;
  const trouves = rows.filter((r) => r.kind === "recherche").reduce((n, r) => n + (Number(String(r.summary ?? "").match(/(\d+)\s+nouve/)?.[1]) || 0), 0) || s.found7;
  const lignes = [
    [trouves, "entreprise trouvée dans ta cible", "entreprises trouvées dans ta cible"],
    [nb(["enquete", "enquete_plus", "credit_email"]), "recherche de contact", "recherches de contact"],
    [nb(["credit_email"]) + nb(["enquete"], /e-mail trouvé/i), "e-mail trouvé", "e-mails trouvés"],
    [nb(["redaction"]), "message écrit pour toi", "messages écrits pour toi"],
    [s.oppsWeek, "entreprise à contacter au bon moment", "entreprises à contacter au bon moment"],
  ].filter(([n]) => n > 0);
  const last = rows.find((r) => FAIT[r.kind]);
  const ago = last ? (() => { const m = Math.round((Date.now() - new Date(last.created_at).getTime()) / 6e4); return m < 60 ? `il y a ${Math.max(1, m)} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; })() : "";
  return (
    <section aria-label="Ce que Bingoo! a fait" className="mb-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">Ce que Bingoo! a fait pour toi cette semaine</p>
        <Link to="/resultats" className="text-[13px] text-ink-soft underline hover:text-ink">Voir le détail</Link>
      </div>
      {lignes.length ? (
        <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[14.5px]">
          {lignes.map(([n, a, b]) => <li key={a} className="flex gap-2"><span className="text-good">✓</span><span><b className="tnum">{n.toLocaleString("fr-FR")}</b> {n > 1 ? b : a}</span></li>)}
        </ul>
      ) : <p className="mt-1 text-[14px] text-ink-soft">Bingoo! démarre : les premières recherches arrivent cette nuit.</p>}
      {last && <p className="mt-2 text-[12.5px] text-ink-faint">Dernière action : {last.summary} · {ago}</p>}
    </section>
  );
}

/** Une phrase qui dit où on en est, sans jargon. */
function resume(s) {
  const n = [s.replies, s.drafts, s.li, s.opps, s.urgent?.due?.length, s.urgent?.meet?.length].filter((x) => x > 0).length;
  if (n) return `${n} chose${n > 1 ? "s" : ""} t'attend${n > 1 ? "ent" : ""} ci-dessous. Bingoo! s'occupe du reste.`;
  return "Rien à faire pour l'instant : Bingoo! cherche, écrit et relance pour toi.";
}

export default function Today() {
  useMesureVue("liste");
  const { ws } = useWs();
  const nav = useNavigate();
  const toast = useToast();
  const { job, run } = useJob(toast);
  const [s, setS] = useState(null);

  const load = useCallback(async () => {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const w1 = new Date(Date.now() - 7 * 864e5).toISOString();
    const today = new Date().toISOString().slice(0, 10), old = new Date(Date.now() - 4 * 864e5).toISOString();
    // Les compteurs en une seule requête ; les listes à afficher à part
    const [{ data: k }, act, detected, due, quotes, meet, appels] = await Promise.all([
      supabase.rpc("compteurs", { p_ws: ws.id }),
      supabase.from("activity").select("kind, summary, created_at").eq("workspace_id", ws.id).gte("created_at", w1).order("created_at", { ascending: false }).limit(2000),
      supabase.from("radar_opps").select("id, kind, company, summary, city, url, created_at, score, prospect_id, raw, status").eq("workspace_id", ws.id).in("status", ["nouveau", "ajoute"]).neq("kind", "difficulte").order("score", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(12),
      supabase.from("prospects").select("id, name, next_action, next_action_at, phone").eq("workspace_id", ws.id).lte("next_action_at", today).not("status", "in", "(ignore,refus)").order("next_action_at").limit(5),
      supabase.from("quotes").select("id, number, sent_at, status, prospects(name)").eq("workspace_id", ws.id).in("status", ["envoye", "vu"]).lt("sent_at", old).limit(3),
      supabase.from("meetings").select("id, company, starts_at, brief").eq("workspace_id", ws.id).eq("status", "confirme").gte("starts_at", t0.toISOString()).lt("starts_at", new Date(t0.getTime() + 864e5).toISOString()).order("starts_at"),
      // Appels prévus : sans réponse après les relances, ou rappels notés après un appel
      supabase.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).lte("next_action_at", today).ilike("next_action", "%appeler%").not("status", "in", "(ignore,refus,client,rdv)"),
    ]);
    const K = k ?? {};
    const { found = 0, toContact = 0, found7 = 0, sent7 = 0, rdv7 = 0, opps = 0, todo = 0, ready = 0, hard = 0, dec = 0, tels: tel = 0, mails: mail = 0, mailDirect = 0, sentPrev = 0, repPrev = 0, rdvPrev = 0 } = K;
    const sent = K.sentProspects ?? 0, replied = K.replied ?? 0, rdv = K.rdvProspects ?? 0, client = K.clients ?? 0, replied7 = K.rep7 ?? 0;
    const oppsWeek = K.opps7 ?? 0, oppsPrev = K.oppsPrev ?? 0, replies = K.rep ?? 0, drafts = K.drafts ?? 0, li = K.liTodo ?? 0;
    const rows = act.data ?? [];
    const minutes = rows.reduce((m, r) => m + (MINUTES[r.kind] ?? 0), 0);
    setS({ dec, mail, tel, mailDirect, found, toContact, sent, replied, rdv, client, found7, sent7, replied7, rdv7, opps, oppsWeek, oppsPrev, replies, drafts, li, todo, ready, hard, sentPrev, repPrev, rdvPrev,
      appels: appels.count ?? 0, rows, minutes, actions: rows.filter((r) => MINUTES[r.kind]).length, detected: (() => { const d = detected.data ?? [], t = new Date().toISOString().slice(0, 10); const top = d.filter((o) => o.raw?.top_day === t); return [...top, ...d.filter((o) => o.raw?.top_day !== t && o.status !== "ajoute" && !o.prospect_id)].slice(0, 3); })(), urgent: { due: due.data ?? [], quotes: quotes.data ?? [], meet: meet.data ?? [] } });
  }, [ws.id]);

  useEffect(() => {
    fn("followups", { workspace_id: ws.id }).catch(() => {}).finally(load);
    const t = setInterval(load, 30000);
    window.addEventListener("kairo:refresh", load);
    return () => { clearInterval(t); window.removeEventListener("kairo:refresh", load); };
  }, [ws.id, load]);

  // Première arrivée : la visite (vidéos de l'équipe, de la carte et du Radar, l'extension…), une seule fois par personne
  const [visite, setVisite] = useState(false);
  useEffect(() => {
    let vu = false;
    try { vu = localStorage.getItem("bingoo-visite") === "1"; } catch { /* rien */ }
    if (vu) return;
    supabase.auth.getUser().then(({ data }) => { if (!data?.user?.user_metadata?.visite_vue) setVisite(true); }).catch(() => {});
  }, []);
  const finVisite = () => {
    setVisite(false);
    try { localStorage.setItem("bingoo-visite", "1"); } catch { /* rien */ }
    supabase.auth.updateUser({ data: { visite_vue: new Date().toISOString() } }).catch(() => {});
  };

  const hour = new Date().getHours();
  const hello = hour < 18 ? "Bonjour" : "Bonsoir";
  const first = (ws.sender_name || "").split(" ")[0];
  const trend = s && s.oppsPrev > 0 ? Math.round(((s.oppsWeek - s.oppsPrev) / s.oppsPrev) * 100) : null;

  return (
    <div className="max-w-4xl">
      {visite && <Visite onFin={finVisite} />}
      <header className="mb-6 relative">
        <h1 className="font-black text-[40px] sm:text-[52px] leading-none tracking-tight flex items-start gap-1" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>
          {hello}{first ? ` ${first}` : ""} !<Sparks className="w-9 h-9 sm:w-11 sm:h-11 -mt-2" />
        </h1>
        <p className="text-ink-soft text-[17px] mt-3">{s ? resume(s) : "Ce qui t'attend aujourd'hui."}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-paper border border-line px-3 py-1 text-[13px] font-semibold text-ink-soft"><Ico n="clock" className="w-4 h-4" />Ton plan du jour : environ 15 minutes. Bingoo! s'occupe du reste.</p>
      </header>

      {/* Un seul écran : 1. ce qu'il y a à faire aujourd'hui, 2. ce qui marche. Tout le reste est dans « Plus ». */}
      {s && <Demarrer s={s} />}
      {s && <AFaire s={s} adresse={!!ws.postal_address} canSend={ws.domain_status === "verified" || !!ws.integrations?.mailbox?.ok} />}
      {s && s.drafts > 0 && <Prochaine n={s.drafts} />}
      {s && <CeQuiMarche s={s} />}
      <PushTel compact />

      <details className="group mt-2 mb-6 rounded-2xl border border-line bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3">
          <span className="font-semibold">Plus</span>
          <span className="text-sm text-ink-soft"><span className="hidden sm:inline group-open:hidden">Ce que Bingoo! a fait, trouver d'autres clients, le détail</span><span className="hidden group-open:inline">Masquer</span></span>
        </summary>
        <div className="px-4 pb-5 pt-1">
          {s && <Travail s={s} />}
          <h3 className="text-[17px] font-semibold mb-2 mt-2">Trouver d'autres clients</h3>
          <Decris /><Public /><Demarrage />
          {s && s.sent >= 20 && <div className="hidden sm:block"><Semaine /></div>}
          <TodayFeed />
          {s && s.detected.length > 0 && (
            <section className="mb-8">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h3 className="text-[17px] font-semibold">Nouvelles opportunités{s.opps > 0 && <span className="ml-2 text-ink-faint font-normal">{s.opps}</span>}</h3>
                <Link to="/radar" className="text-sm text-ink-soft hover:text-ink hover:underline underline-offset-4">Toutes les opportunités</Link>
              </div>
              <Detected rows={s.detected} onPrepared={load} />
            </section>
          )}
          {s && <Urgent u={s.urgent} />}
          {s && <Contacts s={s} />}
          {s && (s.ready > 0 || s.todo > 0 || s.hard > 0) && (
            <div className="mt-4 rounded-2xl border border-dashed border-line p-4">
              <p className="font-semibold">Aller plus vite</p>
              <p className="text-[13px] text-ink-soft mt-0.5">Bingoo! le fait tout seul en semaine ; ces boutons lancent le travail tout de suite. Rien n'est envoyé sans toi.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {s.ready > 0 && <Button quota="redaction" loading={job?.key === "draft"} disabled={!!job} onClick={() => run({ key: "draft", action: "draft", body: { workspace_id: ws.id, count: 5 }, rounds: Math.ceil(Math.min(s.ready, 20) / 5), label: "Rédaction", done: (n) => `${plural(n, "message rédigé", "messages rédigés")}, à valider` })}>{job?.key === "draft" ? job.text : `Rédiger ${fmtN(Math.min(s.ready, 20))} messages`}</Button>}
                {s.todo > 0 && <Button quota="enquete" loading={job?.key === "enrich"} disabled={!!job} onClick={() => run({ key: "enrich", action: "m/enrich", body: { workspace_id: ws.id, count: 4 }, rounds: 3, label: "Enquête", done: (n, f) => `${f} e-mails trouvés sur ${n} prospects` })}>{job?.key === "enrich" ? job.text : `Trouver les contacts (${fmtN(s.todo)})`}</Button>}
                {s.hard > 0 && <Button quota="enquete_plus" loading={job?.key === "deep"} disabled={!!job} onClick={() => run({ key: "deep", action: "enrich-deep", body: { workspace_id: ws.id }, rounds: 5, label: "Enquête approfondie", done: (n, f) => `${f} e-mails trouvés sur ${n} prospects` })}>{job?.key === "deep" ? job.text : `Creuser ${fmtN(Math.min(s.hard, 5))} prospects sans e-mail`}</Button>}
                <Button quota="recherche" loading={job?.key === "search"} disabled={!!job} onClick={() => run({ key: "search", action: "search", body: { workspace_id: ws.id, pages: 2 }, rounds: 1, label: "Recherche", done: (n) => `${plural(n, "nouveau prospect", "nouveaux prospects")}` })}>{job?.key === "search" ? job.text : "Chercher de nouvelles entreprises"}</Button>
              </div>
            </div>
          )}
          <button onClick={() => nav("/village")} className="mt-5 text-[14px] font-semibold text-ink-soft underline hover:text-ink">Voir ma ville (ton équipe au travail)</button>
        </div>
      </details>
    </div>
  );
}
